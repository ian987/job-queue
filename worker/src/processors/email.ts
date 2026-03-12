import { Job } from 'bullmq';

export async function processEmail(job: Job): Promise<{ sent: boolean }> {
  console.log(`[email] Processing job ${job.id}`, job.data);
  // Simulate email sending
  await new Promise((res) => setTimeout(res, 500));
  console.log(`[email] Job ${job.id} complete`);
  return { sent: true };
}
