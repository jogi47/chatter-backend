import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConfigService } from '@nestjs/config';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { Injectable } from '@nestjs/common';

// For troubleshooting OpenTelemetry issues
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

@Injectable()
export class TracingService {
  private sdk: NodeSDK;

  constructor(private readonly configService: ConfigService) {
    // Get service information
    const serviceName = this.configService.get<string>('SERVICE_NAME') || 'chatter-backend';
    const environment = this.configService.get<string>('NODE_ENV') || 'development';
    const serviceVersion = this.configService.get<string>('APP_VERSION') || '1.0.0';

    // Get collector endpoint from environment or use default
    const otelCollectorUrl = this.configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT') || 'http://localhost:4318';
    
    // Common headers for service identification
    const headers = {
      'service-name': serviceName,
      'service-version': serviceVersion,
      'deployment-environment': environment
    };

    // Initialize the OpenTelemetry SDK
    this.sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: `${otelCollectorUrl}/v1/traces`,
        headers
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${otelCollectorUrl}/v1/metrics`,
          headers
        }),
        exportIntervalMillis: 15000, // Export metrics every 15 seconds
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Enable specific instrumentations
          '@opentelemetry/instrumentation-http': { 
            enabled: true,
            // Add attributes to all spans
            applyCustomAttributesOnSpan: (span) => {
              span.setAttribute(SemanticResourceAttributes.SERVICE_NAME, serviceName);
              span.setAttribute(SemanticResourceAttributes.SERVICE_VERSION, serviceVersion);
              span.setAttribute(SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT, environment);
            }
          },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
          '@opentelemetry/instrumentation-mongodb': { enabled: true },
          '@opentelemetry/instrumentation-winston': { enabled: true },
        }),
      ],
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize the SDK and register with the OpenTelemetry API
      await this.sdk.start();
      console.log('OpenTelemetry instrumentation started');
    } catch (error) {
      console.error('Error initializing OpenTelemetry', error);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.sdk.shutdown();
      console.log('OpenTelemetry instrumentation stopped');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry', error);
    }
  }
} 