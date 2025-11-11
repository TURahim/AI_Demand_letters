import config from '../../config';
import logger from '../../utils/logger';

// Sentry integration (stub for now)
let sentryEnabled = false;

/**
 * Initialize error reporting service
 */
export function initializeErrorReporting() {
  if (config.monitoring.sentryDsn) {
    try {
      // TODO: Initialize Sentry
      // const Sentry = require('@sentry/node');
      // Sentry.init({
      //   dsn: config.monitoring.sentryDsn,
      //   environment: config.monitoring.sentryEnvironment,
      //   tracesSampleRate: 1.0,
      // });
      
      sentryEnabled = true;
      logger.info('Error reporting initialized');
    } catch (error) {
      logger.error('Failed to initialize error reporting:', error);
    }
  } else {
    logger.info('Error reporting disabled (no Sentry DSN configured)');
  }
}

/**
 * Report error to monitoring service
 */
export function reportError(error: Error, context?: Record<string, any>) {
  // Log to console/file
  logger.error('Error reported:', {
    message: error.message,
    stack: error.stack,
    context,
  });

  // Send to Sentry if enabled
  if (sentryEnabled) {
    try {
      // TODO: Send to Sentry
      // const Sentry = require('@sentry/node');
      // Sentry.captureException(error, {
      //   extra: context,
      // });
    } catch (err) {
      logger.error('Failed to report error to Sentry:', err);
    }
  }
}

/**
 * Report message to monitoring service
 */
export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  logger.log(level, message, context);

  if (sentryEnabled) {
    try {
      // TODO: Send to Sentry
      // const Sentry = require('@sentry/node');
      // Sentry.captureMessage(message, {
      //   level,
      //   extra: context,
      // });
    } catch (err) {
      logger.error('Failed to report message to Sentry:', err);
    }
  }
}

/**
 * Set user context for error reporting
 */
export function setUserContext(_userId: string, _email?: string) {
  if (sentryEnabled) {
    try {
      // TODO: Set Sentry user context
      // const Sentry = require('@sentry/node');
      // Sentry.setUser({ id: userId, email });
    } catch (err) {
      logger.error('Failed to set user context:', err);
    }
  }
}

/**
 * Clear user context
 */
export function clearUserContext() {
  if (sentryEnabled) {
    try {
      // TODO: Clear Sentry user context
      // const Sentry = require('@sentry/node');
      // Sentry.setUser(null);
    } catch (err) {
      logger.error('Failed to clear user context:', err);
    }
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  _message: string,
  _category: string,
  _data?: Record<string, any>
) {
  if (sentryEnabled) {
    try {
      // TODO: Add Sentry breadcrumb
      // const Sentry = require('@sentry/node');
      // Sentry.addBreadcrumb({
      //   message,
      //   category,
      //   data,
      //   level: 'info',
      // });
    } catch (err) {
      logger.error('Failed to add breadcrumb:', err);
    }
  }
}

