import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { Server, ServerOptions } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as passport from 'passport';

export class WebsocketAdapter extends IoAdapter {
  private readonly configService: ConfigService;

  constructor(private app: INestApplicationContext) {
    super(app);
    this.configService = app.get(ConfigService);
    this.initializePassport();
  }

  private initializePassport() {
    passport.use(
      new Strategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          secretOrKey: this.configService.get<string>('JWT_SECRET'),
        },
        async (payload: any, done) => {
          try {
            // Passport verify callback
            return done(null, payload);
          } catch (error) {
            return done(error, false);
          }
        },
      ),
    );
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server: Server = super.createIOServer(port, options);

    server.use(async (socket: any, next) => {
      try {
        const token = this.extractToken(socket);

        if (!token) {
          return next(new Error('Authentication error: Token not found'));
        }

        // Use passport to authenticate
        passport.authenticate('jwt', { session: false }, (err, user, info) => {
          if (err || !user) {
            return next(new Error('Authentication error: Invalid token'));
          }
          socket.user = user;
          next();
        })(
          { headers: { authorization: `Bearer ${token}` } }, // Mock request object
          {}, // Mock response object
          next
        );
      } catch (error) {
        next(new Error('Authentication error: ' + error.message));
      }
    });

    return server;
  }

  private extractToken(socket: any): string | null {
    // Try to get token from handshake auth
    const auth = socket.handshake?.headers?.auth;
    if (auth) {
      const [type, token] = auth.split(' ');
      return type === 'Bearer' ? token : null;
    }
    return null;
  }
} 