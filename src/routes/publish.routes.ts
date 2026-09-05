import { Router, Request, Response } from 'express';
import { publishService } from '../services/publishing/publish.service';
import { getVariantById } from '../repositories/variants.repository';
import { getAttemptsByVariantId, getPendingAttempts } from '../repositories/publishAttempts.repository';

const router = Router();


router.post('/api/variants/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const variant = await getVariantById(id);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const result = await publishService.publishVariant(id);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        attempt: result.attempt,
      });
    } else {
      const status = result.message?.includes('not found') ? 404 : 400;
      return res.status(status).json({
        success: false,
        error: result.message,
        attempt: result.attempt,
      });
    }
  } catch (error) {
    console.error('[Publish Route] Error:', error);
    res.status(500).json({
      error: 'Failed to publish variant',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/api/variants/:id/attempts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const variant = await getVariantById(id);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const attempts = await getAttemptsByVariantId(id);
    res.json({
      variant_id: id,
      attempts,
      count: attempts.length,
    });
  } catch (error) {
    console.error('[Attempts Route] Error:', error);
    res.status(500).json({ error: 'Failed to fetch publish attempts' });
  }
});

router.get('/api/publish/pending', async (req: Request, res: Response) => {
  try {
    const attempts = await getPendingAttempts();
    res.json({
      pending_count: attempts.length,
      attempts,
    });
  } catch (error) {
    console.error('[Pending Attempts Route] Error:', error);
    res.status(500).json({ error: 'Failed to fetch pending attempts' });
  }
});

router.get('/api/publish/platforms', async (req: Request, res: Response) => {
  try {
    const platforms = publishService.getConfiguredPlatforms();
    res.json({
      platforms,
      count: platforms.length,
    });
  } catch (error) {
    console.error('[Platforms Route] Error:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

export default router;
