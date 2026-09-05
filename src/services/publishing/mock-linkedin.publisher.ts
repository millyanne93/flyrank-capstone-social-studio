import { SocialPublisher, PublishResult } from './publisher.interface';

export class MockLinkedInPublisher implements SocialPublisher {
  async publish(content: string): Promise<PublishResult> {

    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (Math.random() < 0.15) {
      return {
        success: false,
        error: 'Mock LinkedIn: Simulated API failure (random 15% chance)',
      };
    }

    const mockId = `mock_li_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`[Mock LinkedIn] Published post (${content.length} chars): "${content.substring(0, 50)}..."`);
    console.log(`[Mock LinkedIn] Post ID: ${mockId}`);
    
    return {
      success: true,
      messageId: mockId,
    };
  }
}
