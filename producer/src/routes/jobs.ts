import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { enqueueJob } from '../config/queue';
import { db } from '../config/db';

const router = Router();

const createJobSchema = z.object({
  type: z.string().min(1).max(100),
  payload: z.record(z.unknown()).default({}),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

// POST /jobs — enqueue a new job
router.post('/', validate(createJobSchema), async (req: Request, res: Response) => {
  const { type, payload, priority } = req.body;
  try {
    
    const result = await db.query(
      `INSERT INTO jobs (type, payload, status, priority)
      VALUES ($1, $2, 'pending', $3)
      RETURNING *`,
      [type, JSON.stringify(payload), priority]
    );
    
    const job = result.rows[0];
    await enqueueJob(type,{...payload, _dbId: job.id} , priority);

    // Broadcast new job to dashboard immediately
    try {
      const { io } = await import('../index');
      io.emit('job:update', { event: 'created', job });
    } catch (_) {}

    res.status(201).json(job);
  } catch (err) {
    console.error('Error enqueuing job:', err);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

// GET /jobs — all jobs (for dashboard feed), latest first
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /jobs/:id — single job detail
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching job:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

export default router;
