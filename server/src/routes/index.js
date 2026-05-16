const express = require('express');
const router = express.Router();

// Auth routes
const { register, login, logout, changePassword, getMe } = require('../controllers/authController');
const { protect, adminOnly } = require('../middlewares/auth');
const { authLimiter, purchaseLimiter } = require('../middlewares/rateLimiter');

router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.post('/auth/logout', protect, logout);
router.put('/auth/change-password', protect, changePassword);
router.get('/auth/me', protect, getMe);

// Event routes
const {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  forceUpdateStatus,
  getEventDashboard,
  getAdminDashboard,
} = require('../controllers/eventController');

router.get('/events', protect, getAllEvents);
router.get('/events/admin/all', protect, adminOnly, getAdminDashboard);
router.get('/events/:id', protect, getEvent);
router.post('/events', protect, adminOnly, createEvent);
router.put('/events/:id', protect, adminOnly, updateEvent);
router.patch('/events/:id/status', protect, adminOnly, forceUpdateStatus);
router.get('/events/:id/dashboard', protect, adminOnly, getEventDashboard);

// Purchase routes
const { initiatePurchase, getPurchaseStatus, getMyOrders } = require('../controllers/purchaseController');

router.post('/purchases', protect, purchaseLimiter, initiatePurchase);
router.get('/purchases/status/:jobId', protect, getPurchaseStatus);
router.get('/purchases/my-orders', protect, getMyOrders);

// User management routes
const { getAllUsers, toggleUserStatus, updateProfile } = require('../controllers/userController');

router.get('/users', protect, adminOnly, getAllUsers);
router.patch('/users/:id/toggle-status', protect, adminOnly, toggleUserStatus);
router.put('/users/profile', protect, updateProfile);

module.exports = router;