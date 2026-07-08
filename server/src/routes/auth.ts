import { Router } from 'express';
import { pool } from '../db';
import { asyncHandler } from '../lib/asyncHandler';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { name, role } = req.body as { name?: string; role?: 'technician' | 'manager' };
    if (!name?.trim() || (role !== 'technician' && role !== 'manager')) {
      res.status(400).json({ error: 'name and role are required' });
      return;
    }

    const trimmedName = name.trim();
    const existing = await pool.query('select id, name, role from users where lower(name) = lower($1) and role = $2', [
      trimmedName,
      role,
    ]);

    let user = existing.rows[0];
    if (!user) {
      const inserted = await pool.query('insert into users (name, role) values ($1, $2) returning id, name, role', [
        trimmedName,
        role,
      ]);
      user = inserted.rows[0];
    }

    res.json({ user });
  })
);
