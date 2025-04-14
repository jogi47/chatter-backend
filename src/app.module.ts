import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HomeModule } from './home/home.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import databaseConfig from './config/database.config';
import loggerConfig from './config/logger.config';
import { CommonModule } from './common/common.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { GroupModule } from './group/group.module';
import { MessageModule } from './message/message.module';
import { HealthModule } from './health/health.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { SampleModule } from './sample/sample.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true, // Enable playground for testing
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, loggerConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        user: configService.get<string>('database.user'),
        pass: configService.get<string>('database.password'),
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    HomeModule,
    ChatModule,
    AuthModule,
    GroupModule,
    MessageModule,
    HealthModule,
    SampleModule, // Add the SampleModule here
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
