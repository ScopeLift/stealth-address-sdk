/**
 * Type for error constructors that can be used for validation errors.
 */
type ErrorConstructor = new (message: string) => Error;

/**
 * Validates a subgraph URL to ensure it's properly formatted.
 *
 * This is a shared utility function that can be used across different parts
 * of the SDK to ensure consistent URL validation.
 *
 * @param url - The URL to validate
 * @param ErrorClass - The error class to throw on validation failure
 * @throws {ErrorClass} If the URL is invalid
 */
export function validateSubgraphUrl(
  url: string,
  ErrorClass: ErrorConstructor
): void {
  if (!url || typeof url !== 'string') {
    throw new ErrorClass('subgraphUrl must be a non-empty string');
  }

  if (url.trim().length === 0) {
    throw new ErrorClass('subgraphUrl cannot be empty or whitespace');
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new ErrorClass('subgraphUrl must be a valid HTTP/HTTPS URL');
    }
  } catch {
    throw new ErrorClass('subgraphUrl must be a valid URL format');
  }
}
