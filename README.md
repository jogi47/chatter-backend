# NestJS Chat Application

A real-time group chat application built with NestJS, MongoDB, Socket.IO, and AWS S3. This application provides secure group chat functionality with features like user authentication, file sharing, and real-time typing indicators.

## Features

- 🔐 JWT-based Authentication
- 👥 Group Chat Management
- 📁 File Sharing (Images)
- ⚡ Real-time Communication
- ✍️ Typing Indicators
- 📝 Message Management
- 🖼️ Profile & Group Images
- 📚 Swagger API Documentation
- 🧠 Embeddings for RAG (Retrieval-Augmented Generation)
- 💬 AI-Powered Smart Replies

## Tech Stack

- **Framework**: NestJS
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **File Storage**: AWS S3
- **Authentication**: JWT, Passport
- **API Documentation**: Swagger
- **Process Manager**: PM2
- **Containerization**: Docker
- **AI Integration**: LangChain, OpenAI (embeddings & completions)

## Prerequisites

- Node.js (v18 or later)
- MongoDB
- AWS Account (for S3)
- OpenAI API Key
- Docker (optional)
- PM2 (optional)

## Environment Setup

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/chat_app
MONGODB_USER=your_mongodb_user
MONGODB_PASSWORD=your_mongodb_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

## Installation

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm run start:dev
```

## RAG (Retrieval-Augmented Generation) Features

This application includes vector embeddings generation for chat messages to enable AI-powered features:

- All text messages are automatically embedded using OpenAI's embedding models
- Embeddings are stored with the messages in MongoDB
- This enables future features like semantic search, smart replies, and summarization
- Image captions can also be embedded for searchability

The embedding generation happens automatically:
- When sending a message via REST API
- When sending a message via WebSocket
- For both text messages and image captions

These embeddings enable future AI features without requiring access to the entire message history.

## Smart Reply Feature

The application offers AI-generated smart reply suggestions for group chats:

- Get contextually relevant reply suggestions with a single API call
- Suggestions are generated based on recent message history
- Uses OpenAI's GPT-3.5-Turbo for efficient and cost-effective generation
- Each request returns 3 suggested replies tailored to the conversation
- Client applications can display these as quick-reply options

To use this feature, make a POST request to `/api/messages/smart-replies` with the following body:

```json
{
  "group_id": "your_group_id"
}
```

The response will contain an array of suggested replies:

```json
{
  "suggestions": [
    "That sounds great!",
    "When do you want to meet?",
    "I'll be there."
  ]
}
```