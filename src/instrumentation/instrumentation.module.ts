import { Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TracingService } from './tracing';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    TracingService,
  ],
  exports: [TracingService]
})
export class InstrumentationModule implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(private readonly tracingService: TracingService) {}

  async onApplicationBootstrap() {
    await this.tracingService.start();
  }

  async onApplicationShutdown() {
    await this.tracingService.shutdown();
  }
} 