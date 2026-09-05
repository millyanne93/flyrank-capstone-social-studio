import { query } from '../../db/client';
import { publishService } from '../publishing/publish.service';
import { getVariantById } from '../../repositories/variants.repository';
import { updatePublishAttempt } from '../../repositories/publishAttempts.repository';
import { SchedulerConfig, DEFAULT_SCHEDULER_CONFIG } from './scheduler.types';

export class SchedulerService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private config: SchedulerConfig;

  constructor(config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG) {
    this.config = config;
  }

  start(): void {
    if (this.isRunning) {
      console.log('[Scheduler] Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`[Scheduler] Started (checking every ${this.config.checkIntervalMs}ms)`);
    
    this.checkAndPublish();
    
    this.intervalId = setInterval(() => {
      this.checkAndPublish();
    }, this.config.checkIntervalMs);
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('[Scheduler] Scheduler is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[Scheduler] Stopped');
  }

  getStatus(): { isRunning: boolean; config: SchedulerConfig } {
    return {
      isRunning: this.isRunning,
      config: this.config,
    };
  }

  private async checkAndPublish(): Promise<void> {
    if (!this.isRunning) return;

    try {
      console.log('[Scheduler] Checking for due slots...');
      
      const dueSlots = await this.getDueSlots();
      
      if (dueSlots.length === 0) {
        console.log('[Scheduler] No due slots found');
        return;
      }

      console.log(`[Scheduler] Found ${dueSlots.length} due slot(s)`);

      for (const slot of dueSlots) {
        await this.processSlot(slot);
      }
    } catch (error) {
      console.error('[Scheduler] Error in checkAndPublish:', error);
    }
  }

  private async getDueSlots(): Promise<any[]> {
    const rows = await query(
      `SELECT 
         s.id as slot_id,
         s.scheduled_for,
         v.id as variant_id,
         v.platform,
         v.content,
         v.status
       FROM slots s
       JOIN variants v ON v.slot_id = s.id
       WHERE s.scheduled_for <= NOW()
         AND v.status = 'approved'
         AND NOT EXISTS (
           SELECT 1 FROM publish_attempts pa 
           WHERE pa.variant_id = v.id 
           AND pa.status = 'succeeded'
         )
       ORDER BY s.scheduled_for ASC
       LIMIT 10`
    );
    return rows;
  }

  private async processSlot(slot: any): Promise<void> {
    const { variant_id, slot_id, platform, content, scheduled_for } = slot;
    
    console.log(`[Scheduler] Processing slot ${slot_id} for variant ${variant_id}`);
    console.log(`[Scheduler] Scheduled for: ${scheduled_for}`);
    console.log(`[Scheduler] Platform: ${platform}`);

    try {
      const existingAttempts = await query(
        `SELECT * FROM publish_attempts 
         WHERE variant_id = $1 AND status = 'failed'
         ORDER BY attempted_at DESC LIMIT 1`,
        [variant_id]
      );

      let retryCount = 0;
      if (existingAttempts.length > 0) {
        const attempt = existingAttempts[0];
        const allFailed = await query(
          `SELECT COUNT(*) as count FROM publish_attempts 
           WHERE variant_id = $1 AND status = 'failed'`,
          [variant_id]
        );
        retryCount = parseInt(allFailed[0].count) || 0;
        
        if (retryCount >= this.config.maxRetries) {
          console.log(`[Scheduler] Max retries (${this.config.maxRetries}) exceeded for variant ${variant_id}`);
          
          return;
        }

        const delay = Math.min(
          this.config.initialRetryDelayMs * Math.pow(2, retryCount),
          this.config.maxRetryDelayMs
        );
        
      
        const lastAttempt = new Date(attempt.attempted_at);
        const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
        
        if (timeSinceLastAttempt < delay) {
          console.log(`[Scheduler] Retry ${retryCount + 1}/${this.config.maxRetries} scheduled for variant ${variant_id} (waiting ${delay}ms)`);
          return; 
        }
        
        console.log(`[Scheduler] Retry ${retryCount + 1}/${this.config.maxRetries} for variant ${variant_id}`);
      }

      console.log(`[Scheduler] Publishing variant ${variant_id}...`);
      const result = await publishService.publishVariant(variant_id);

      if (result.success) {
        console.log(`[Scheduler] Successfully published variant ${variant_id}`);
      } else {
        console.log(`[Scheduler] Failed to publish variant ${variant_id}: ${result.message}`);
        
        if (result.attempt) {
          await updatePublishAttempt(
            result.attempt.id,
            'failed',
            undefined,
            result.message
          );
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Error processing slot ${slot_id}:`, error);
    }
  }

  async processNow(variantId: string): Promise<any> {
    
    const variant = await getVariantById(variantId);
    if (!variant || !variant.slot_id) {
      return { success: false, message: 'Variant not found or not scheduled' };
    }

    const slotRows = await query(
      'SELECT * FROM slots WHERE id = $1',
      [variant.slot_id]
    );

    if (slotRows.length === 0) {
      return { success: false, message: 'Slot not found' };
    }

    const slot = {
      variant_id: variantId,
      slot_id: variant.slot_id,
      platform: variant.platform,
      content: variant.content,
      scheduled_for: slotRows[0].scheduled_for,
    };

    await this.processSlot(slot);
    return { success: true, message: 'Processing triggered' };
  }
}

export const schedulerService = new SchedulerService();
