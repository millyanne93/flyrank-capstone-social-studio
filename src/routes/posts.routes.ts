import { Router, Request, Response } from 'express';
import { postIngestSchema } from '../validation/posts.schema';
import { ingestPost } from '../services/ingestion/postIngestion.service';
import { getPostById, getAllPosts } from '../repositories/posts.repository';
import { getVariantsByPostId } from '../repositories/variants.repository';

const router = Router();

router.post('/api/posts', async (req: Request, res: Response) => {
  try {
    const result = postIngestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: result.error.errors,
      });
    }

    const { source_type, source_url, title, body } = result.data;

    const ingestResult = await ingestPost(
      source_type,
      title,
      body,
      source_url
    );
    
    const hasErrors = ingestResult.validationErrors.length > 0;

    res.status(201).json({
      post: ingestResult.post,
      variants: ingestResult.variants,
      validation_errors: ingestResult.validationErrors,
      warnings: hasErrors ? 'Some variants failed validation. Check validation_errors for details.' : undefined,
    });
  } catch (error) {
    console.error('Error ingesting post:', error);
    res.status(500).json({ error: 'Failed to ingest post' });
  }
});

router.get('/api/posts', async (req: Request, res: Response) => {
  try {
    const posts = await getAllPosts();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const post = await getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const variants = await getVariantsByPostId(post.id);

    res.json({
      post,
      variants,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

export default router;
