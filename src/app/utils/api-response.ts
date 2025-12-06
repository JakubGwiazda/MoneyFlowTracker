/**
 * Utility functions for consistent API responses
 */

export interface ApiError {
  code: string;
  message: string;
  errors?: any[];
}

/**
 * Creates a standardized JSON response
 */
export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a standardized error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  errors?: any[]
): Response {
  const errorData: ApiError = { code, message };
  if (errors) {
    errorData.errors = errors;
  }

  return jsonResponse(errorData, status);
}

/**
 * Common error responses
 */
export const ApiResponses = {
  unauthorized: () => errorResponse('UNAUTHORIZED', 'Authentication required', 401),

  forbidden: (message: string = 'Access forbidden') => errorResponse('FORBIDDEN', message, 403),

  notFound: (resource: string = 'Resource') =>
    errorResponse('NOT_FOUND', `${resource} not found`, 404),

  validationError: (message: string, errors?: any[]) =>
    errorResponse('VALIDATION_ERROR', message, 400, errors),

  serverError: (message: string = 'Internal server error') =>
    errorResponse('SERVER_ERROR', message, 500),

  invalidJson: () => errorResponse('VALIDATION_ERROR', 'Invalid JSON in request body', 400),

  databaseError: () => errorResponse('SERVER_ERROR', 'Database connection not available', 500),
};
