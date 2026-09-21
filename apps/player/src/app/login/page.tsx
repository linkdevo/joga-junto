"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleCheck, LockKeyhole, Mail } from "lucide-react";

import { saveSession } from "@/lib/auth";
import { login } from "@/services/auth.service";
import styles from "../cadastro/Cadastro.module.css";

function LoginForm() {
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
    <main className={styles.page}>
      <section className={styles.formColumn}>
        <form onSubmit={handleSubmit} className={styles.formPanel}>
          <div className={styles.formHeader}>
            <span className={styles.brandMark}>⚽</span>

            <span className={styles.eyebrow}>Área do atleta</span>

            <h1>Entre na sua conta de atleta</h1>

            <p>
              Continue organizando seus jogos, reservas e times com a mesma
              velocidade de sempre.
            </p>
          </div>

          <div className={styles.fields}>
            <label className={styles.field}>
              <span>E-mail</span>

              <div className={styles.inputWrap}>
                <Mail size={18} />

                <input
                  placeholder="voce@email.com"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>Senha</span>

              <div className={styles.inputWrap}>
                <LockKeyhole size={18} />

                <input
                  placeholder="Sua senha"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
            <ArrowRight size={18} />
          </button>

          <p className={styles.switchText}>
            Ainda não tem conta?
            <Link href={`/cadastro?redirect=${encodeURIComponent(redirectTo)}`}>
              Criar conta
            </Link>
          </p>
        </form>
      </section>

      <aside
        className={styles.visualPanel}
        aria-label="Entrada de uma arena esportiva"
      >
        <div className={styles.visualContent}>
          <span className={styles.visualBadge}>Joga Junto</span>

          <h2>Volte para a sua próxima partida.</h2>

          <div className={styles.visualStats}>
            <span>
              <CircleCheck size={16} />
              Reservas em dia
            </span>

            <span>
              <CircleCheck size={16} />
              Times organizados
            </span>
          </div>
        </div>

        <div className={styles.patternGrid} aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </aside>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main />}>
      <LoginForm />
    </Suspense>
  );
}
