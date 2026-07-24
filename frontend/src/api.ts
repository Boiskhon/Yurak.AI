// Тонкий клиент к локальному backend. Все запросы идут на /api (в dev это
// проксируется Vite на 127.0.0.1:8756; в проде фронтенд отдаётся тем же
// сервером, поэтому относительный путь тоже верен).

const TOKEN_KEY = "ecg_access_token";
const REFRESH_KEY = "ecg_refresh_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handle(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = data?.detail ?? res.statusText;
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Ошибка запроса");
  }
  return data;
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Обновление access-токена по refresh-токену. Access живёт 30 мин; без этого
// сессия «умирала» через полчаса. Дедупликация: параллельные 401 ждут один
// общий запрос обновления, а не устраивают шторм из refresh'ей.
let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const rt = localStorage.getItem(REFRESH_KEY);
  if (!rt) return false;
  try {
    const res = await fetch(`/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

function refreshAccess(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// Запрос с автоповтором один раз после успешного обновления токена на 401.
async function req(method: string, path: string, body?: unknown) {
  const send = () =>
    fetch(`/api${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...authHeaders(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  let res = await send();
  if (res.status === 401 && getToken() && (await refreshAccess())) {
    res = await send();
  }
  return handle(res);
}

export const api = {
  get(path: string) {
    return req("GET", path);
  },
  post(path: string, body?: unknown) {
    return req("POST", path, body);
  },
  put(path: string, body?: unknown) {
    return req("PUT", path, body);
  },
  patch(path: string, body?: unknown) {
    return req("PATCH", path, body);
  },
  del(path: string) {
    return req("DELETE", path);
  },
  // OAuth2-логин ждёт form-urlencoded (username/password). Refresh здесь не
  // нужен — это и есть точка получения токенов.
  async login(username: string, password: string) {
    const form = new URLSearchParams({ username, password });
    return handle(
      await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }),
    );
  },
  async upload(patientId: number, deviceName: string, file: File) {
    const fd = new FormData();
    fd.append("patient_id", String(patientId));
    fd.append("device_name", deviceName);
    fd.append("file", file);
    const send = () =>
      fetch(`/api/ecg/upload`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: fd,
      });
    let res = await send();
    if (res.status === 401 && getToken() && (await refreshAccess())) {
      res = await send();
    }
    return handle(res);
  },
};
