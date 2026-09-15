"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import { ApiError } from "@/services/admin-api";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

import styles from "./Login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const { login, isAuthenticated, isLoading } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Se o administrador já estiver autenticado,
   * não faz sentido permanecer no /login.
   */
  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    router.replace("/resumo");
  }, [isAuthenticated, isLoading, router]);

  /*
   * Remove a mensagem de erro quando
   * o usuário altera algum campo.
   */
  useEffect(() => {
    setError("");
  }, [email, password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Informe o seu e-mail.");

      return;
    }

    if (!password) {
      setError("Informe a sua senha.");

      return;
    }

    try {
      setIsSubmitting(true);

      await login(normalizedEmail, password);

      /*
       * O ProtectedRoute da versão antiga
       * guardava a página de origem.
       *
       * Mantemos o mesmo comportamento
       * através do query param:
       *
       * /login?from=/quadras
       */
      const searchParams = new URLSearchParams(window.location.search);

      const from = searchParams.get("from");

      const destination = from && from.startsWith("/") ? from : "/resumo";

      router.replace(destination);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);

        return;
      }

      setError("Não foi possível realizar o login.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className={styles.loading}>
        <div className={styles.spinner} />

        <span>Carregando Joga Junto...</span>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <div className={styles.logo}>⚽</div>

          <div className={styles.brandText}>
            <h1>Joga Junto</h1>
            <span>ADMINISTRADOR</span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.heading}>
            <span className={styles.badge}>PAINEL ADMINISTRATIVO</span>

            <h2>Acesse sua arena</h2>

            <p>Gerencie suas quadras, horários e reservas em um único lugar.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email">E-mail</label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@jogajunto.com"
                value={email}
                disabled={isSubmitting}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Senha</label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                disabled={isSubmitting}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <footer className={styles.footer}>© 2026 Joga Junto</footer>
      </section>

      <section className={styles.visual}>
        <div className={styles.visualContent}>
          <span>GESTÃO DE ARENAS</span>

          <h2>
            Sua arena.
            <br />
            Sob seu controle.
          </h2>

          <p>
            Controle a agenda, disponibilidade das quadras e reservas através do
            painel administrativo.
          </p>
        </div>

        <div className={styles.visualCircles} />
      </section>
    </main>
  );
}
