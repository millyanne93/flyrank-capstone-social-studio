export interface PublishResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SocialPublisher {
  /**
   * Publish content to the platform
   * @param content - The text content to publish
   * @returns PublishResult with success status and message ID if successful
   */
  publish(content: string): Promise<PublishResult>;
}
