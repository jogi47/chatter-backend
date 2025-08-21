import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import * as process from 'process';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// For OpenTelemetry debug logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Configuration from environment variables with defaults
const serviceName = process.env.SERVICE_NAME || 'chatter-backend';
const serviceVersion = process.env.APP_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'development';
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// Common headers that identify the service
const commonHeaders = {
  'service-name': serviceName,
  'service-version': serviceVersion,
  'deployment-environment': environment
};

// Create the OpenTelemetry SDK
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
    exportIntervalMillis: 15000,
  }),
  
  // Auto-instrument common libraries
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-winston': { enabled: true },
    }),
  ],
});

// Initialize OpenTelemetry before any other imports
export function startOpenTelemetry() {
  return sdk.start();
}

// Cleanup function for graceful shutdown
export function shutdownOpenTelemetry() {
  return sdk.shutdown();
}

// Register shutdown handler
process.on('SIGTERM', () => {
  shutdownOpenTelemetry()
    .then(() => console.log('OpenTelemetry SDK shut down'))
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
}); 