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
      modelName: 'text-embedding-3-large',
      dimensions: 256,
      configuration: {
        organization: this.configService.get<string>('OPENAI_ORG_ID'),
        defaultHeaders: {
          'X-App-Name': 'chatter-backend',
          'X-App-Version': this.configService.get<string>('APP_VERSION') || '1.0.0',
          'X-Environment': this.configService.get<string>('NODE_ENV') || 'development'
        }
      }
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

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param embeddingA First embedding vector
   * @param embeddingB Second embedding vector
   * @returns Cosine similarity score between -1 and 1
   */
  calculateCosineSimilarity(embeddingA: number[], embeddingB: number[]): number {
    if (!embeddingA || !embeddingB || embeddingA.length !== embeddingB.length) {
      return -1; // Return minimum similarity for invalid inputs
    }

    // Calculate dot product
    const dotProduct = embeddingA.reduce((sum, a, i) => sum + a * embeddingB[i], 0);

    // Calculate magnitudes
    const magnitudeA = Math.sqrt(embeddingA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(embeddingB.reduce((sum, b) => sum + b * b, 0));

    // Calculate cosine similarity
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0; // Avoid division by zero
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate Euclidean distance between two embedding vectors
   * Lower values indicate higher similarity
   * @param embeddingA First embedding vector
   * @param embeddingB Second embedding vector
   * @returns Distance value (0 is identical, higher is more different)
   */
  calculateEuclideanDistance(embeddingA: number[], embeddingB: number[]): number {
    if (!embeddingA || !embeddingB || embeddingA.length !== embeddingB.length) {
      return Number.MAX_VALUE; // Return maximum distance for invalid inputs
    }

    // Calculate sum of squared differences
    const sumSquaredDiff = embeddingA.reduce((sum, a, i) => {
      const diff = a - embeddingB[i];
      return sum + diff * diff;
    }, 0);

    return Math.sqrt(sumSquaredDiff);
  }

  /**
   * Calculate Dot Product similarity between two embedding vectors
   * Higher values indicate higher similarity
   * @param embeddingA First embedding vector
   * @param embeddingB Second embedding vector
   * @returns Dot product (higher values mean more similar)
   */
  calculateDotProduct(embeddingA: number[], embeddingB: number[]): number {
    if (!embeddingA || !embeddingB || embeddingA.length !== embeddingB.length) {
      return -1; // Return minimum similarity for invalid inputs
    }

    // Calculate dot product
    return embeddingA.reduce((sum, a, i) => sum + a * embeddingB[i], 0);
  }
} 