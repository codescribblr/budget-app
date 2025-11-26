import { toast } from 'sonner';

/**
 * Handles API errors and shows appropriate toast notifications
 * Specifically handles read-only access errors with a user-friendly message
 * 
 * @param response - The fetch Response object
 * @param defaultMessage - Default error message if response doesn't contain one
 * @returns The error message that was shown (or null if no error)
 */
export async function handleApiError(response: Response, defaultMessage: string = 'Operation failed'): Promise<string | null> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: defaultMessage }));
    const errorMessage = errorData.error || defaultMessage;

    // Check if this is a read-only access error
    if (response.status === 403 && (errorMessage.includes('read-only') || errorMessage.includes('Viewers can only view') || errorMessage.includes('do not have permission to modify'))) {
      toast.error('Read-only access', {
        description: 'You only have read access to this account. Contact the account owner to request edit permissions.',
        duration: 6000,
      });
      return errorMessage;
    }
    
    // Check if this is an owner/editor-only access error
    if (response.status === 403 && (errorMessage.includes('Only account owners and editors') || errorMessage.includes('owners and editors can'))) {
      toast.error('Write access required', {
        description: errorMessage.includes('Unauthorized:') ? errorMessage.replace('Unauthorized: ', '') : errorMessage,
        duration: 6000,
      });
      return errorMessage;
    }
    
    // Check if this is an owner-only access error (for actions that truly require owner)
    if (response.status === 403 && (errorMessage.includes('Only account owners') || (errorMessage.includes('account owner') && !errorMessage.includes('editors')))) {
      toast.error('Owner access required', {
        description: errorMessage.includes('Unauthorized:') ? errorMessage.replace('Unauthorized: ', '') : errorMessage,
        duration: 6000,
      });
      return errorMessage;
    }
    
    // Show generic error toast
    toast.error(errorMessage, {
      duration: 5000,
    });
    return errorMessage;
  }
  return null;
}

/**
 * Checks if a response indicates a read-only access error
 */
export function isReadOnlyError(response: Response, errorMessage: string): boolean {
  return response.status === 403 && (
    errorMessage.includes('read-only') || 
    errorMessage.includes('Viewers can only view') || 
    errorMessage.includes('do not have permission to modify')
  );
}

/**
 * Shows a read-only access toast notification
 */
export function showReadOnlyToast(): void {
  toast.error('Read-only access', {
    description: 'You only have read access to this account. Contact the account owner to request edit permissions.',
    duration: 6000,
  });
}

