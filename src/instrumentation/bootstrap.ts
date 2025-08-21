// This file should be imported before any other imports
// to ensure OpenTelemetry instruments all modules
import { startOpenTelemetry } from './opentelemetry-manual';

// Start OpenTelemetry
(async () => {
  try {
    await startOpenTelemetry();
    console.log('OpenTelemetry instrumentation started');
  } catch (error) {
    console.error('Error initializing OpenTelemetry', error);
  }
})(); 