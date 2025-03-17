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

## Tech Stack

- **Framework**: NestJS
- **Database**: MongoDB
- **Real-time Communication**: Socket.IO
- **File Storage**: AWS S3
- **Authentication**: JWT, Passport
- **API Documentation**: Swagger
- **Process Manager**: PM2
- **Containerization**: Docker

## Prerequisites

- Node.js (v18 or later)
- MongoDB
- AWS Account (for S3)
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