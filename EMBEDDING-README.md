# Embedding-Based Smart Reply Feature

This document explains the implementation of the embedding-based smart reply feature in the chat application.

## Overview

The smart reply feature uses OpenAI embeddings to select the most contextually relevant messages from a conversation to generate AI-powered reply suggestions.

## How It Works

1. When a message is created, we generate embeddings using OpenAI's text-embedding-3-large model and store them with the message.
2. When a user requests smart replies, the system:
   - Retrieves all messages from the group
   - Takes the most recent message as a reference point
   - Calculates similarity between the reference message and all other messages using vector similarity metrics
   - Selects the top 5 most contextually relevant messages
   - Sends only these selected messages to OpenAI to generate smart replies

## Similarity Algorithms

The system supports three similarity algorithms that can be configured via the `SIMILARITY_ALGORITHM` environment variable:

### 1. Dot Product (Default)
- Simple and efficient calculation of vector similarity
- Faster to compute than cosine similarity
- Works well with normalized embedding vectors
- Higher values indicate greater similarity

### 2. Cosine Similarity
- Measures the cosine of the angle between two vectors
- Range: -1 to 1 (1 being most similar)
- Good for comparing documents of different lengths
- Slightly more computationally expensive

### 3. Euclidean Distance
- Measures the straight-line distance between two points in space
- Lower values indicate greater similarity (0 = identical)
- We invert the score for consistency with other algorithms
- Works well when magnitude matters

## Cost Optimization

This implementation significantly reduces OpenAI API costs by:

1. Using the text-embedding-3-large model with 256 dimensions (more cost-effective than ada-002)
2. Sending only 5 contextually relevant messages to the completion API instead of all messages
3. Selecting messages based on their contextual relevance rather than recency

## Fallback Mechanisms

The system includes fallback mechanisms:
- If the most recent message has no embeddings, it uses the 5 most recent messages
- If no messages have valid embeddings, it falls back to the 5 most recent messages
- If no messages exist, it returns generic greeting suggestions

## Configuration

In your `.env` file:

```
# Embedding Configuration
# Options: 'cosine', 'euclidean', 'dot-product'
SIMILARITY_ALGORITHM=dot-product
``` 