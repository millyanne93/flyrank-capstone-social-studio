export interface ConstraintProfile {
  platform: string;
  max_length: number;
  tone: string;
  min_hashtags: number;
  max_hashtags: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateContent(
  content: string,
  profile: ConstraintProfile,
  extractHashtags?: (text: string) => string[]
): ValidationResult {
  const errors: string[] = [];

  if (content.length > profile.max_length) {
    errors.push(`Exceeds max length: ${content.length} > ${profile.max_length} characters`);
  }

  if (extractHashtags) {
    const hashtags = extractHashtags(content);
    const count = hashtags.length;
    if (count < profile.min_hashtags) {
      errors.push(`Too few hashtags: ${count} < ${profile.min_hashtags}`);
    }
    if (count > profile.max_hashtags) {
      errors.push(`Too many hashtags: ${count} > ${profile.max_hashtags}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches || [];
}
