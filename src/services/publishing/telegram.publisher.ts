import { SocialPublisher, PublishResult } from './publisher.interface';

export class TelegramPublisher implements SocialPublisher {
  private botToken: string;
  private chatId: string;

  constructor(botToken: string, chatId: string) {
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async publish(content: string): Promise<PublishResult> {
    try {
      
      if (!this.botToken || this.botToken === 'your_bot_token_here') {
        return {
          success: false,
          error: 'Telegram bot token not configured. Set TELEGRAM_BOT_TOKEN in .env',
        };
      }

      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: content,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Telegram API error: ${JSON.stringify(errorData)}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.result.message_id.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Telegram error',
      };
    }
  }
}
