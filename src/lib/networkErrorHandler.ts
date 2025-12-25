import { toast } from 'sonner';
import { logError } from './errorCenter';

export type NetworkErrorType =
  | 'offline'
  | 'timeout'
  | 'server_error'
  | 'auth_error'
  | 'validation_error'
  | 'unknown';

interface NetworkErrorInfo {
  type: NetworkErrorType;
  message: string;
  retry?: boolean;
  userAction?: string;
}

/**
 * Determines the type and message for a network error
 */
export function parseNetworkError(error: unknown): NetworkErrorInfo {
  // Check if offline
  if (!navigator.onLine) {
    return {
      type: 'offline',
      message: 'You appear to be offline.',
      userAction: 'Please check your internet connection and try again.',
      retry: true,
    };
  }

  // Handle TypeError (usually network failures)
  if (error instanceof TypeError) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        type: 'offline',
        message: 'Network error occurred.',
        userAction: 'Please check your connection and tap retry.',
        retry: true,
      };
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'timeout',
        message: 'Request timed out.',
        userAction: 'The server took too long to respond. Please try again.',
        retry: true,
      };
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'auth_error',
        message: 'Session expired.',
        userAction: 'Please sign in again to continue.',
        retry: false,
      };
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return {
        type: 'auth_error',
        message: 'Access denied.',
        userAction: 'You do not have permission to perform this action.',
        retry: false,
      };
    }

    if (message.includes('not configured') || message.includes('not enabled')) {
      return {
        type: 'validation_error',
        message: 'Feature not configured.',
        userAction: 'This feature requires setup. Please contact support.',
        retry: false,
      };
    }

    if (message.includes('api key') || message.includes('apikey')) {
      return {
        type: 'validation_error',
        message: 'API key required.',
        userAction: 'Please add your API key in Settings → Data Vault.',
        retry: false,
      };
    }

    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      userAction: 'Please try again or contact support if the issue persists.',
      retry: true,
    };
  }

  // Handle objects with error properties
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Supabase FunctionsHttpError
    if (err.name === 'FunctionsHttpError') {
      return {
        type: 'server_error',
        message: String(err.message || 'Server error.'),
        userAction: 'Our servers are having issues. Please try again shortly.',
        retry: true,
      };
    }

    // Check for status codes
    if (typeof err.status === 'number') {
      if (err.status === 401 || err.status === 403) {
        return {
          type: 'auth_error',
          message: String(err.message || 'Authentication required.'),
          userAction: 'Please sign in to continue.',
          retry: false,
        };
      }
      if (err.status >= 500) {
        return {
          type: 'server_error',
          message: 'Server error.',
          userAction: 'Our servers are temporarily unavailable. Please try again later.',
          retry: true,
        };
      }
      if (err.status >= 400) {
        return {
          type: 'validation_error',
          message: String(err.message || 'Invalid request.'),
          userAction: 'Please check your input and try again.',
          retry: false,
        };
      }
    }

    if (err.message) {
      return {
        type: 'unknown',
        message: String(err.message),
        userAction: 'Please try again or contact support.',
        retry: true,
      };
    }
  }

  return {
    type: 'unknown',
    message: 'An unexpected error occurred.',
    userAction: 'Please try again or contact support.',
    retry: true,
  };
}

/**
 * Shows a toast notification for network errors with retry support
 */
export function showNetworkError(
  error: unknown, 
  context?: string,
  onRetry?: () => void
) {
  const errorInfo = parseNetworkError(error);
  
  // Log to Error Center
  logError(errorInfo.type, errorInfo.message, context, errorInfo.userAction);
  
  const prefix = context ? `${context}: ` : '';
  const fullMessage = errorInfo.userAction 
    ? `${errorInfo.message} ${errorInfo.userAction}`
    : errorInfo.message;
  
  const toastOptions: Parameters<typeof toast.error>[1] = {
    duration: errorInfo.retry ? 8000 : 5000,
    description: errorInfo.userAction,
  };

  // Add retry action if applicable
  if (errorInfo.retry && onRetry) {
    toastOptions.action = {
      label: 'Retry',
      onClick: onRetry,
    };
  }
  
  switch (errorInfo.type) {
    case 'offline':
      toast.error(`${prefix}${errorInfo.message}`, {
        ...toastOptions,
        icon: '📡',
      });
      break;
    case 'timeout':
      toast.error(`${prefix}${errorInfo.message}`, {
        ...toastOptions,
        icon: '⏱️',
      });
      break;
    case 'auth_error':
      toast.error(`${prefix}${errorInfo.message}`, {
        ...toastOptions,
        icon: '🔒',
      });
      break;
    case 'server_error':
      toast.error(`${prefix}${errorInfo.message}`, {
        ...toastOptions,
        icon: '🔧',
      });
      break;
    case 'validation_error':
      toast.warning(`${prefix}${errorInfo.message}`, {
        ...toastOptions,
        icon: '⚙️',
      });
      break;
    default:
      toast.error(`${prefix}${errorInfo.message}`, toastOptions);
  }
  
  return errorInfo;
}

/**
 * Wrapper for async operations with network error handling and retry support
 */
export async function withNetworkErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  enableRetry: boolean = true
): Promise<{ data: T | null; retry: () => Promise<T | null> }> {
  const execute = async (): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      showNetworkError(error, context, enableRetry ? execute : undefined);
      return null;
    }
  };
  
  const data = await execute();
  return { data, retry: execute };
}

/**
 * Extract error message from Supabase function response
 */
export async function extractEdgeFunctionError(error: unknown): Promise<string> {
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Try to get context.json() for FunctionsHttpError
    if (err.context && typeof (err.context as Record<string, unknown>).json === 'function') {
      try {
        const body = await (err.context as { json: () => Promise<Record<string, unknown>> }).json();
        if (body.error) {
          return String(body.error);
        }
      } catch {
        // Fall through to other methods
      }
    }
    
    if (err.message) {
      return String(err.message);
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Get user-friendly error message based on error type
 */
export function getErrorGuidance(errorType: NetworkErrorType): string {
  switch (errorType) {
    case 'offline':
      return 'Check your WiFi or mobile data connection.';
    case 'timeout':
      return 'The request took too long. This might be due to slow internet.';
    case 'auth_error':
      return 'Your session has expired. Please sign in again.';
    case 'server_error':
      return 'Our servers are having issues. Try again in a few minutes.';
    case 'validation_error':
      return 'There was a problem with your request. Please check and try again.';
    default:
      return 'Something went wrong. Please try again or contact support.';
  }
}
