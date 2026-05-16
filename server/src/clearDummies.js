require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./models/User');
  const Order = require('./models/Order');
  
  console.log('Deleting dummy users and their orders...');
  await User.deleteMany({ email: /dummy.*@test.com/ });
  
  console.log('✅ 1000 Dummy users deleted!');
  process.exit(0);
}

run();
