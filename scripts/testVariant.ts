import { seedConstraintProfiles } from '../src/repositories/constraintProfiles.repository';
import { getConstraintProfile } from '../src/repositories/constraintProfiles.repository';
import { generateVariantFromTemplate } from '../src/services/generation/variantGenerator.service';
import { validateContent, extractHashtags } from '../src/services/validation/constraintProfiles.service';
import { closePool } from '../src/db/client';

async function testVariant() {
  console.log('Testing variant generation...\n');

  await seedConstraintProfiles();

  const post = {
    id: 'test-post-1',
    source_type: 'markdown' as const,
    title: 'The Future of Remote Work',
    body: 'Remote work is transforming how teams collaborate. Companies are adopting flexible policies that prioritize outcomes over hours. This shift requires new tools and communication practices. Leaders must focus on trust and clear expectations.',
    created_at: new Date(),
  };

  const xProfile = await getConstraintProfile('x');
  if (xProfile) {
    console.log('X (Twitter) Variant:');
    const { content } = generateVariantFromTemplate(post, xProfile);
    console.log(`Content (${content.length} chars):\n${content}\n`);
    const result = validateContent(content, xProfile, extractHashtags);
    console.log(`Valid: ${result.valid}`);
    if (result.errors) console.log(`Errors: ${result.errors.join(', ')}`);
    console.log('');
  }

  const liProfile = await getConstraintProfile('linkedin');
  if (liProfile) {
    console.log('LinkedIn Variant:');
    const { content } = generateVariantFromTemplate(post, liProfile);
    console.log(`Content (${content.length} chars):\n${content}\n`);
    const result = validateContent(content, liProfile, extractHashtags);
    console.log(`Valid: ${result.valid}`);
    if (result.errors) console.log(`Errors: ${result.errors.join(', ')}`);
    console.log('');
  }

  const tgProfile = await getConstraintProfile('telegram');
  if (tgProfile) {
    console.log('Telegram Variant:');
    const { content } = generateVariantFromTemplate(post, tgProfile);
    console.log(`Content (${content.length} chars):\n${content}\n`);
    const result = validateContent(content, tgProfile, extractHashtags);
    console.log(`Valid: ${result.valid}`);
    if (result.errors) console.log(`Errors: ${result.errors.join(', ')}`);
    console.log('');
  }

  await closePool();
}

testVariant().catch(console.error);
