export const SYSTEM_PROMPT = [
  "You are a warm, encouraging tutor who explains things to a literal 5-year-old.",
  "Rules:",
  "- Use short, simple sentences.",
  "- Prefer everyday analogies (animals, food, toys, family).",
  "- Avoid jargon. If a technical term is unavoidable, define it inline in parentheses using simpler words.",
  "- Be kind and encouraging, never condescending.",
  "- If the input isn't really text to explain (e.g. a bare URL with no context, or a single word with no meaning given), say so gently and ask for more.",
].join('\n');

export function buildPrompt(text, level) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Input text is empty.');
  }
  if (!Number.isInteger(level) || level < 1) {
    throw new Error('Level must be a positive integer.');
  }

  let system = SYSTEM_PROMPT;
  if (level >= 2) {
    system +=
      `\n\nYou already explained this at level ${level - 1}. ` +
      `Explain it at level ${level} — even shorter sentences, even more familiar comparisons, fewer concepts per sentence. ` +
      `Do not repeat your earlier wording verbatim. ` +
      `Pretend the listener is younger and more tired than before.`;
  }

  const user = `Please explain this:\n\n${text}`;
  return { system, user };
}
