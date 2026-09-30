"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, LogOut, Plus, UserRound, Users } from "lucide-react";

import { clearSession, getStoredUser, getToken } from "@/lib/auth";
import { getPlayerDashboard, PlayerApiError } from "@/services/player.service";
import type { AuthUser } from "@/types/auth";
import type { PlayerDashboard } from "@/types/player";
import styles from "./PlayerResume.module.css";

const MOCK_TEAMS_COUNT = 2;

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function getPaymentText(
  status: "WAITING_PAYMENT" | "PAID" | "CANCELLED" | null,
) {
  return status === "PAID" ? "Pago" : "A pagar";
}

export function PlayerResume() {
  const router = useRouter();

  const [storedUser, setStoredUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();

    setStoredUser(user);

    if (!token || !user) {
      setDashboard(null);
      setIsLoading(false);
      return;
    }

    const sessionToken = token;

    async function loadDashboard() {
      try {
        const data = await getPlayerDashboard(sessionToken);
        setDashboard(data);
        setError("");
      } catch (err) {
        if (err instanceof PlayerApiError && err.status === 401) {
          clearSession();
          setStoredUser(null);
          setDashboard(null);
          setError("");
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os dados do atleta.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();

    function handleBookingCreated() {
      loadDashboard();
    }

    window.addEventListener("jogajunto:booking-created", handleBookingCreated);

    return () => {
      window.removeEventListener(
        "jogajunto:booking-created",
        handleBookingCreated,
      );
    };
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  const playerName = dashboard?.user.name ?? storedUser?.name ?? "Atleta";
  const nextGame = dashboard?.nextGame;
  const shouldShowAuthModal = !isLoading && !storedUser;

  useEffect(() => {
    if (!shouldShowAuthModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldShowAuthModal]);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.profile}>
          <div className={styles.player}>
            <div className={styles.avatar}>
              <UserRound size={28} />
            </div>

            <div>
              <div className={styles.badges}>
                <span>🏆 Atleta</span>
              </div>

              <h1>{playerName}</h1>
              <p>Organize jogos, confirme presenças e gerencie seus times.</p>
            </div>
          </div>

          {storedUser && (
            <div className={styles.actions}>
              <Link href="#quadras" className={styles.reserveButton}>
                <Plus size={21} />
                Fazer nova reserva de quadra
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutButton}
              >
                <LogOut size={18} />
                Sair
              </button>
            </div>
          )}
        </div>

        <div className={styles.cards}>
          <article className={styles.card}>
            <div className={styles.cardIcon}>
              <Users size={24} />
            </div>

            <div>
              <span>Meus Times</span>
              <strong>{MOCK_TEAMS_COUNT} Times Ativos</strong>
            </div>
          </article>

          <article className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.calendarIcon}`}>
              <CalendarDays size={24} />
            </div>

            <div className={styles.nextGameContent}>
              <div className={styles.nextGameHeader}>
                <span>Próximo Jogo</span>

                {nextGame && !isLoading && !error && (
                  <span
                    className={`${styles.paymentBadge} ${
                      nextGame.paymentStatus === "PAID"
                        ? styles.paymentPaid
                        : styles.paymentPending
                    }`}
                  >
                    {getPaymentText(nextGame.paymentStatus)}
                  </span>
                )}
              </div>

              {isLoading ? (
                <strong>Carregando...</strong>
              ) : error ? (
                <strong className={styles.error}>
                  Não foi possível carregar
                </strong>
              ) : nextGame ? (
                <>
                  <strong>
                    {formatDate(nextGame.bookingDate)} às {nextGame.startTime}
                  </strong>

                  <small>{nextGame.courtName}</small>
                </>
              ) : (
                <strong>Nenhum jogo agendado</strong>
              )}
            </div>
          </article>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}
      </div>

      {shouldShowAuthModal && (
        <div className={styles.authModalOverlay}>
          <div
            className={styles.authModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-auth-modal-title"
          >
            <span className={styles.authModalEyebrow}>Área do atleta</span>

            <h2 id="player-auth-modal-title">Entre para continuar</h2>

            <p>
              Faça login ou crie uma conta para organizar jogos, reservar
              quadras e acompanhar seus times.
            </p>

            <div className={styles.authModalActions}>
              <Link href="/login" className={styles.authModalPrimaryButton}>
                Fazer login
              </Link>

              <Link
                href="/cadastro"
                className={styles.authModalSecondaryButton}
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
