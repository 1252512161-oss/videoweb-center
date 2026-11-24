export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (networkErr) {
    console.error(`[VideoWeb API] Network error requesting ${url}:`, networkErr);
    throw new ApiRequestError(
      'Não foi possível conectar ao servidor no momento. Verifique sua conexão e tente novamente.',
      0
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    console.error(
      `[VideoWeb API] Non-JSON response (${response.status}) from ${url}. Content-Type: ${contentType || 'none'}`
    );
    throw new ApiRequestError(
      'O serviço de catálogo está temporariamente indisponível. Tente novamente em instantes.',
      response.status
    );
  }

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const serverMessage = typeof payload.error === 'string' ? payload.error : '';
    console.error(`[VideoWeb API] HTTP ${response.status} from ${url}:`, payload);
    throw new ApiRequestError(
      serverMessage || 'Não foi possível concluir a consulta no catálogo. Tente novamente.',
      response.status
    );
  }

  return payload as T;
}
