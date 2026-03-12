import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'jobqueue',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
});

db.on('error', (err) => console.error('DB error:', err));
