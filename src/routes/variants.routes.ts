import { Router, Request, Response } from 'express';
import { getVariantById, updateVariantStatus, updateVariantContent } from '../repositories/variants.repository';
import { createSlot, getSlotById } from '../repositories/slots.repository';
import { attachVariantToSlot } from '../repositories/variants.repository';

const router = Router();

router.post('/api/variants/:id/approve', async (req: Request, res: Response) => {
  try {
    const variant = await getVariantById(req.params.id);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    if (variant.status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft variants can be approved',
        current_status: variant.status,
      });
    }

    const updated = await updateVariantStatus(variant.id, 'approved');
    res.json({
      success: true,
      message: 'Variant approved successfully',
      variant: updated,
    });
  } catch (error) {
    console.error('Error approving variant:', error);
    res.status(500).json({ error: 'Failed to approve variant' });
  }
});

router.post('/api/variants/:id/reject', async (req: Request, res: Response) => {
  try {
    const variant = await getVariantById(req.params.id);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    if (variant.status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft variants can be rejected',
        current_status: variant.status,
      });
    }

    const updated = await updateVariantStatus(variant.id, 'rejected');
    res.json({
      success: true,
      message: 'Variant rejected',
      variant: updated,
    });
  } catch (error) {
    console.error('Error rejecting variant:', error);
    res.status(500).json({ error: 'Failed to reject variant' });
  }
});

router.patch('/api/variants/:id', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const variant = await getVariantById(req.params.id);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    if (variant.status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft variants can be edited',
        current_status: variant.status,
      });
    }

    const updated = await updateVariantContent(variant.id, content);
    res.json({
      success: true,
      message: 'Variant updated',
      variant: updated,
    });
  } catch (error) {
    console.error('Error updating variant:', error);
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

router.post('/api/slots', async (req: Request, res: Response) => {
  try {
    const { scheduled_for } = req.body;
    if (!scheduled_for) {
      return res.status(400).json({ error: 'scheduled_for is required' });
    }

    const slot = await createSlot(new Date(scheduled_for));
    res.status(201).json({
      success: true,
      message: 'Slot created',
      slot,
    });
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

router.post('/api/variants/:id/schedule', async (req: Request, res: Response) => {
  try {
    const { slot_id } = req.body;
    if (!slot_id) {
      return res.status(400).json({ error: 'slot_id is required' });
    }

    const variant = await getVariantById(req.params.id);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    if (variant.status !== 'approved') {
      return res.status(400).json({
        error: 'Only approved variants can be scheduled',
        current_status: variant.status,
      });
    }

    const slot = await getSlotById(slot_id);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    const updated = await attachVariantToSlot(variant.id, slot_id);
    if (!updated) {
      return res.status(409).json({
        error: 'Slot is already occupied',
        message: 'This slot has already been assigned to another variant',
      });
    }

    res.json({
      success: true,
      message: 'Variant scheduled successfully',
      variant: updated,
      slot,
    });
  } catch (error) {
    console.error('Error scheduling variant:', error);
    res.status(500).json({ error: 'Failed to schedule variant' });
  }
});

router.get('/api/posts/:postId/variants', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const variants = await getVariantsByPostId(postId);
    res.json({
      post_id: postId,
      variants,
    });
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

export default router;
