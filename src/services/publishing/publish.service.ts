import { SocialPublisher } from './publisher.interface';
import { TelegramPublisher } from './telegram.publisher';
import { MockXPublisher } from './mock-x.publisher';
import { MockLinkedInPublisher } from './mock-linkedin.publisher';
import { getVariantById, updateVariantStatus } from '../../repositories/variants.repository';
import { getSlotById } from '../../repositories/slots.repository';
import { 
  createPublishAttempt, 
  getPublishAttemptByIdempotencyKey,
  updatePublishAttempt 
} from '../../repositories/publishAttempts.repository';
import { config } from '../../config';

export class PublishService {
  private publishers: Map<string, SocialPublisher>;

  constructor() {
    this.publishers = new Map();
    this.initializePublishers();
  }

  private initializePublishers(): void {
    if (config.telegramBotToken && config.telegramChatId) {
      console.log('[PublishService] Telegram publisher initialized');
      this.publishers.set('telegram', new TelegramPublisher(
        config.telegramBotToken,
        config.telegramChatId
      ));
    } else {
      console.warn('[PublishService] Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    }

    console.log('[PublishService] Mock X publisher initialized');
    this.publishers.set('x', new MockXPublisher());
    
    console.log('[PublishService] Mock LinkedIn publisher initialized');
    this.publishers.set('linkedin', new MockLinkedInPublisher());
  }

  async publishVariant(variantId: string): Promise<{
    success: boolean;
    message?: string;
    attempt?: any;
  }> {
    try {
      console.log(`[PublishService] Starting publish for variant: ${variantId}`);

      const variant = await getVariantById(variantId);
      if (!variant) {
        return { success: false, message: 'Variant not found' };
      }
      console.log(`[PublishService] Variant found: platform=${variant.platform}, status=${variant.status}`);

      if (variant.status !== 'approved') {
        return { 
          success: false, 
          message: `Variant must be approved to publish. Current status: ${variant.status}` 
        };
      }

      if (!variant.slot_id) {
        return { success: false, message: 'Variant has no scheduled slot' };
      }

      
      const slot = await getSlotById(variant.slot_id);
      if (!slot) {
        return { success: false, message: 'Slot not found' };
      }
      console.log(`[PublishService] Slot found: scheduled_for=${slot.scheduled_for}`);

      const idempotencyKey = `publish_${variantId}_${variant.slot_id}`;

      const existingAttempt = await getPublishAttemptByIdempotencyKey(idempotencyKey);
      if (existingAttempt) {
        if (existingAttempt.status === 'succeeded') {
          console.log(`[PublishService] Already published (idempotent): ${idempotencyKey}`);
          return {
            success: true,
            message: 'Already published successfully',
            attempt: existingAttempt,
          };
        }
        if (existingAttempt.status === 'pending') {
          console.log(`[PublishService] Publish already in progress: ${idempotencyKey}`);
          return {
            success: false,
            message: 'Publish already in progress',
            attempt: existingAttempt,
          };
        }
        console.log(`[PublishService] Retrying failed attempt for variant ${variantId}`);
      }

      const publisher = this.publishers.get(variant.platform);
      if (!publisher) {
        return { 
          success: false, 
          message: `No publisher configured for platform: ${variant.platform}` 
        };
      }
      console.log(`[PublishService] Using publisher for: ${variant.platform}`);

      const attempt = await createPublishAttempt(
        variantId,
        variant.slot_id,
        idempotencyKey
      );
      console.log(`[PublishService] Created publish attempt: ${attempt.id}`);

      try {
        console.log(`[PublishService] Publishing to ${variant.platform}...`);
        const result = await publisher.publish(variant.content);

        if (result.success) {
          
          const updatedAttempt = await updatePublishAttempt(
            attempt.id,
            'succeeded',
            result.messageId
          );
          console.log(`[PublishService] Publish succeeded! Message ID: ${result.messageId}`);

          await updateVariantStatus(variantId, 'published');
          console.log(`[PublishService] Variant status updated to 'published'`);

          return {
            success: true,
            message: 'Published successfully',
            attempt: updatedAttempt,
          };
        } else {
          
          const updatedAttempt = await updatePublishAttempt(
            attempt.id,
            'failed',
            undefined,
            result.error
          );
          console.log(`[PublishService] ❌ Publish failed: ${result.error}`);

          return {
            success: false,
            message: `Publish failed: ${result.error}`,
            attempt: updatedAttempt,
          };
        }
      } catch (error) {
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await updatePublishAttempt(
          attempt.id,
          'failed',
          undefined,
          errorMessage
        );
        console.log(`[PublishService] ❌ Publish error: ${errorMessage}`);

        return {
          success: false,
          message: `Publish failed: ${errorMessage}`,
          attempt,
        };
      }
    } catch (error) {
      console.error('[PublishService] ❌ Unexpected error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getPublisher(platform: string): SocialPublisher | undefined {
    return this.publishers.get(platform);
  }

  getConfiguredPlatforms(): string[] {
    return Array.from(this.publishers.keys());
  }
}

export const publishService = new PublishService();
