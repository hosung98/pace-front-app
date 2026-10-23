export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
      signal: controller.signal,
    });
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      throw new ApiError('서버 응답 형식이 올바르지 않아요.', response.status, 'INVALID_RESPONSE');
    }
    if (!response.ok) {
      const message = typeof body === 'object' && body !== null && 'message' in body
        && typeof body.message === 'string' ? body.message : '서버 요청을 처리하지 못했어요.';
      const code = typeof body === 'object' && body !== null && 'code' in body
        && typeof body.code === 'string' ? body.code : 'REQUEST_FAILED';
      throw new ApiError(message, response.status, code);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('인터넷 연결을 확인해 주세요.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}
