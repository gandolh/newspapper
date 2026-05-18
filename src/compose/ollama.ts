export async function generate(host: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${host.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.7 } }),
  });
  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { response?: string };
  if (typeof json.response !== 'string') {
    throw new Error('Ollama response missing `response` field');
  }
  return json.response;
}
