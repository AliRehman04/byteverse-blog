export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq turns retired model ids off with a 404 (llama-3.3-70b-versatile stopped on 16 Aug 2026), so every AI route reads the id from here.
export const GROQ_MODEL = "openai/gpt-oss-120b";
export const GROQ_MODEL_LABEL = "GPT-OSS 120B";

// gpt-oss reasons before it answers and those tokens count toward max_completion_tokens; keep the reasoning short and out of the reply.
export function groqModelOptions(model: string) {
  return model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {};
}

// gpt-oss writes look-alike characters (U+2011 hyphens, U+202F and U+00A0 spaces, zero-width marks) that break copy-paste, search and ATS keyword matching.
export function toPlainText(text: string) {
  return text
    .replace(/(\d)[\u00A0\u202F]%/g, "$1%")
    .replace(/[\u2010\u2011]/g, "-")
    .replace(/[\u00A0\u2007\u2009\u200A\u202F]/g, " ")
    .replace(/[\u200B\u2060\uFEFF]/g, "");
}
