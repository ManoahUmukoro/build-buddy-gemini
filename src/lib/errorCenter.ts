import { NetworkErrorType } from './networkErrorHandler';

export interface ErrorEntry {
  id: string;
  timestamp: string;
  type: NetworkErrorType;
  message: string;
  context?: string;
  suggestedFix: string;
}

const ERROR_STORAGE_KEY = 'lifeos_error_log';
const MAX_ERRORS = 20;

// Event listeners for error center updates
type ErrorCenterListener = (errors: ErrorEntry[]) => void;
const listeners: Set<ErrorCenterListener> = new Set();

function notifyListeners(errors: ErrorEntry[]) {
  listeners.forEach(listener => listener(errors));
}

export function subscribeToErrorCenter(listener: ErrorCenterListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSuggestedFix(type: NetworkErrorType): string {
  switch (type) {
    case 'offline':
      return 'Check your WiFi or mobile data connection, then try again.';
    case 'timeout':
      return 'The request took too long. Try again when you have a stable connection.';
    case 'auth_error':
      return 'Your session may have expired. Sign out and sign back in.';
    case 'server_error':
      return 'Our servers are temporarily unavailable. Please try again in a few minutes.';
    case 'validation_error':
      return 'Check your input and make sure all fields are correct.';
    default:
      return 'Try refreshing the page or contact support if the issue persists.';
  }
}

export function logError(
  type: NetworkErrorType,
  message: string,
  context?: string,
  customFix?: string
): ErrorEntry {
  const entry: ErrorEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type,
    message,
    context,
    suggestedFix: customFix || getSuggestedFix(type),
  };

  const errors = getRecentErrors();
  const updatedErrors = [entry, ...errors].slice(0, MAX_ERRORS);

  try {
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(updatedErrors));
  } catch (e) {
    console.warn('Failed to persist error log:', e);
  }

  notifyListeners(updatedErrors);
  return entry;
}

export function getRecentErrors(): ErrorEntry[] {
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ErrorEntry[];
  } catch {
    return [];
  }
}

export function clearErrors(): void {
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear error log:', e);
  }
  notifyListeners([]);
}

export function getErrorCount(): number {
  return getRecentErrors().length;
}

export function getLastNErrors(n: number): ErrorEntry[] {
  return getRecentErrors().slice(0, n);
}
