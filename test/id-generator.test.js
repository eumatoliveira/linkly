/**
 * Base62 ID Generator Tests
 * 
 * Tests for bidirectional conversion and edge cases
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { idToBase62, base62ToId, estimateLength, getCapacity } from '../src/lib/id-generator.js';

test('Base62 - converts 0 correctly', () => {
  const result = idToBase62(0);
  assert.strictEqual(result, '0');
});

test('Base62 - converts small numbers', () => {
  assert.strictEqual(idToBase62(1), '1');
  assert.strictEqual(idToBase62(9), '9');
  assert.strictEqual(idToBase62(10), 'a');
  assert.strictEqual(idToBase62(35), 'z');
  assert.strictEqual(idToBase62(36), 'A');
  assert.strictEqual(idToBase62(61), 'Z');
  assert.strictEqual(idToBase62(62), '10');
});

test('Base62 - converts large numbers', () => {
  const result = idToBase62(1000000);
  assert.strictEqual(typeof result, 'string');
  assert.strictEqual(result.length, 4); // 1M should be 4 chars
});

test('Base62 - roundtrip conversion', () => {
  const testCases = [0, 1, 62, 100, 1000, 999999, 1234567890];
  
  for (const id of testCases) {
    const base62 = idToBase62(id);
    const decoded = base62ToId(base62);
    assert.strictEqual(decoded, id, `Roundtrip failed for ${id}`);
  }
});

test('Base62 - only uses valid characters', () => {
  const validChars = /^[0-9a-zA-Z]+$/;
  
  for (let i = 0; i < 10000; i += 123) {
    const result = idToBase62(i);
    assert.match(result, validChars, `Invalid characters in ${result}`);
  }
});

test('Base62 - sequential IDs produce unique codes', () => {
  const codes = new Set();
  
  for (let i = 0; i < 1000; i++) {
    const code = idToBase62(i);
    assert.strictEqual(codes.has(code), false, `Collision detected at ${i}: ${code}`);
    codes.add(code);
  }
  
  assert.strictEqual(codes.size, 1000);
});

test('Base62ToId - decodes correctly', () => {
  assert.strictEqual(base62ToId('0'), 0);
  assert.strictEqual(base62ToId('1'), 1);
  assert.strictEqual(base62ToId('a'), 10);
  assert.strictEqual(base62ToId('Z'), 61);
  assert.strictEqual(base62ToId('10'), 62);
});

test('Base62ToId - throws on invalid input', () => {
  assert.throws(() => base62ToId(''), /non-empty string/);
  assert.throws(() => base62ToId(123), /non-empty string/);
  assert.throws(() => base62ToId('abc!'), /Invalid Base62 character/);
  assert.throws(() => base62ToId('hello world'), /Invalid Base62 character/);
});

test('idToBase62 - throws on invalid input', () => {
  assert.throws(() => idToBase62(-1), /positive integer/);
  assert.throws(() => idToBase62(1.5), /positive integer/);
  assert.throws(() => idToBase62('123'), /positive integer/);
});

test('estimateLength - calculates correctly', () => {
  assert.strictEqual(estimateLength(1), 1);
  assert.strictEqual(estimateLength(62), 1);
  assert.strictEqual(estimateLength(100), 2);
  assert.strictEqual(estimateLength(1000000), 4);
});

test('getCapacity - calculates correctly', () => {
  assert.strictEqual(getCapacity(1), 62);
  assert.strictEqual(getCapacity(2), 3844);
  assert.strictEqual(getCapacity(3), 238328);
  assert.strictEqual(getCapacity(6), 56800235584);
});

test('Performance - handles large batch conversion', () => {
  const start = Date.now();
  
  for (let i = 0; i < 10000; i++) {
    idToBase62(i);
  }
  
  const duration = Date.now() - start;
  assert.ok(duration < 100, `Too slow: ${duration}ms for 10k conversions`);
});
