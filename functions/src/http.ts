const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PermanentError extends Error {}

/** POST med JSON, eller skjemadata hvis `body` er URLSearchParams. Svaret er JSON. Prøver igjen ved nettverksfeil, 429 og 5xx, men ikke ved feil i selve forespørselen. */
export async function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<unknown> {
  const form = body instanceof URLSearchParams;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(400 * 2 ** attempt);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json',
          ...headers,
        },
        body: form ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return await response.json();
      if (response.status !== 429 && response.status < 500) {
        throw new PermanentError(`${new URL(url).host} svarte ${response.status}`);
      }
      lastError = new Error(`${new URL(url).host} svarte ${response.status}`);
    } catch (error) {
      if (error instanceof PermanentError) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
