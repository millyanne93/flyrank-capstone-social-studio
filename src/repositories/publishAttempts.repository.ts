import { query, queryOne } from '../db/client';

export interface PublishAttempt {
  id: string;
  variant_id: string;
  slot_id: string;
  idempotency_key: string;
  status: 'pending' | 'succeeded' | 'failed';
  platform_message_ref?: string;
  error_message?: string;
  attempted_at: Date;
  created_at: Date;
}

export async function createPublishAttempt(
  variantId: string,
  slotId: string,
  idempotencyKey: string
): Promise<PublishAttempt> {
  const rows = await query<PublishAttempt>(
    `INSERT INTO publish_attempts (variant_id, slot_id, idempotency_key, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [variantId, slotId, idempotencyKey]
  );
  return rows[0];
}

export async function getPublishAttemptByIdempotencyKey(
  idempotencyKey: string
): Promise<PublishAttempt | null> {
  return await queryOne<PublishAttempt>(
    'SELECT * FROM publish_attempts WHERE idempotency_key = $1',
    [idempotencyKey]
  );
}

export async function updatePublishAttempt(
  id: string,
  status: 'succeeded' | 'failed',
  platformMessageRef?: string,
  errorMessage?: string
): Promise<PublishAttempt | null> {
  const rows = await query<PublishAttempt>(
    `UPDATE publish_attempts
     SET status = $1,
         platform_message_ref = COALESCE($2, platform_message_ref),
         error_message = COALESCE($3, error_message),
         attempted_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, platformMessageRef, errorMessage, id]
  );
  return rows[0] || null;
}

export async function getPendingAttempts(): Promise<PublishAttempt[]> {
  return await query<PublishAttempt>(
    'SELECT * FROM publish_attempts WHERE status = \'pending\' ORDER BY created_at ASC'
  );
}

export async function getAttemptsByVariantId(variantId: string): Promise<PublishAttempt[]> {
  return await query<PublishAttempt>(
    'SELECT * FROM publish_attempts WHERE variant_id = $1 ORDER BY created_at DESC',
    [variantId]
  );
}

export async function getAttemptsBySlotId(slotId: string): Promise<PublishAttempt[]> {
  return await query<PublishAttempt>(
    'SELECT * FROM publish_attempts WHERE slot_id = $1 ORDER BY created_at DESC',
    [slotId]
  );
}
