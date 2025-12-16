/**
 * Base62 ID Generator
 * 
 * Converts numeric IDs to Base62 strings for URL-friendly short codes.
 * 
 * Why Base62?
 * - URL safe (no special characters)
 * - Zero collisions (uses sequential IDs)
 * - Predictable growth (vs unpredictable hash)
 * - Compact representation
 * 
 * Capacity:
 * - 3 chars: 238,328 URLs
 * - 4 chars: 14,776,336 URLs
 * - 5 chars: 916,132,832 URLs
 * - 6 chars: 56,800,235,584 URLs
 * - 7 chars: 3,521,614,606,208 URLs
 */

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = 62;

/**
 * Converts a numeric ID to Base62 string
 * @param {number} id - Numeric ID (must be positive integer)
 * @returns {string} Base62 encoded string
 */
export function idToBase62(id) {
  if (!Number.isInteger(id) || id < 0) {
    throw new Error('ID must be a positive integer');
  }
  
  if (id === 0) {
    return BASE62_ALPHABET[0];
  }
  
  let result = '';
  let num = id;
  
  while (num > 0) {
    result = BASE62_ALPHABET[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  
  return result;
}

/**
 * Converts a Base62 string back to numeric ID
 * @param {string} str - Base62 encoded string
 * @returns {number} Numeric ID
 */
export function base62ToId(str) {
  if (typeof str !== 'string' || str.length === 0) {
    throw new Error('Input must be a non-empty string');
  }
  
  // Validate characters
  for (let char of str) {
    if (!BASE62_ALPHABET.includes(char)) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
  }
  
  let result = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE62_ALPHABET.indexOf(char);
    result = result * BASE + value;
  }
  
  return result;
}

/**
 * Estimates the number of characters needed for a given number of URLs
 * @param {number} urlCount - Expected number of URLs
 * @returns {number} Recommended character length
 */
export function estimateLength(urlCount) {
  if (urlCount <= 0) return 1;
  return Math.max(1, Math.ceil(Math.log(urlCount) / Math.log(BASE)));
}

/**
 * Gets the maximum number of URLs for a given character length
 * @param {number} length - Character length
 * @returns {number} Maximum number of URLs
 */
export function getCapacity(length) {
  return Math.pow(BASE, length);
}
