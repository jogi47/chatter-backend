import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import * as process from 'process';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// For OpenTelemetry debug logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Configuration from environment variables
const serviceName = process.env.SERVICE_NAME || 'chatter-backend';
const serviceVersion = process.env.APP_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'development';
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// Common service-related headers for exporters
const commonHeaders = {
  'service-name': serviceName,
  'service-version': serviceVersion,
  'deployment-environment': environment
};

// Define standard resource attributes
const resourceAttributesConfig = {
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
};

// Initialize the SDK with proper configuration
const sdk = new NodeSDK({
  // Trace exporter
  traceExporter: new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
    headers: commonHeaders
  }),
  
  // Metrics exporter
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${otelEndpoint}/v1/metrics`,
      headers: commonHeaders
    }),
    exportIntervalMillis: 15000, // report metrics every 15 seconds
  }),
  
  // Auto-instrumentation for common libraries
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { 
        enabled: true,
        // Add resource attributes to all spans
        applyCustomAttributesOnSpan: (span) => {
          Object.entries(resourceAttributesConfig).forEach(([key, value]) => {
            span.setAttribute(key, value);
          });
        }
      },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-winston': { enabled: true },
    }),
  ],
});

// Initialize OpenTelemetry
(async () => {
  try {
    await sdk.start();
    console.log('OpenTelemetry instrumentation started');
  } catch (error) {
    console.error('Error initializing OpenTelemetry', error);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK', error);
  } finally {
    process.exit(0);
  }
}); 