import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class EmbeddingsService {
  private readonly embeddings: OpenAIEmbeddings;
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set, embeddings will not work properly');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-large', // 'text-embedding-ada-002', // Default model for embeddings
      dimensions: 256, // 1536, // Default dimension for text-embedding-ada-002
    });
  }

  /**
   * Generate embeddings for a text message
   * @param text The message text to generate embeddings for
   * @returns An array of embedding values or null if an error occurs
   */
  async generateEmbeddings(text: string): Promise<number[] | null> {
    if (!text) {
      return null;
    }

    try {
      // LangChain's embeddings.embedQuery returns a single vector for a text
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      this.logger.error(`Error generating embeddings: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple text messages
   * @param texts Array of text messages
   * @returns Array of embedding vectors
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][] | null> {
    if (!texts || texts.length === 0) {
      return null;
    }

    try {
      // LangChain's embeddings.embedDocuments returns vectors for multiple texts
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      this.logger.error(`Error generating batch embeddings: ${error.message}`, error.stack);
      return null;
    }
  }
} 