import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyError, MAX_INPUT_CHARS, precheckInput } from '../src/lib/gemini.js';

test('classifyError 401 -> BAD_KEY', () => {
  assert.equal(classifyError({ status: 401 }), 'BAD_KEY');
});

test('classifyError 403 -> BAD_KEY', () => {
  assert.equal(classifyError({ status: 403 }), 'BAD_KEY');
});

test('classifyError 429 -> RATE_LIMIT', () => {
  assert.equal(classifyError({ status: 429 }), 'RATE_LIMIT');
});

test('classifyError 500 -> SERVER', () => {
  assert.equal(classifyError({ status: 500 }), 'SERVER');
});

test('classifyError network error -> NETWORK', () => {
  assert.equal(classifyError({ networkError: true }), 'NETWORK');
});

test('classifyError unknown -> UNKNOWN', () => {
  assert.equal(classifyError({ status: 418 }), 'UNKNOWN');
});

test('precheckInput rejects empty', () => {
  assert.equal(precheckInput(''), 'TOO_SHORT');
  assert.equal(precheckInput('   '), 'TOO_SHORT');
});

test('precheckInput rejects too-long text', () => {
  const big = 'a'.repeat(MAX_INPUT_CHARS + 1);
  assert.equal(precheckInput(big), 'TOO_LONG');
});

test('precheckInput accepts normal text', () => {
  assert.equal(precheckInput('hello world'), null);
});
