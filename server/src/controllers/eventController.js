const Event = require('../models/Event');
const Item = require('../models/Item');
const Order = require('../models/Order');
const { emitEventStatusChange, emitStockUpdate } = require('../config/socket');

// GET /api/events — All events (Customer & Admin)
const getAllEvents = async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate('items')
      .sort({ goLiveTime: -1 });

    // Auto-transition Locked → Live if goLiveTime has passed
    const now = new Date();
    const updates = events.map(async (event) => {
      if (event.status === 'Locked' && event.goLiveTime <= now) {
        event.status = 'Live';
        await event.save();
        emitEventStatusChange(event._id.toString(), 'Live');
      }
    });
    await Promise.all(updates);

    res.json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id — Single event
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('items');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Auto-transition on fetch
    if (event.status === 'Locked' && event.goLiveTime <= new Date()) {
      event.status = 'Live';
      await event.save();
      emitEventStatusChange(event._id.toString(), 'Live');
    }

    res.json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

// POST /api/events — Create event (Admin)
const createEvent = async (req, res, next) => {
  try {
    const { name, goLiveTime, items } = req.body;

    if (!name || !goLiveTime || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Event name, go-live time, and at least one item are required.',
      });
    }

    if (new Date(goLiveTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Go-live time must be in the future.',
      });
    }

    // Validate stock quantities
    for (const item of items) {
      if (!item.name || !item.price || !item.stock) {
        return res.status(400).json({ success: false, message: 'Each item must have a name, price, and stock.' });
      }
      if (item.stock < 100 || item.stock > 500) {
        return res.status(400).json({
          success: false,
          message: `Item "${item.name}" stock must be between 100 and 500 units.`,
        });
      }
    }

    // Create event first (need _id for items)
    const event = await Event.create({
      name,
      goLiveTime: new Date(goLiveTime),
      coverPhoto: req.body.coverPhoto || null,
      status: 'Locked',
      createdBy: req.user._id,
      items: [],
    });

    // Create items linked to event
    const createdItems = await Item.insertMany(
      items.map((item) => ({
        name: item.name,
        price: item.price,
        initialStock: item.stock,
        currentStock: item.stock,
        eventId: event._id,
        coverPhoto: item.coverPhoto || null,
      }))
    );

    event.items = createdItems.map((i) => i._id);
    await event.save();

    const populated = await Event.findById(event._id).populate('items');
    res.status(201).json({ success: true, message: 'Event created successfully.', event: populated });
  } catch (error) {
    next(error);
  }
};

// PUT /api/events/:id — Edit event (Admin, Locked only)
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (event.status !== 'Locked') {
      return res.status(400).json({
        success: false,
        message: 'Only Locked events can be edited.',
      });
    }

    const { name, goLiveTime, coverPhoto } = req.body;
    if (name) event.name = name;
    if (goLiveTime) event.goLiveTime = new Date(goLiveTime);
    if (coverPhoto !== undefined) event.coverPhoto = coverPhoto;

    await event.save();
    const populated = await Event.findById(event._id).populate('items');
    res.json({ success: true, message: 'Event updated.', event: populated });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/:id/status — Force open/close (Admin)
const forceUpdateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Live', 'Closed', 'Locked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    event.status = status;
    await event.save();

    emitEventStatusChange(event._id.toString(), status);
    res.json({ success: true, message: `Event status updated to ${status}.`, event });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id/dashboard — Admin event stats
const getEventDashboard = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('items');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const itemStats = event.items.map((item) => {
      const sold = item.initialStock - item.currentStock;
      return {
        itemId: item._id,
        name: item.name,
        price: item.price,
        initialStock: item.initialStock,
        currentStock: item.currentStock,
        unitsSold: sold,
        revenue: sold * item.price,
        isSoldOut: item.currentStock === 0,
      };
    });

    const totalRevenue = itemStats.reduce((s, i) => s + i.revenue, 0);
    const totalUnitsSold = itemStats.reduce((s, i) => s + i.unitsSold, 0);

    res.json({
      success: true,
      dashboard: {
        event: {
          id: event._id,
          name: event.name,
          status: event.status,
          goLiveTime: event.goLiveTime,
        },
        itemStats,
        totalRevenue,
        totalUnitsSold,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/admin/all — All events with stats (Admin dashboard overview)
const getAdminDashboard = async (req, res, next) => {
  try {
    const events = await Event.find().populate('items').sort({ createdAt: -1 });

    const data = events.map((event) => {
      const itemStats = event.items.map((item) => {
        const sold = item.initialStock - item.currentStock;
        return {
          itemId: item._id,
          name: item.name,
          price: item.price,
          unitsSold: sold,
          revenue: sold * item.price,
          currentStock: item.currentStock,
        };
      });
      return {
        id: event._id,
        name: event.name,
        status: event.status,
        goLiveTime: event.goLiveTime,
        coverPhoto: event.coverPhoto,
        totalRevenue: itemStats.reduce((s, i) => s + i.revenue, 0),
        totalUnitsSold: itemStats.reduce((s, i) => s + i.unitsSold, 0),
        itemStats,
      };
    });

    res.json({ success: true, events: data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  forceUpdateStatus,
  getEventDashboard,
  getAdminDashboard,
};