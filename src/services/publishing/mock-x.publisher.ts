import { SocialPublisher, PublishResult } from './publisher.interface';

export class MockXPublisher implements SocialPublisher {
  async publish(content: string): Promise<PublishResult> {
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: 'Mock X: Simulated API failure (random 10% chance)',
      };
    }

    const mockId = `mock_x_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`[Mock X] Published tweet (${content.length} chars): "${content.substring(0, 50)}..."`);
    console.log(`[Mock X] Tweet ID: ${mockId}`);
    
    return {
      success: true,
      messageId: mockId,
    };
  }
}
