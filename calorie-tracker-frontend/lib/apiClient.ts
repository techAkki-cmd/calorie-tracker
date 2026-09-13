export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9080";

export const ACCESS_TOKEN_STORAGE_KEY = "calorie-tracker.accessToken";
export const ACCESS_TOKEN_CHANGED_EVENT = "calorie-tracker.access-token-changed";

type ProblemDetail = {
  status?: number;
  title?: string;
  detail?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string;

  constructor(status: number, title: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: RequestInit["body"] | Record<string, unknown> | unknown[];
};

export function readAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function writeAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  notifyAccessTokenChanged();
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  notifyAccessTokenChanged();
}

export async function apiClient<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const accessToken = readAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const { body, contentType } = serializeRequestBody(init.body);
  if (contentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", contentType);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    body,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseType = response.headers.get("Content-Type") ?? "";
  if (responseType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

function notifyAccessTokenChanged(): void {
  window.dispatchEvent(new Event(ACCESS_TOKEN_CHANGED_EVENT));
}

function serializeRequestBody(body: ApiRequestInit["body"]): {
  body: BodyInit | undefined;
  contentType: string | null;
} {
  if (body == null) {
    return { body: undefined, contentType: null };
  }

  if (isPlainJsonBody(body)) {
    return { body: JSON.stringify(body), contentType: "application/json" };
  }

  return { body: body as BodyInit, contentType: null };
}

function isPlainJsonBody(body: unknown): body is Record<string, unknown> | unknown[] {
  if (body == null || typeof body !== "object") {
    return false;
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return false;
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return false;
  }
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return false;
  }
  if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer) {
    return false;
  }
  return true;
}

async function toApiError(response: Response): Promise<ApiError> {
  const problem = await readProblemDetail(response);
  const status = problem.status ?? response.status;
  const title = problem.title ?? defaultTitleForStatus(status);
  const detail = problem.detail ?? defaultDetailForStatus(status);

  if (status === 401) {
    clearAccessToken();
  }

  return new ApiError(status, title, detail);
}

async function readProblemDetail(response: Response): Promise<ProblemDetail> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("json")) {
    return {};
  }

  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return {};
  }
}

function defaultTitleForStatus(status: number): string {
  if (status === 401) {
    return "Unauthorized";
  }
  if (status === 404) {
    return "Not found";
  }
  if (status >= 500) {
    return "Server error";
  }
  return "Request failed";
}

function defaultDetailForStatus(status: number): string {
  if (status === 401) {
    return "Session expired, please sign in";
  }
  if (status === 404) {
    return "Resource not found";
  }
  if (status >= 500) {
    return "The server could not complete this request";
  }
  return "The request could not be completed";
}
