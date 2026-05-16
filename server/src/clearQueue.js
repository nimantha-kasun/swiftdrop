require('dotenv').config();
const { Queue } = require('bullmq');
const { getRedisClient } = require('./config/redis');

async function run() {
  console.log('Connecting to Redis...');
  const redisClient = getRedisClient();
  const queue = new Queue('purchase-queue', { connection: redisClient });

  console.log('Clearing the queue...');
  await queue.obliterate({ force: true });
  
  console.log('✅ Queue completely cleared!');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
