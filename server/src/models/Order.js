const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    priceAtPurchase: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Reserved', 'Confirmed', 'Cancelled', 'Failed'],
      default: 'Reserved',
    },
    // Unique constraint: one order per user per item per event
    // Enforced at DB level via compound unique index
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one purchase per user per item per event
// Only applies to Confirmed orders (cancelled orders release the slot)
orderSchema.index(
  { userId: 1, eventId: 1, itemId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['Reserved', 'Confirmed'] } },
  }
);

// Index for fast user history lookups
orderSchema.index({ userId: 1, createdAt: -1 });

// Index for fast event order lookups (admin dashboard)
orderSchema.index({ eventId: 1, itemId: 1 });

module.exports = mongoose.model('Order', orderSchema);