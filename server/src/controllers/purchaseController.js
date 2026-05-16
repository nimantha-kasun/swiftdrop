const { v4: uuidv4 } = require('uuid');
const { getPurchaseQueue, enqueuePurchase } = require('../queues/purchaseQueue');
const Event = require('../models/Event');
const Item = require('../models/Item');
const Order = require('../models/Order');

/**
 * POST /api/purchases
 *
 * The express route does NOT process the purchase directly.
 * It validates the request, enqueues the job, and returns a jobId.
 * The client polls GET /api/purchases/status/:jobId for the result.
 *
 * This is the key concurrency pattern:
 *  - Express stays non-blocking (sub-5ms response)
 *  - BullMQ serializes work through the worker
 *  - MongoDB atomic ops prevent oversell
 */
const initiatePurchase = async (req, res, next) => {
  try {
    const { eventId, itemId } = req.body;
    const userId = req.user._id.toString();

    if (!eventId || !itemId) {
      return res.status(400).json({ success: false, message: 'Event ID and Item ID are required.' });
    }

    // Quick pre-flight checks (before queuing — fail fast)
    const [event, item] = await Promise.all([
      Event.findById(eventId).lean(),
      Item.findById(itemId).lean(),
    ]);

    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (event.status !== 'Live') {
      return res.status(400).json({
        success: false,
        reason: 'event_not_live',
        message: 'This event is not currently open for purchases.',
      });
    }
    if (item.currentStock <= 0) {
      return res.status(400).json({
        success: false,
        reason: 'sold_out',
        message: 'This item is sold out.',
      });
    }

    // Check for existing purchase (fast pre-check before queuing)
    const existing = await Order.findOne({
      userId,
      eventId,
      itemId,
      status: { $in: ['Reserved', 'Confirmed'] },
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        reason: 'already_purchased',
        message: 'You have already purchased this item in this event.',
      });
    }

    // Generate unique jobId for this purchase attempt
    const jobId = `purchase:${userId}:${eventId}:${itemId}:${uuidv4()}`;

    await enqueuePurchase({ userId, eventId, itemId, jobId });

    // Return 202 Accepted — client will poll for result
    res.status(202).json({
      success: true,
      message: 'Purchase request received. Processing...',
      jobId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/purchases/status/:jobId
 *
 * Poll for job result. Returns job state and result data.
 * Client polls this endpoint with exponential backoff.
 */
const getPurchaseStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const queue = getPurchaseQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Purchase request not found.' });
    }

    const state = await job.getState();

    if (state === 'completed') {
      const result = job.returnvalue;
      return res.json({
        success: true,
        status: 'completed',
        result,
      });
    }

    if (state === 'failed') {
      return res.json({
        success: true,
        status: 'failed',
        result: {
          success: false,
          message: job.failedReason || 'Purchase failed. Please try again.',
        },
      });
    }

    // Still waiting/processing
    return res.json({
      success: true,
      status: state, // 'waiting', 'active', 'delayed'
      result: null,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/purchases/my-orders — Customer order history
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id, status: { $in: ['Confirmed', 'Cancelled'] } })
      .populate('eventId', 'name goLiveTime')
      .populate('itemId', 'name price')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

module.exports = { initiatePurchase, getPurchaseStatus, getMyOrders };