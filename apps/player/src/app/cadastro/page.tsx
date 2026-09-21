"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CircleCheck,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

import { saveSession } from "@/lib/auth";
import { register } from "@/services/auth.service";
import styles from "./Cadastro.module.css";

function CadastroForm() {
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
    <main className={styles.page}>
      <section className={styles.formColumn}>
        <form onSubmit={handleSubmit} className={styles.formPanel}>
          <div className={styles.formHeader}>
            <span className={styles.brandMark}>⚽</span>

            <span className={styles.eyebrow}>Área do atleta</span>

            <h1>Crie sua conta de atleta</h1>

            <p>
              Reserve quadras, organize partidas e acompanhe seus próximos
              jogos em um só lugar.
            </p>
          </div>

          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Nome completo</span>

              <div className={styles.inputWrap}>
                <UserRound size={18} />

                <input
                  placeholder="Seu nome"
                  value={name}
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>Telefone</span>

              <div className={styles.inputWrap}>
                <Phone size={18} />

                <input
                  placeholder="(00) 00000-0000"
                  value={phone}
                  autoComplete="tel"
                  inputMode="tel"
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </label>

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
                  placeholder="Crie uma senha segura"
                  type="password"
                  value={password}
                  autoComplete="new-password"
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
            {isSubmitting ? "Criando conta..." : "Criar conta"}
            <ArrowRight size={18} />
          </button>

          <p className={styles.switchText}>
            Já tem uma conta?
            <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
              Fazer login
            </Link>
          </p>
        </form>
      </section>

      <aside
        className={styles.visualPanel}
        aria-label="Atletas entrando em uma arena esportiva"
      >
        <div className={styles.visualContent}>
          <span className={styles.visualBadge}>Joga Junto</span>

          <h2>Seu próximo jogo começa aqui.</h2>

          <div className={styles.visualStats}>
            <span>
              <CircleCheck size={16} />
              Reservas rápidas
            </span>

            <span>
              <CircleCheck size={16} />
              Times conectados
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

export default function CadastroPage() {
  return (
    <Suspense fallback={<main />}>
      <CadastroForm />
    </Suspense>
  );
}
