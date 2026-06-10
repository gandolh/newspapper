import type { OllamaConfig } from './types.js';

export class OllamaError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

export class OllamaClient {
  private cfg: OllamaConfig;

  constructor(cfg: OllamaConfig) {
    this.cfg = cfg;
  }

  private get baseUrl(): string {
    return this.cfg.host.replace(/\/$/, '');
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.cfg.apiKey && this.cfg.apiKey.length > 0) {
      headers['Authorization'] = `Bearer ${this.cfg.apiKey}`;
    }
    return headers;
  }

  async generate(
    prompt: string,
    opts: { json?: boolean; system?: string } = {},
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: this.buildHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          model: this.cfg.model,
          prompt,
          ...(opts.system !== undefined ? { system: opts.system } : {}),
          stream: false,
          ...(opts.json ? { format: 'json' } : {}),
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const bodySnippet = (await res.text()).slice(0, 500);
      throw new OllamaError(
        `Ollama HTTP ${res.status}: ${bodySnippet}`,
        res.status,
        bodySnippet,
      );
    }

    const data = (await res.json()) as { response?: string };
    if (typeof data.response !== 'string') {
      throw new OllamaError('Ollama response missing `response` field', 200, JSON.stringify(data));
    }
    return data.response;
  }

  async listModels(): Promise<string[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const bodySnippet = (await res.text()).slice(0, 500);
      throw new OllamaError(
        `Ollama HTTP ${res.status}: ${bodySnippet}`,
        res.status,
        bodySnippet,
      );
    }

    const data = (await res.json()) as { models?: Array<{ name: string }> };
    if (!Array.isArray(data.models)) return [];
    return data.models.map((m) => m.name);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }> {
    try {
      const models = await this.listModels();
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
