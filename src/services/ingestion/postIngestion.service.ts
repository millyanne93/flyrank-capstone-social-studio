import { createPost, Post } from '../../repositories/posts.repository';
import { generateVariantFromTemplate } from '../generation/variantGenerator.service';
import { validateContent, extractHashtags } from '../validation/constraintProfiles.service';
import { getConstraintProfile, getAllConstraintProfiles } from '../../repositories/constraintProfiles.repository';
import { createVariant, Variant } from '../../repositories/variants.repository';

export interface IngestResult {
  post: Post;
  variants: Variant[];
  validationErrors: { platform: string; errors: string[] }[];
}

export async function ingestPost(
  sourceType: 'url' | 'markdown',
  title: string,
  body: string,
  sourceUrl?: string
): Promise<IngestResult> {
  const post = await createPost(sourceType, title, body, sourceUrl);

  const profiles = await getAllConstraintProfiles();

  const variants: Variant[] = [];
  const validationErrors: { platform: string; errors: string[] }[] = [];

  for (const profile of profiles) {
    const { content } = generateVariantFromTemplate(post, profile);

    const result = validateContent(content, profile, extractHashtags);

    const variant = await createVariant(
      post.id,
      profile.platform,
      content,
      result.valid ? 'draft' : 'draft',
      result.valid ? null : result.errors
    );

    variants.push(variant);

    if (!result.valid) {
      validationErrors.push({
        platform: profile.platform,
        errors: result.errors || [],
      });
    }
  }

  return {
    post,
    variants,
    validationErrors,
  };
}
