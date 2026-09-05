import { query } from '../db/client';

export interface ConstraintProfile {
  id: string;
  platform: string;
  max_length: number;
  tone: string;
  min_hashtags: number;
  max_hashtags: number;
  created_at: Date;
}

export async function getConstraintProfile(platform: string): Promise<ConstraintProfile | null> {
  const rows = await query<ConstraintProfile>(
    'SELECT * FROM constraint_profiles WHERE platform = $1',
    [platform]
  );
  return rows[0] || null;
}

export async function getAllConstraintProfiles(): Promise<ConstraintProfile[]> {
  return await query<ConstraintProfile>('SELECT * FROM constraint_profiles ORDER BY platform');
}

export async function seedConstraintProfiles(): Promise<void> {
  const profiles = [
    { platform: 'x', max_length: 280, tone: 'punchy, direct', min_hashtags: 1, max_hashtags: 2 },
    { platform: 'linkedin', max_length: 3000, tone: 'professional, reflective', min_hashtags: 3, max_hashtags: 5 },
    { platform: 'telegram', max_length: 4096, tone: 'neutral, informational', min_hashtags: 0, max_hashtags: 3 },
  ];

  for (const profile of profiles) {
    await query(
      `INSERT INTO constraint_profiles (platform, max_length, tone, min_hashtags, max_hashtags)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (platform) DO NOTHING`,
      [profile.platform, profile.max_length, profile.tone, profile.min_hashtags, profile.max_hashtags]
    );
  }
}
