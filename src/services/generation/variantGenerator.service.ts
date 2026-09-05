import { ConstraintProfile } from '../validation/constraintProfiles.service';
import { Post } from '../../repositories/posts.repository';

type GenerationSource = 'ai' | 'template';

export interface GeneratedVariant {
  content: string;
  source: GenerationSource;
}

export function generateVariantFromTemplate(post: Post, profile: ConstraintProfile): GeneratedVariant {
  let content = post.title + '\n\n' + post.body;
  
  const maxWithHashtags = profile.max_length - 20;
  if (content.length > maxWithHashtags) {
    content = content.substring(0, maxWithHashtags) + '...';
  }

  switch (profile.platform) {
    case 'x':
      content = shortenForX(content);
      content = addHashtags(content, profile);
      break;
    case 'linkedin':
      content = addLinkedInCTA(content);
      content = addHashtags(content, profile);
      break;
    case 'telegram':
      content = addHashtags(content, profile);
      break;
  }

  return {
    content,
    source: 'template',
  };
}

function shortenForX(text: string): string {
 
  if (text.length > 260) {
    return text.substring(0, 257) + '...';
  }
  return text;
}

function addLinkedInCTA(text: string): string {
 
  if (!text.includes('?') && !text.includes('What')) {
    return text + '\n\nWhat are your thoughts on this? Share your perspective in the comments.';
  }
  return text;
}

function addHashtags(text: string, profile: ConstraintProfile): string {
 
  const words = text.split(/\s+/);
  const keywords = words
    .filter(w => w.length > 5)
    .slice(0, profile.max_hashtags)
    .map(w => '#' + w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());

  while (keywords.length < profile.min_hashtags) {
    keywords.push('#socialmedia');
  }

  const finalHashtags = keywords.slice(0, profile.max_hashtags);
  return text + '\n\n' + finalHashtags.join(' ');
}
