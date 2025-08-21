// Import OpenTelemetry bootstrap before any other imports
import './instrumentation/bootstrap';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { WebsocketAdapter } from './chat/websocket.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Use custom WebSocket adapter
  app.useWebSocketAdapter(new WebsocketAdapter(app));
  
  // Enable CORS
  app.enableCors();
  
  // Set up global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  
  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('NestJS API Documentation')
    .setVersion('1.0')
    .addTag('api/swagger')
    // Add security definition
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for references
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Add custom JS to enhance Swagger UI
  const customJs = `
    window.onload = function() {
      const loginBtn = document.createElement('button');
      loginBtn.innerHTML = 'Quick Login';
      loginBtn.style = 'margin-right: 10px; background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;';
      loginBtn.onclick = async function() {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123'
            })
          });
          const data = await response.json();
          if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            const authBtn = document.querySelector('.btn.authorize');
            if (authBtn) {
              authBtn.click();
              setTimeout(() => {
                const tokenInput = document.querySelector('input[type="text"]');
                if (tokenInput) {
                  tokenInput.value = data.access_token;
                  const authorizeBtn = document.querySelector('.btn.modal-btn.auth.authorize.button');
                  if (authorizeBtn) {
                    authorizeBtn.click();
                    const closeBtn = document.querySelector('.btn.modal-btn.auth.btn-done.button');
                    if (closeBtn) {
                      closeBtn.click();
                    }
                  }
                }
              }, 50);
            }
          }
        } catch (error) {
          console.error('Login failed:', error);
        }
      };

      const logoutBtn = document.createElement('button');
      logoutBtn.innerHTML = 'Logout';
      logoutBtn.style = 'background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;';
      logoutBtn.onclick = function() {
        localStorage.removeItem('access_token');
        const authBtn = document.querySelector('.btn.authorize');
        if (authBtn) {
          authBtn.click();
          setTimeout(() => {
            const logoutBtn = document.querySelector('.btn.modal-btn.auth.authorize.button');
            if (logoutBtn) {
              logoutBtn.click();
              const closeBtn = document.querySelector('.btn.modal-btn.auth.btn-done.button');
              if (closeBtn) {
                closeBtn.click();
              }
            }
          }, 50);
        }
      };

      // Insert the buttons into the Swagger UI
      const topbarEl = document.querySelector('.topbar');
      if (topbarEl) {
        topbarEl.appendChild(loginBtn);
        topbarEl.appendChild(logoutBtn);
      }
    }
  `;

  SwaggerModule.setup('api/swagger', app, document, {
    customJs: customJs,
    customSiteTitle: 'API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  
  await app.listen(3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap(); 