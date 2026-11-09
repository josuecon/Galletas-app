/**
 * Sanitizes an object or array by removing all properties whose value is strictly `undefined`.
 * Preserves all valid falsy and boundary values:
 * - `0` and negative numbers
 * - `false`
 * - `""` (empty strings)
 * - `null`
 * - Dates and primitives
 *
 * Recursively cleans nested objects and arrays of objects (e.g. `installments`).
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as T;
  }

  return data;
}
