"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { saveSession } from "@/lib/auth";
import { login } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      const data = await login(email, password);
      saveSession(data.token, data.user);

      router.replace(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível fazer login.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>

        <input
          placeholder="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p>{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>

        <Link href={`/cadastro?redirect=${encodeURIComponent(redirectTo)}`}>
          Criar conta
        </Link>
      </form>
    </main>
  );
}
