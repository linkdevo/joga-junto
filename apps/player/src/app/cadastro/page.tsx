"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { saveSession } from "@/lib/auth";
import { register } from "@/services/auth.service";

export default function CadastroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect") ?? "/";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      const data = await register({
        name,
        phone,
        email,
        password,
      });

      saveSession(data.token, data.user);
      router.replace(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar a conta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <h1>Criar conta</h1>

        <input
          placeholder="Nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <input
          placeholder="Telefone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />

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
          {isSubmitting ? "Criando..." : "Criar conta"}
        </button>

        <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
          Já tenho conta
        </Link>
      </form>
    </main>
  );
}
