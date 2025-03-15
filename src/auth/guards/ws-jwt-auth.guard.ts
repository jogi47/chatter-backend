import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class WsJwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private jwtService: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Add websocket context support
    if (context.getType() !== 'ws') {
      return super.canActivate(context);
    }

    const client = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized access');
    }

    try {
      const payload = this.jwtService.verify(token);
      // Attach user to client
      client.user = payload;
      return true;
    } catch (err) {
      throw new WsException('Invalid token');
    }
  }

  private extractToken(client: any): string | null {
    // Try to get token from handshake auth
    const auth = client.handshake?.auth?.token;
    if (auth) {
      const [type, token] = auth.split(' ');
      return type === 'Bearer' ? token : null;
    }

    // Try to get token from handshake headers
    const authHeader = client.handshake?.headers?.auth;
    if (authHeader) {
      try {
        const parsed = JSON.parse(authHeader as string);
        return parsed.token;
      } catch (e) {
        return null;
      }
    }

    return null;
  }
} 