const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
            maxlength: [100, 'Item name cannot exceed 100 characters'],
        },
        price: {
            type: Number,
            required: [true, 'Item price is required'],
            min: [0.01, 'Price must be greater than 0'],
        },
        initialStock: {
            type: Number,
            required: [true, 'Initial stock is required'],
            min: [100, 'Stock must be at least 100 units'],
            max: [500, 'Stock cannot exceed 500 units'],
        },
        currentStock: {
            type: Number,
            min: [0, 'Stock cannot go below 0'],
        },
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        coverPhoto: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Set currentStock = initialStock on creation
itemSchema.pre('save', function (next) {
    if (this.isNew) {
        this.currentStock = this.initialStock;
    }
    next();
});

// Virtual: isSoldOut
itemSchema.virtual('isSoldOut').get(function () {
    return this.currentStock === 0;
});

// Virtual: unitsSold
itemSchema.virtual('unitsSold').get(function () {
    return this.initialStock - this.currentStock;
});

itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Item', itemSchema);