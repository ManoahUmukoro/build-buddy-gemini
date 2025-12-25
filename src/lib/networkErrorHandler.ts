import { toast } from 'sonner';

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
}

/**
 * Determines the type and message for a network error
 */
export function parseNetworkError(error: unknown): NetworkErrorInfo {
  // Check if offline
  if (!navigator.onLine) {
    return {
      type: 'offline',
      message: 'You appear to be offline. Please check your internet connection.',
      retry: true,
    };
  }

  // Handle TypeError (usually network failures)
  if (error instanceof TypeError) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        type: 'offline',
        message: 'Network error. Please check your connection and try again.',
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
        message: 'Request timed out. Please try again.',
        retry: true,
      };
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'auth_error',
        message: 'Session expired. Please sign in again.',
        retry: false,
      };
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return {
        type: 'auth_error',
        message: 'You do not have permission to perform this action.',
        retry: false,
      };
    }

    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
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
        message: String(err.message || 'Server error. Please try again.'),
        retry: true,
      };
    }

    // Check for status codes
    if (typeof err.status === 'number') {
      if (err.status === 401 || err.status === 403) {
        return {
          type: 'auth_error',
          message: String(err.message || 'Authentication required.'),
          retry: false,
        };
      }
      if (err.status >= 500) {
        return {
          type: 'server_error',
          message: 'Server error. Please try again later.',
          retry: true,
        };
      }
      if (err.status >= 400) {
        return {
          type: 'validation_error',
          message: String(err.message || 'Invalid request.'),
          retry: false,
        };
      }
    }

    if (err.message) {
      return {
        type: 'unknown',
        message: String(err.message),
        retry: true,
      };
    }
  }

  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    retry: true,
  };
}

/**
 * Shows a toast notification for network errors with appropriate styling
 */
export function showNetworkError(error: unknown, context?: string) {
  const errorInfo = parseNetworkError(error);
  
  const prefix = context ? `${context}: ` : '';
  
  switch (errorInfo.type) {
    case 'offline':
      toast.error(`${prefix}${errorInfo.message}`, {
        icon: '📡',
        duration: 5000,
      });
      break;
    case 'timeout':
      toast.error(`${prefix}${errorInfo.message}`, {
        icon: '⏱️',
        duration: 4000,
      });
      break;
    case 'auth_error':
      toast.error(`${prefix}${errorInfo.message}`, {
        icon: '🔒',
        duration: 4000,
      });
      break;
    case 'server_error':
      toast.error(`${prefix}${errorInfo.message}`, {
        icon: '🔧',
        duration: 4000,
      });
      break;
    default:
      toast.error(`${prefix}${errorInfo.message}`, {
        duration: 4000,
      });
  }
  
  return errorInfo;
}

/**
 * Wrapper for async operations with network error handling
 */
export async function withNetworkErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    showNetworkError(error, context);
    return null;
  }
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
