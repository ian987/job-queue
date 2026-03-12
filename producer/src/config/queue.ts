import { Queue } from 'bullmq';
import { redis } from './redis';

export const jobQueue = new Queue('jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

const PRIORITY_MAP: Record<string, number> = {
  high: 1,
  medium: 5,
  low: 10,
};

export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  priority: string = 'medium'
) {
  const job = await jobQueue.add(type, payload, {
    priority: PRIORITY_MAP[priority] ?? 5,
  });
  return job;
}
