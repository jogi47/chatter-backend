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
- 📊 OpenAI API Usage Tracking
- 📈 Observability (Traces, Metrics, Logs)

## Tech Stack

- **Framework**: NestJS
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **File Storage**: AWS S3
- **Authentication**: JWT, Passport
- **API Documentation**: Swagger
- **Process Manager**: PM2
- **Containerization**: Docker
- **AI Integration**: 
  - LangChain
  - OpenAI
    - GPT-3.5-Turbo for completions
    - text-embedding-3-large for embeddings (256 dimensions)
- **Observability**:
  - OpenTelemetry for instrumentation
  - Jaeger for distributed tracing
  - Prometheus for metrics
  - Loki for log aggregation
  - Grafana for dashboards

## Prerequisites

- Node.js (v18 or later)
- MongoDB
- AWS Account (for S3)
- OpenAI API Key and Organization ID
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
OPENAI_ORG_ID=your_openai_org_id

# Application Configuration
NODE_ENV=development
APP_VERSION=1.0.0
SERVICE_NAME=chatter-backend

# Embedding Configuration
# Options: 'cosine', 'euclidean', 'dot-product'
SIMILARITY_ALGORITHM=dot-product

# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_LOG_LEVEL=info
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

## Observability Setup

This application includes comprehensive observability using OpenTelemetry, which provides:

- **Distributed Tracing**: Track requests across services
- **Metrics**: Monitor application performance
- **Logs**: Centralize and analyze logs

### Starting the Observability Stack

The project includes a Docker Compose file with all necessary components:

```bash
# Start the observability stack
docker-compose -f docker-compose-observability.yml up -d
```

This will start:
- **OpenTelemetry Collector**: Receives telemetry data from the application
- **Jaeger**: For visualizing distributed traces
- **Prometheus**: For storing and querying metrics
- **Loki**: For log aggregation
- **Grafana**: For dashboards combining traces, metrics, and logs

### Accessing the Dashboards

- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

### Configuration Files

- `otel-collector-config.yaml`: Configuration for the OpenTelemetry Collector
- `prometheus.yml`: Prometheus configuration
- `loki-config.yaml`: Loki configuration
- `grafana/provisioning/datasources`: Grafana datasource configuration

## RAG (Retrieval-Augmented Generation) Features

This application includes vector embeddings generation for chat messages to enable AI-powered features:

- All text messages are automatically embedded using OpenAI's text-embedding-3-large model
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

### Smart Reply Implementation Details

1. **Message Selection**:
   - Uses embeddings to find the 5 most contextually relevant messages
   - Supports multiple similarity algorithms (configurable via SIMILARITY_ALGORITHM)
   - Falls back to recent messages if embeddings are unavailable

2. **OpenAI Integration**:
   - Uses GPT-3.5-Turbo for cost-effective completions
   - Includes user context and conversation history
   - Generates natural, contextually appropriate responses
   - Limited to 150 characters per suggestion

3. **Request Tracking**:
   - All OpenAI API calls are tracked in the OpenAI dashboard
   - Requests are tagged with:
     - User identifier (username_feature_environment)
     - Application name and version
     - Environment (development/production)
   - Enables monitoring of API usage and costs

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
    "That's a great point!",
    "I agree with your approach.",
    "Let's discuss this further."
  ]
}
```

## API Documentation

API documentation is available via Swagger UI at `/api/docs` when running in development mode.