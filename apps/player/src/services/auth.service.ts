import type { AuthUser, LoginResponse } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "Não foi possível realizar o login.");
  }

  return data;
}

export async function register(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "Não foi possível criar sua conta.");
  }

  return data;
}
