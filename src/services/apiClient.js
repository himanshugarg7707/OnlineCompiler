const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const API_BASE_URL = configuredApiBase;

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${configuredApiBase}${normalizedPath}`;
}

export function apiFetch(path, options) {
  return fetch(apiUrl(path), { credentials: 'include', ...options });
}

export function hasDedicatedApiBackend() {
  return Boolean(configuredApiBase);
}
