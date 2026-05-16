require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Event = require('./models/Event');
const Item = require('./models/Item');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB...');

  // Clear existing data
  await User.deleteMany({});
  await Event.deleteMany({});
  await Item.deleteMany({});
  console.log('Cleared existing data.');

  // Create Admin user
  const admin = await User.create({
    name: 'SwiftDrop Admin',
    email: 'admin@swiftdrop.com',
    password: 'Admin@1234',
    role: 'Admin',
    status: 'active',
  });
  console.log(`✅ Admin created: admin@swiftdrop.com / Admin@1234`);

  // Create sample customers
  await User.create([
    { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123', role: 'Customer' },
    { name: 'Bob Smith', email: 'bob@example.com', password: 'password123', role: 'Customer' },
  ]);
  console.log('✅ Sample customers created.');

  // ── Event 1: Upcoming (Locked) ──────────────────────────────────────────────
  const goLiveTimeFuture = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
  const event1 = await Event.create({
    name: 'Tech Blitz – Premium Electronics Drop',
    goLiveTime: goLiveTimeFuture,
    status: 'Locked',
    createdBy: admin._id,
    items: [],
  });

  const items1 = await Item.insertMany([
    { name: 'Sony WH-1000XM5 Headphones', price: 149.99, initialStock: 200, currentStock: 200, eventId: event1._id },
    { name: 'Apple AirPods Pro (2nd Gen)', price: 99.99, initialStock: 150, currentStock: 150, eventId: event1._id },
    { name: 'Samsung Galaxy Watch 6', price: 129.99, initialStock: 100, currentStock: 100, eventId: event1._id },
  ]);

  event1.items = items1.map((i) => i._id);
  await event1.save();
  console.log('✅ Event 1 (Locked) created with 3 items.');

  // ── Event 2: Currently Live ──────────────────────────────────────────────────
  const goLiveTimePast = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  const event2 = await Event.create({
    name: 'Home & Living Flash Drop',
    goLiveTime: goLiveTimePast,
    status: 'Live',
    createdBy: admin._id,
    items: [],
  });

  const items2 = await Item.insertMany([
    { name: 'Dyson V11 Cordless Vacuum', price: 199.99, initialStock: 100, currentStock: 87, eventId: event2._id },
    { name: 'Philips Air Fryer XL', price: 69.99, initialStock: 200, currentStock: 143, eventId: event2._id },
  ]);

  event2.items = items2.map((i) => i._id);
  await event2.save();
  console.log('✅ Event 2 (Live) created with 2 items.');

  // ── Event 3: Closed / Sold Out ───────────────────────────────────────────────
  const goLiveTimeClosed = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
  const event3 = await Event.create({
    name: 'Fashion Frenzy – Accessories Drop',
    goLiveTime: goLiveTimeClosed,
    status: 'Closed',
    createdBy: admin._id,
    items: [],
  });

  const items3 = await Item.insertMany([
    { name: 'Ray-Ban Aviator Sunglasses', price: 49.99, initialStock: 100, currentStock: 0, eventId: event3._id },
    { name: 'Fossil Gen 6 Smartwatch', price: 89.99, initialStock: 150, currentStock: 0, eventId: event3._id },
  ]);

  event3.items = items3.map((i) => i._id);
  await event3.save();
  console.log('✅ Event 3 (Closed/Sold Out) created.');

  console.log('\n🎉 Seed complete!\n');
  console.log('Admin credentials:');
  console.log('  Email: admin@swiftdrop.com');
  console.log('  Password: Admin@1234');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});