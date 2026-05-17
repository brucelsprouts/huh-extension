import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, SYSTEM_PROMPT } from '../src/lib/prompts.js';

test('buildPrompt at level 1 returns system prompt + text', () => {
  const out = buildPrompt('photosynthesis', 1);
  assert.equal(out.system, SYSTEM_PROMPT);
  assert.match(out.user, /photosynthesis/);
});

test('buildPrompt at level >= 2 includes simpler instruction with level number', () => {
  const out = buildPrompt('photosynthesis', 3);
  assert.match(out.system, /level 3/);
  assert.match(out.system, /level 2/);
  assert.match(out.user, /photosynthesis/);
});

test('buildPrompt throws on empty text', () => {
  assert.throws(() => buildPrompt('', 1), /empty/i);
  assert.throws(() => buildPrompt('   ', 1), /empty/i);
});

test('buildPrompt throws on invalid level', () => {
  assert.throws(() => buildPrompt('x', 0), /level/i);
  assert.throws(() => buildPrompt('x', -1), /level/i);
});
