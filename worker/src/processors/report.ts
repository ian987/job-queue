import { Job } from 'bullmq';

export async function processReport(job: Job): Promise<{ generated: boolean }> {
  console.log(`[report] Processing job ${job.id}`, job.data);
  await new Promise((res) => setTimeout(res, 1000));
  console.log(`[report] Job ${job.id} complete`);
  return { generated: true };
}
