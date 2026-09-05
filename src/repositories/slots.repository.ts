import { query, queryOne } from '../db/client';

export interface Slot {
  id: string;
  scheduled_for: Date;
  created_at: Date;
}

export async function createSlot(scheduledFor: Date): Promise<Slot> {
  const rows = await query<Slot>(
    `INSERT INTO slots (scheduled_for)
     VALUES ($1)
     RETURNING *`,
    [scheduledFor]
  );
  return rows[0];
}

export async function getSlotById(id: string): Promise<Slot | null> {
  return await queryOne<Slot>('SELECT * FROM slots WHERE id = $1', [id]);
}

export async function getAllSlots(): Promise<Slot[]> {
  return await query<Slot>('SELECT * FROM slots ORDER BY scheduled_for ASC');
}

export async function getPendingSlots(): Promise<Slot[]> {
  return await query<Slot>(
    'SELECT * FROM slots WHERE scheduled_for > NOW() ORDER BY scheduled_for ASC'
  );
}
