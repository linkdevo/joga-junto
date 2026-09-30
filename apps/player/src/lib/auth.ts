import type { AuthUser } from "@/types/auth";

const TOKEN_KEY = "jogajunto_token";
const USER_KEY = "jogajunto_user";

export function saveSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);

    return null;
  }
}

/**
 * Atualiza apenas os dados do usuário armazenados localmente,
 * mantendo o token da sessão atual (usado após editar o perfil).
 */
export function updateStoredUser(user: AuthUser) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

//usar HttpOnly cookies para que o token não seja acessível via JavaScript, aumentando a segurança da aplicação.
