import type { AdminSession } from "@/types/admin";

const ADMIN_TOKEN_KEY = "jogajunto_admin_token";
const ADMIN_SESSION_KEY = "jogajunto_admin_session";

function canUseLocalStorage() {
  return typeof window !== "undefined";
}

export function saveAdminSession(session: AdminSession) {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(ADMIN_TOKEN_KEY, session.token);

  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function getAdminToken() {
  if (!canUseLocalStorage()) {
    return null;
  }

  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminSession(): AdminSession | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const storedSession = localStorage.getItem(ADMIN_SESSION_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession) as AdminSession;
  } catch {
    clearAdminSession();

    return null;
  }
}

export function clearAdminSession() {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
}
