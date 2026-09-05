import { Router, Request, Response } from 'express';
import { schedulerService } from '../services/scheduler/scheduler.service';
import { getVariantById } from '../repositories/variants.repository';
import { getPendingAttempts } from '../repositories/publishAttempts.repository';

const router = Router();

router.post('/api/scheduler/start', async (req: Request, res: Response) => {
  try {
    schedulerService.start();
    const status = schedulerService.getStatus();
    res.json({
      success: true,
      message: 'Scheduler started',
      status,
    });
  } catch (error) {
    console.error('[Scheduler Route] Error starting scheduler:', error);
    res.status(500).json({ error: 'Failed to start scheduler' });
  }
});

router.post('/api/scheduler/stop', async (req: Request, res: Response) => {
  try {
    schedulerService.stop();
    const status = schedulerService.getStatus();
    res.json({
      success: true,
      message: 'Scheduler stopped',
      status,
    });
  } catch (error) {
    console.error('[Scheduler Route] Error stopping scheduler:', error);
    res.status(500).json({ error: 'Failed to stop scheduler' });
  }
});

router.get('/api/scheduler/status', async (req: Request, res: Response) => {
  try {
    const status = schedulerService.getStatus();
    const pendingAttempts = await getPendingAttempts();
    
    res.json({
      scheduler: status,
      pending_attempts: pendingAttempts.length,
      pending_details: pendingAttempts,
    });
  } catch (error) {
    console.error('[Scheduler Route] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

router.post('/api/scheduler/process/:variantId', async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params;
    
    const variant = await getVariantById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const result = await schedulerService.processNow(variantId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    console.error('[Scheduler Route] Error processing variant:', error);
    res.status(500).json({ error: 'Failed to process variant' });
  }
});

export default router;
