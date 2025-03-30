import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { Message } from 'src/message/schemas/message.schema';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(AIService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set, AI features will not work properly');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      organization: this.configService.get<string>('OPENAI_ORG_ID'),
      defaultHeaders: {
        'X-App-Name': 'chatter-backend',
        'X-App-Version': this.configService.get<string>('APP_VERSION') || '1.0.0',
        'X-Environment': this.configService.get<string>('NODE_ENV') || 'development'
      }
    });
  }

  /**
   * Generate smart reply suggestions based on message history
   * @param messages Array of messages to use as context
   * @param currentUsername Username of the current user
   * @returns Array of suggested replies
   */
  async generateSmartReplies(messages: any[], currentUsername: string): Promise<string[]> {
    try {
      // Format messages for OpenAI
      const chatMessages: ChatMessage[] = [];
      
      // Add system message
      chatMessages.push({
        role: 'system',
        content: `You are a helpful assistant generating reply suggestions for a group chat. 
        The current user is "${currentUsername}". 
        Generate 3 concise, natural-sounding replies that ${currentUsername} might send.
        Be conversational, friendly, and contextually relevant to the recent messages.
        Keep suggestions under 150 characters each.`
      });
      
      // Add chat history as context (limit to last 20 messages to save tokens)
      const recentMessages = messages.slice(-20);
      
      recentMessages.forEach(message => {
        chatMessages.push({
          role: message.username === currentUsername ? 'assistant' : 'user',
          content: `${message.username}: ${message.content}`
        });
      });
      
      // Add a final user message to prompt for suggestions
      chatMessages.push({
        role: 'user',
        content: `Based on this conversation, generate 3 possible replies for ${currentUsername}. 
        Format the response as 3 separate lines with no numbering or prefixes.`
      });

      // Call OpenAI API - using gpt-3.5-turbo for cost efficiency
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 150,
        n: 1,
        response_format: { type: "text" },
        user: `${currentUsername}_smart_replies_${this.configService.get<string>('NODE_ENV')}`
      });

      // Parse suggestions from the response
      const suggestionsText = response.choices[0]?.message?.content || '';
      const suggestions = suggestionsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 3); // Ensure we only return max 3 suggestions
      
      // If we didn't get enough suggestions, add some generic ones
      while (suggestions.length < 3) {
        const genericReplies = [
          "Thanks for sharing!",
          "I see what you mean.",
          "Interesting point!",
          "Let me think about that.",
          "I agree!",
          "What does everyone else think?",
          "Good idea!",
          "That makes sense."
        ];
        const randomReply = genericReplies[Math.floor(Math.random() * genericReplies.length)];
        if (!suggestions.includes(randomReply)) {
          suggestions.push(randomReply);
        }
      }

      return suggestions;
    } catch (error) {
      this.logger.error(`Error generating smart replies: ${error.message}`, error.stack);
      // Return fallback suggestions in case of an error
      return [
        "Thanks for sharing!",
        "I'll get back to you on that.",
        "That's interesting!"
      ];
    }
  }
} 