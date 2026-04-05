import { STORAGE_KEYS } from "./config.js";

export function getSession() {
  const raw = sessionStorage.getItem(STORAGE_KEYS.session);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Unable to parse stored session: ${error.message}`);
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getSession());
}

export function saveSession(user) {
  sessionStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({
      user,
      loginAt: new Date().toISOString()
    })
  );
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.session);
}

export function requireAuth() {
  if (!isAuthenticated()) {
    globalThis.location.href = "index.html";
    return false;
  }
  return true;
}

export function logout() {
  clearSession();
  globalThis.location.href = "index.html";
}
