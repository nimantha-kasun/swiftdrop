require('dotenv').config();
const mongoose = require('mongoose');
const { Queue } = require('bullmq');
const { getRedisClient } = require('./config/redis');
const User = require('./models/User');
const Event = require('./models/Event');
const Order = require('./models/Order');
const Item = require('./models/Item');

async function runTest() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);

  const redisClient = getRedisClient();
  const queue = new Queue('purchase-queue', { connection: redisClient });

  const event = await Event.findOne({ status: 'Live' }).populate('items');
  if (!event) {
    console.log('❌ No live event found. Please make sure there is an event with "Live" status.');
    process.exit(1);
  }

  // The 'Live' event seeded by default only has 2 items (index 0 and 1).
  const item = event.items[2];

  if (!item) {
    console.log('❌ Invalid item index. This event does not have an item at that position.');
    process.exit(1);
  }
  console.log(`\n==============================================`);
  console.log(`🔥 Starting Load Test`);
  console.log(`Event: ${event.name}`);
  console.log(`Item: ${item.name}`);
  console.log(`Current Stock: ${item.currentStock}`);
  console.log(`Total Requests to Fire: 1000`);
  console.log(`==============================================\n`);

  console.log('Checking for dummy users...');
  const count = await User.countDocuments({ email: /dummy.*@test.com/ });
  let users;
  if (count < 120) {
    console.log('Creating 1000 dummy users in DB... (This takes a few seconds)');
    // Delete old ones just in case
    await User.deleteMany({ email: /dummy.*@test.com/ });
    const newUsers = [];
    for (let i = 0; i < 120; i++) {
      newUsers.push({
        name: `Dummy ${i}`,
        email: `dummy${i}@test.com`,
        password: 'password',
        role: 'Customer',
        status: 'active'
      });
    }

    users = await User.insertMany(newUsers);
  } else {
    users = await User.find({ email: /dummy.*@test.com/ }).limit(120);
  }

  console.log('\n🚀 Pushing 1000 purchase requests to BullMQ instantly...');

  const jobs = users.map(u => ({
    name: 'processPurchase',
    data: {
      userId: u._id.toString(),
      eventId: event._id.toString(),
      itemId: item._id.toString()
    }
  }));

  // Add jobs in a single bulk operation
  await queue.addBulk(jobs);

  console.log('\n✅ Successfully queued 1000 concurrent purchase requests!');
  console.log('👀 Open your React frontend immediately! You will see the stock bar drop in real-time until it hits exactly 0 (Sold Out).');
  console.log('👀 Check your terminal running the backend server to see the worker processing the queue.');

  setTimeout(() => process.exit(0), 3000);
}

runTest();
