const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter — applied to all /api routes.
 * Prevents basic abuse and protects server stability.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // Max 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
  skip: (req) => {
    // Skip rate limiting for GET requests to public event listings
    return req.method === 'GET' && req.path.startsWith('/api/events');
  },
});

/**
 * Strict purchase rate limiter — applied only to POST /api/purchases.
 * Each user/IP can attempt only 5 purchases per minute.
 * This prevents a single user from flooding the purchase queue.
 */
const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // Max 5 purchase attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by userId if authenticated, else by IP
    return req.user ? req.user._id.toString() : req.ip;
  },
  message: {
    success: false,
    message: 'Too many purchase attempts. Please wait a moment and try again.',
  },
});

/**
 * Auth rate limiter — applied to login/register routes.
 * Prevents brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

module.exports = { generalLimiter, purchaseLimiter, authLimiter };