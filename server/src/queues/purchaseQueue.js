/**
 * PURCHASE QUEUE — Core Concurrency Engine
 *
 * Architecture:
 *  1. Express route enqueues a job (non-blocking, ~1ms).
 *  2. BullMQ Worker processes jobs with concurrency: 1 (serial per item group)
 *     — this is intentional. We use MongoDB atomic ops for safety, but serial
 *     processing within the queue prevents thundering herd DB hammering.
 *  3. Atomic MongoDB $inc ensures zero oversell even under race conditions.
 *  4. Socket.io emits real-time stock updates to all connected clients.
 */


const { Queue, Worker, QueueEvents } = require('bullmq');
const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const { emitStockUpdate, emitEventStatusChange } = require('../config/socket');
const Item = require('../models/Item');
const Event = require('../models/Event');
const Order = require('../models/Order');

const QUEUE_NAME = 'purchase-queue';

// ─── PRODUCER ─────────────────────────────────────────────────────────────────

let purchaseQueue;

const getPurchaseQueue = () => {
  if (!purchaseQueue) {
    const connection = getRedisClient();
    purchaseQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 1,         // No retries — a failed purchase should not retry
        removeOnComplete: 100, // Keep last 100 completed jobs for debugging
        removeOnFail: 200,
      },
    });
  }
  return purchaseQueue;
};

/**
 * Enqueue a purchase request.
 * Returns a jobId that the client can poll to get the result.
 */
const enqueuePurchase = async ({ userId, eventId, itemId, jobId }) => {
  const queue = getPurchaseQueue();
  const job = await queue.add(
    'process-purchase',
    { userId, eventId, itemId },
    {
      jobId, // Use provided jobId for deduplication and polling
      // Short TTL — flash sale items sell out in seconds
      delay: 0,
    }
  );
  return job.id;
};

// ─── WORKER ───────────────────────────────────────────────────────────────────

/**
 * The purchase worker processes jobs serially with concurrency: 5.
 * Each job uses MongoDB atomic operations to prevent oversell.
 *
 * Flow per job:
 *  1. Validate event is still Live
 *  2. Check for duplicate purchase (idempotency)
 *  3. Atomic stock decrement ($inc: -1 with stock > 0 guard)
 *  4. Create order record
 *  5. Auto-close event if all items are sold out
 *  6. Emit Socket.io stock update
 */
const startPurchaseWorker = () => {
  const connection = getRedisClient().duplicate(); // Worker needs its own connection

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { userId, eventId, itemId } = job.data;

      // ── Step 1: Validate event is Live ──────────────────────────────────────
      const event = await Event.findById(eventId).lean();
      const itemDoc = await Item.findById(itemId).select('name').lean();
      const itemName = itemDoc ? itemDoc.name : itemId;

      if (!event) {
        return { success: false, reason: 'event_not_found', itemName, message: 'Event not found.' };
      }
      if (event.status !== 'Live') {
        return {
          success: false,
          reason: 'event_not_live',
          itemName,
          message: 'This event is not currently open for purchases.',
        };
      }

      // ── Step 2: Check for duplicate purchase ────────────────────────────────
      const existingOrder = await Order.findOne({
        userId,
        eventId,
        itemId,
        status: { $in: ['Reserved', 'Confirmed'] },
      }).lean();

      if (existingOrder) {
        return {
          success: false,
          reason: 'already_purchased',
          itemName,
          message: 'You have already purchased this item in this event.',
        };
      }

      // ── Step 3: ATOMIC stock decrement ──────────────────────────────────────
      const updatedItem = await Item.findOneAndUpdate(
        { _id: itemId, currentStock: { $gt: 0 } },
        { $inc: { currentStock: -1 } },
        { new: true }
      );

      if (!updatedItem) {
        return {
          success: false,
          reason: 'sold_out',
          itemName,
          message: 'Sorry, this item just sold out. You were so close!',
        };
      }

      // ── Step 4: Create Order record ─────────────────────────────────────────
      let order;
      try {
        order = await Order.create({
          userId,
          eventId,
          itemId,
          quantity: 1,
          priceAtPurchase: updatedItem.price,
          status: 'Confirmed',
        });
      } catch (err) {
        if (err.code === 11000) {
          await Item.findByIdAndUpdate(itemId, { $inc: { currentStock: 1 } });
          return {
            success: false,
            reason: 'already_purchased',
            itemName,
            message: 'You have already purchased this item in this event.',
          };
        }
        await Item.findByIdAndUpdate(itemId, { $inc: { currentStock: 1 } });
        throw err;
      }

      // ── Step 5: Check if ALL items in event are sold out ────────────────────
      const eventItems = await Item.find({ eventId }).lean();
      const allSoldOut = eventItems.every((item) => item.currentStock === 0);

      if (allSoldOut) {
        await Event.findByIdAndUpdate(eventId, { status: 'Closed' });
        emitEventStatusChange(eventId, 'Closed');
      }

      // ── Step 6: Emit real-time stock update via Socket.io ───────────────────
      emitStockUpdate(eventId, itemId, updatedItem.currentStock);

      return {
        success: true,
        reason: 'confirmed',
        itemName,
        message: '🎉 Purchase confirmed! Your item is secured.',
        orderId: order._id,
        currentStock: updatedItem.currentStock,
      };
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job, result) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Job ${job.id} [${result.itemName}] completed:`, result.reason);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  console.log('✅ Purchase worker started');
  return worker;
};

// ─── QUEUE EVENTS (for polling job status) ─────────────────────────────────

let queueEvents;

const getQueueEvents = () => {
  if (!queueEvents) {
    const connection = getRedisClient().duplicate();
    queueEvents = new QueueEvents(QUEUE_NAME, { connection });
  }
  return queueEvents;
};

module.exports = {
  getPurchaseQueue,
  enqueuePurchase,
  startPurchaseWorker,
  getQueueEvents,
};