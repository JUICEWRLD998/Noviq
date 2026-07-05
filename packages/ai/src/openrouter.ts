// Minimal OpenRouter chat client built on native fetch (no SDK dependency).
//
// Two entry points:
//  - `complete`     → free-form text completion, with retry on transient errors.
//  - `completeJson` → JSON-mode completion validated against a zod schema, with
//                     a self-correction retry loop when the model returns
//                     malformed or non-conforming JSON.
//
// The API key is resolved lazily (ctor arg → `OPENROUTER_API_KEY`), so importing
// this module never throws; only an actual call requires a key.

import type { z } from "zod"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export type ChatRole = "system" | "user" | "assistant"
export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface OpenRouterOptions {
  apiKey?: string
  /** Sent as HTTP-Referer / X-Title for OpenRouter attribution (optional). */
  referer?: string
  title?: string
  baseUrl?: string
}

export interface CompleteParams {
  model: string
  messages: ChatMessage[]
  temperature?: number
  /** Max attempts on transient (429 / 5xx / network) failures. */
  maxRetries?: number
}

export interface CompleteJsonParams<S extends z.ZodTypeAny> extends CompleteParams {
  /** Zod schema the response is parsed and validated against. */
  schema: S
}

/** Thrown for non-retryable API errors (bad request, auth, exhausted retries). */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = "OpenRouterError"
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export class OpenRouterClient {
  private readonly explicitKey: string | undefined
  private readonly referer: string | undefined
  private readonly title: string | undefined
  private readonly baseUrl: string

  constructor(opts: OpenRouterOptions = {}) {
    this.explicitKey = opts.apiKey
    this.referer = opts.referer
    this.title = opts.title
    this.baseUrl = opts.baseUrl ?? OPENROUTER_URL
  }

  private key(): string {
    const key = this.explicitKey ?? process.env.OPENROUTER_API_KEY
    if (!key) {
      throw new OpenRouterError(
        "Missing OPENROUTER_API_KEY (set it in the environment or pass apiKey)",
      )
    }
    return key
  }

  /** One chat completion, returning the raw assistant text. Retries transient errors. */
  async complete(params: CompleteParams): Promise<string> {
    return this.request(params, false)
  }

  /**
   * JSON-mode completion validated against `schema`. On malformed/non-conforming
   * output, appends the validation error and re-asks, up to `maxRetries` times.
   */
  async completeJson<S extends z.ZodTypeAny>(params: CompleteJsonParams<S>): Promise<z.output<S>> {
    const { schema, maxRetries = 2, ...rest } = params
    const messages = [...rest.messages]

    let lastError = ""
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const raw = await this.request({ ...rest, messages }, true)
      const parsed = tryParseJson(raw)
      if (parsed.ok) {
        const result = schema.safeParse(parsed.value)
        if (result.success) return result.data
        lastError = result.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ")
      } else {
        lastError = parsed.error
      }

      // Feed the failure back so the model can self-correct on the next attempt.
      messages.push({ role: "assistant", content: raw })
      messages.push({
        role: "user",
        content: `That response was not valid JSON matching the required schema (${lastError}). Reply with ONLY the corrected JSON object, no prose or code fences.`,
      })
    }

    throw new OpenRouterError(
      `Structured output failed after ${maxRetries + 1} attempts: ${lastError}`,
    )
  }

  private async request(params: CompleteParams, jsonMode: boolean): Promise<string> {
    const { model, messages, temperature = 0.2, maxRetries = 2 } = params

    const body: Record<string, unknown> = { model, messages, temperature }
    if (jsonMode) body.response_format = { type: "json_object" }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.key()}`,
      "Content-Type": "application/json",
    }
    if (this.referer) headers["HTTP-Referer"] = this.referer
    if (this.title) headers["X-Title"] = this.title

    let lastError = ""
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let res: Response
      try {
        res = await fetch(this.baseUrl, { method: "POST", headers, body: JSON.stringify(body) })
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        await sleep(backoffMs(attempt))
        continue
      }

      if (res.ok) {
        const json = (await res.json()) as OpenRouterResponse
        const content = json.choices?.[0]?.message?.content
        if (typeof content !== "string" || content.length === 0) {
          throw new OpenRouterError("OpenRouter returned an empty completion")
        }
        return content
      }

      const text = await res.text().catch(() => "")
      // Retry rate limits and server errors; surface client errors immediately.
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}: ${text}`
        await sleep(backoffMs(attempt))
        continue
      }
      throw new OpenRouterError(
        `OpenRouter request failed (HTTP ${res.status}): ${text}`,
        res.status,
      )
    }

    throw new OpenRouterError(
      `OpenRouter request failed after ${maxRetries + 1} attempts: ${lastError}`,
    )
  }
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>
}

function backoffMs(attempt: number): number {
  return 250 * 2 ** attempt
}

/** Parse a model response as JSON, tolerating ```json fences the mode should prevent. */
function tryParseJson(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()
  try {
    return { ok: true, value: JSON.parse(cleaned) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "invalid JSON" }
  }
}
