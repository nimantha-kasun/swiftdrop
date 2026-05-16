const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      maxlength: [120, 'Event name cannot exceed 120 characters'],
    },
    coverPhoto: {
      type: String,
      default: null,
    },
    goLiveTime: {
      type: Date,
      required: [true, 'Go-live time is required'],
    },
    status: {
      type: String,
      enum: ['Locked', 'Live', 'Closed'],
      default: 'Locked',
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: totalRevenue (populated items needed)
eventSchema.virtual('totalRevenue').get(function () {
  if (!this.populated('items')) return null;
  return this.items.reduce((sum, item) => {
    const sold = (item.initialStock || 0) - (item.currentStock || 0);
    return sum + sold * (item.price || 0);
  }, 0);
});

// Virtual: totalUnitsSold (populated items needed)
eventSchema.virtual('totalUnitsSold').get(function () {
  if (!this.populated('items')) return null;
  return this.items.reduce((sum, item) => {
    return sum + ((item.initialStock || 0) - (item.currentStock || 0));
  }, 0);
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);