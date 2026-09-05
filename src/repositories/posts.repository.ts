import { query, queryOne } from '../db/client';

export interface Post {
  id: string;
  source_type: 'url' | 'markdown';
  source_url?: string;
  title: string;
  body: string;
  created_at: Date;
}

export async function createPost(
  sourceType: 'url' | 'markdown',
  title: string,
  body: string,
  sourceUrl?: string
): Promise<Post> {
  const rows = await query<Post>(
    `INSERT INTO posts (source_type, source_url, title, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [sourceType, sourceUrl || null, title, body]
  );
  return rows[0];
}

export async function getPostById(id: string): Promise<Post | null> {
  return await queryOne<Post>('SELECT * FROM posts WHERE id = $1', [id]);
}

export async function getAllPosts(): Promise<Post[]> {
  return await query<Post>('SELECT * FROM posts ORDER BY created_at DESC');
}
