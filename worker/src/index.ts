import { Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

import { redis } from './config/redis';
import { db } from './config/db';
import { processEmail } from './processors/email';
import { processReport } from './processors/report';
import { processOTP } from './processors/otp';

const CONCURRENCY = parseInt(process.env.CONCURRENCY || '5');

const processors: Record<string, (job: Job) => Promise<unknown>> = {
  email: processEmail,
  report: processReport,
  otp: processOTP,
};

const worker = new Worker(
  'jobs',
  async (job: Job) => {
    const dbId = job.data._dbId;
    await db.query(
      `UPDATE jobs SET status = 'processing', attempts = attempts + 1, updated_at = NOW() WHERE id = $1`,
      [dbId]
    );

    const processor = processors[job.name];
    if (!processor) throw new Error(`Unknown job type: ${job.name}`);

    const result = await processor(job);

    await db.query(
      `UPDATE jobs SET status = 'completed', result = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(result), dbId]
    );

    // Publish event to Redis so producer can broadcast via WebSocket
    await redis.publish('job:events', JSON.stringify({
      event: 'completed',
      dbId,
      jobName: job.name,
      jobId: job.id,
      result,
    }));

    return result;
  },
  { connection: redis, concurrency: CONCURRENCY }
);

worker.on('completed', (job) => {
  console.log(`✓ Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', async (job, err) => {
  const dbId = job?.data._dbId;
  console.error(`✗ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
  if (job) {
    await db.query(
      `UPDATE jobs SET status = 'failed', error = $1, updated_at = NOW()
       WHERE id = $2`,
      [err.message, dbId]
    );

    await redis.publish('job:events', JSON.stringify({
      event: 'failed',
      dbId,
      jobName: job.name,
      jobId: job.id,
      error: err.message,
    }));
  }
});

console.log(`Worker started with concurrency ${CONCURRENCY}`);
