import "server-only";

export interface ClassificationResult {
  valence: number;
  arousal: number;
  categories: { id: string; confidence: number }[];
  rationale: string;
}

export class ClassifierError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "ClassifierError";
    this.status = status;
  }
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_DEFAULT_MODEL = "deepseek-chat";

/**
 * Resolves the API key, base URL and model from the environment.
 *
 * Works with any OpenAI-compatible provider. Prefer the generic
 * `CLASSIFIER_API_KEY`; fall back to `OPENAI_API_KEY` or `DEEPSEEK_API_KEY`.
 * If a DeepSeek key is used we default to DeepSeek's endpoint and model.
 */
function resolveProvider(): { apiKey: string; baseUrl: string; model: string } {
  const apiKey =
    process.env.CLASSIFIER_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  const usingDeepSeek =
    !process.env.CLASSIFIER_API_BASE &&
    !process.env.OPENAI_API_KEY &&
    Boolean(process.env.DEEPSEEK_API_KEY || process.env.CLASSIFIER_API_KEY);

  const baseUrl = (
    process.env.CLASSIFIER_API_BASE ??
    (usingDeepSeek ? DEEPSEEK_BASE_URL : DEFAULT_BASE_URL)
  ).replace(/\/$/, "");

  const defaultModel = usingDeepSeek ? DEEPSEEK_DEFAULT_MODEL : DEFAULT_MODEL;
  const model = process.env.CLASSIFIER_MODEL ?? defaultModel;

  return { apiKey, baseUrl, model };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

/** Extracts the first JSON object from a model response. */
function parseJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found.");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Classifies one song via a chat-completions model. The lyrics (when present)
 * are sent in the prompt only; the caller decides what to persist.
 *
 * Provider: any OpenAI-compatible /chat/completions endpoint.
 */
export async function classifySong(
  system: string,
  user: string,
): Promise<ClassificationResult> {
  const { apiKey, baseUrl, model } = resolveProvider();
  if (!apiKey) {
    throw new ClassifierError(
      "No classifier API key set (CLASSIFIER_API_KEY, DEEPSEEK_API_KEY or OPENAI_API_KEY).",
      500,
    );
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ClassifierError(
      `Classifier request failed (${response.status}). ${detail.slice(0, 200)}`,
      response.status === 429 ? 429 : 502,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new ClassifierError("Classifier returned an empty response.");

  let raw: unknown;
  try {
    raw = parseJson(content);
  } catch {
    throw new ClassifierError("Classifier returned invalid JSON.");
  }

  const obj = raw as {
    valence?: unknown;
    arousal?: unknown;
    categories?: unknown;
    rationale?: unknown;
  };

  const categories = Array.isArray(obj.categories)
    ? obj.categories
        .filter(
          (c): c is { id: string; confidence?: unknown } =>
            Boolean(c) && typeof c === "object" && typeof (c as { id?: unknown }).id === "string",
        )
        .map((c) => ({
          id: c.id,
          confidence: clamp(Number(c.confidence ?? 0.5), 0, 1),
        }))
    : [];

  if (categories.length === 0) {
    throw new ClassifierError("Classifier returned no categories.");
  }

  return {
    valence: clamp(Number(obj.valence ?? 0), -2, 2),
    arousal: clamp(Number(obj.arousal ?? 0), -2, 2),
    categories,
    rationale:
      typeof obj.rationale === "string" ? obj.rationale.slice(0, 300) : "",
  };
}

/** Maps a (valence, arousal) point to a Russell quadrant id. */
export function quadrantFor(valence: number, arousal: number): string {
  if (valence >= 0 && arousal >= 0) return "Q1_happy";
  if (valence < 0 && arousal >= 0) return "Q2_angry";
  if (valence < 0 && arousal < 0) return "Q3_sad";
  return "Q4_relaxed";
}

export function classifierModel(): string {
  return resolveProvider().model;
}

/** True when the server has what it needs to run the pipeline. */
export function isClassifierConfigured(): boolean {
  return Boolean(resolveProvider().apiKey);
}
