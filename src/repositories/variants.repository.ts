import { query, queryOne } from '../db/client';

export interface Variant {
  id: string;
  post_id: string;
  platform: string;
  content: string;
  status: 'draft' | 'approved' | 'rejected' | 'published';
  slot_id: string | null;
  validation_errors: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export async function createVariant(
  postId: string,
  platform: string,
  content: string,
  status: 'draft' | 'approved' | 'rejected' | 'published' = 'draft',
  validationErrors: string[] | null = null
): Promise<Variant> {
  const rows = await query<Variant>(
    `INSERT INTO variants (post_id, platform, content, status, validation_errors)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [postId, platform, content, status, validationErrors ? JSON.stringify(validationErrors) : null]
  );
  return rows[0];
}

export async function getVariantsByPostId(postId: string): Promise<Variant[]> {
  return await query<Variant>(
    'SELECT * FROM variants WHERE post_id = $1 ORDER BY platform',
    [postId]
  );
}

export async function getVariantById(id: string): Promise<Variant | null> {
  return await queryOne<Variant>('SELECT * FROM variants WHERE id = $1', [id]);
}
