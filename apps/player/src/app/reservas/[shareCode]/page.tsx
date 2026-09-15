"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  Copy,
  LocateFixed,
  Share2,
  UserRound,
  Users,
} from "lucide-react";

import { getStoredUser, getToken } from "@/lib/auth";
import {
  getBookingByShareCode,
  getMyBookingPayment,
  joinBooking,
} from "@/services/booking.service";
import type { AuthUser } from "@/types/auth";
import type {
  BookingDetails,
  BookingPaymentInfo,
  BookingPlayer,
} from "@/types/booking";
import { MockPixQr } from "@/components/player/MockPixQr/MockPixQr";
import styles from "./ReservationPage.module.css";

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function BookingSharePage() {
  const params = useParams<{ shareCode: string }>();
  const router = useRouter();

  const shareCode = String(params.shareCode);

  const [storedUser, setStoredUser] = useState<AuthUser | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<BookingPaymentInfo | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const token = typeof window !== "undefined" ? getToken() : null;

  async function loadBooking() {
    const data = await getBookingByShareCode(shareCode);
    setBooking(data);
  }

  async function loadPayment(currentToken: string) {
    try {
      const data = await getMyBookingPayment(shareCode, currentToken);
      setPaymentInfo(data);
    } catch {
      setPaymentInfo(null);
    }
  }

  useEffect(() => {
    const user = getStoredUser();
    setStoredUser(user);

    async function load() {
      try {
        setError("");
        await loadBooking();

        const currentToken = getToken();
        if (currentToken) {
          await loadPayment(currentToken);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar a reserva.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    load();

    const interval = setInterval(() => {
      loadBooking().catch(() => undefined);
      const currentToken = getToken();
      if (currentToken) {
        loadPayment(currentToken).catch(() => undefined);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [shareCode]);

  const activePlayers = useMemo(() => {
    return (booking?.players ?? []).filter(
      (player) => player.status !== "CANCELLED",
    );
  }, [booking]);

  const currentPlayer = useMemo(() => {
    if (!storedUser) {
      return null;
    }

    return (
      activePlayers.find((player) => player.userId === storedUser.id) ?? null
    );
  }, [activePlayers, storedUser]);

  const playersCount = activePlayers.length;
  const remainingSlots = Math.max(
    (booking?.expectedPlayers ?? 0) - playersCount,
    0,
  );

  const estimatedPerPlayer = booking
    ? Math.ceil(booking.totalPriceInCents / booking.expectedPlayers) +
      booking.platformFeeInCents
    : 0;

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/reservas/${shareCode}`
      : "";

  function getPaymentLabel(player: BookingPlayer) {
    return player.status === "PAID" ? "Pago" : "A pagar";
  }

  function getPaymentClass(player: BookingPlayer) {
    return player.status === "PAID" ? styles.paidBadge : styles.pendingBadge;
  }

  async function handleCopyLink() {
    if (!shareLink) return;

    await navigator.clipboard.writeText(shareLink);
    setCopyMessage("Link copiado!");
    setTimeout(() => setCopyMessage(""), 2000);
  }

  async function handleCopyPix() {
    if (!paymentInfo?.pixCopyPaste) return;

    await navigator.clipboard.writeText(paymentInfo.pixCopyPaste);
    setCopyMessage("Pix copiado!");
    setTimeout(() => setCopyMessage(""), 2000);
  }

  async function handleJoinBooking() {
    const currentToken = getToken();

    if (!currentToken) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/reservas/${shareCode}`)}`,
      );
      return;
    }

    try {
      setIsJoining(true);
      setError("");

      await joinBooking(shareCode, currentToken);
      await loadBooking();
      await loadPayment(currentToken);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível entrar na reserva.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.centerState}`}>
          <p>Carregando reserva...</p>
        </div>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.centerState}`}>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <>
      <main className={styles.page}>
        <div className="container">
          <Link href="/#quadras" className={styles.backLink}>
            ← Voltar para as quadras
          </Link>

          <section className={styles.heroCard}>
            <span className={styles.eyebrow}>Reserva criada</span>

            <h1>{booking.courtName}</h1>

            <p className={styles.location}>
              <LocateFixed size={18} />
              {booking.location}
            </p>

            <div className={styles.statsGrid}>
              <article className={styles.statCard}>
                <span>
                  <CalendarDays size={16} />
                  Dia
                </span>
                <strong>{formatDate(booking.bookingDate)}</strong>
              </article>

              <article className={styles.statCard}>
                <span>
                  <Clock3 size={16} />
                  Horário
                </span>
                <strong>{booking.startTime}</strong>
              </article>

              <article className={styles.statCard}>
                <span>
                  <CircleDollarSign size={16} />
                  Preço da quadra
                </span>
                <strong>{formatCurrency(booking.courtPriceInCents)}</strong>
              </article>

              <article className={styles.statCard}>
                <span>
                  <Users size={16} />
                  Jogadores
                </span>
                <strong>
                  {playersCount}/{booking.expectedPlayers}
                </strong>
              </article>
            </div>

            <div className={styles.summaryRow}>
              <div>
                <span>Total da reserva</span>
                <strong>{formatCurrency(booking.totalPriceInCents)}</strong>
              </div>

              <div>
                <span>Valor estimado por jogador</span>
                <strong>{formatCurrency(estimatedPerPlayer)}</strong>
              </div>
            </div>
          </section>

          <div className={styles.contentGrid}>
            <section className={styles.playersCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Jogadores</span>
                  <h2>Jogadores confirmados</h2>
                </div>

                <strong className={styles.playersCounter}>
                  {playersCount}/{booking.expectedPlayers}
                </strong>
              </div>

              {!storedUser ? (
                <div className={styles.authBox}>
                  <h3>Entre para participar da reserva</h3>
                  <p>
                    Para confirmar presença, o atleta precisa fazer login ou
                    criar uma conta.
                  </p>

                  <div className={styles.authActions}>
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/reservas/${shareCode}`)}`}
                      className={styles.secondaryButton}
                    >
                      Fazer login
                    </Link>

                    <Link
                      href={`/cadastro?redirect=${encodeURIComponent(`/reservas/${shareCode}`)}`}
                      className={styles.primaryButton}
                    >
                      Criar conta
                    </Link>
                  </div>
                </div>
              ) : !currentPlayer && remainingSlots > 0 ? (
                <div className={styles.authBox}>
                  <h3>Você ainda não entrou nesta reserva</h3>
                  <p>
                    Clique abaixo para confirmar sua presença e entrar na lista
                    de jogadores.
                  </p>

                  <button
                    type="button"
                    onClick={handleJoinBooking}
                    className={styles.primaryButton}
                    disabled={isJoining}
                  >
                    {isJoining ? "Entrando..." : "Entrar na reserva"}
                  </button>
                </div>
              ) : null}

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.playersList}>
                {Array.from({ length: booking.expectedPlayers }).map(
                  (_, index) => {
                    const player = activePlayers[index];

                    if (!player) {
                      return (
                        <article key={index} className={styles.placeholderItem}>
                          <span className={styles.playerIndex}>
                            {index + 1}
                          </span>

                          <div className={styles.playerAvatar}>
                            <UserRound size={18} />
                          </div>

                          <div className={styles.playerInfo}>
                            <strong>Aguardando jogador...</strong>
                            <small>Vaga disponível</small>
                          </div>
                        </article>
                      );
                    }

                    const isCaptain = player.userId === booking.captainUserId;
                    const isYou = storedUser?.id === player.userId;

                    return (
                      <article key={player.id} className={styles.playerItem}>
                        <span className={styles.playerIndex}>{index + 1}</span>

                        <div className={styles.playerAvatar}>
                          <UserRound size={18} />
                        </div>

                        <div className={styles.playerInfo}>
                          <div className={styles.nameRow}>
                            <strong>{player.name}</strong>

                            {isYou && (
                              <span className={styles.youBadge}>você</span>
                            )}
                          </div>

                          <small>
                            {isCaptain
                              ? "Capitão da reserva"
                              : "Jogador confirmado"}
                          </small>
                        </div>

                        <div className={styles.statusArea}>
                          <span className={styles.confirmedStatus}>
                            <CircleCheck size={16} />
                            Confirmado
                          </span>

                          <span
                            className={`${styles.paymentStatus} ${getPaymentClass(player)}`}
                          >
                            {getPaymentLabel(player)}
                          </span>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>

            <aside className={styles.sidebar}>
              <section className={styles.sideCard}>
                <div className={styles.sideTitle}>
                  <Share2 size={22} />
                  <div>
                    <span className={styles.eyebrow}>Compartilhar</span>
                    <h3>Link da reserva</h3>
                  </div>
                </div>

                <p>Envie este link para os jogadores confirmarem presença.</p>

                <div className={styles.copyField}>{shareLink}</div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={styles.primaryButton}
                >
                  <Copy size={18} />
                  Copiar link
                </button>
              </section>

              {currentPlayer && paymentInfo && (
                <section className={styles.sideCard}>
                  <div className={styles.sideTitle}>
                    <CircleDollarSign size={22} />
                    <div>
                      <span className={styles.eyebrow}>Pagamento</span>
                      <h3>Sua parte</h3>
                    </div>
                  </div>

                  <div className={styles.paymentTop}>
                    <div>
                      <span>Valor</span>
                      <strong>
                        {formatCurrency(paymentInfo.amountToPayInCents)}
                      </strong>
                    </div>

                    <span
                      className={`${styles.paymentStatus} ${
                        paymentInfo.status === "PAID"
                          ? styles.paidBadge
                          : styles.pendingBadge
                      }`}
                    >
                      {paymentInfo.status === "PAID" ? "Pago" : "A pagar"}
                    </span>
                  </div>

                  <MockPixQr value={paymentInfo.pixCopyPaste} />

                  <div className={styles.pixBox}>
                    <span>Código Pix mockado</span>
                    <div className={styles.copyField}>
                      {paymentInfo.pixCopyPaste}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className={styles.secondaryButton}
                  >
                    <Copy size={18} />
                    Copiar Pix
                  </button>

                  <small className={styles.sideNote}>
                    O pagamento real será implementado depois. Por enquanto, o
                    QR Code é ilustrativo.
                  </small>
                </section>
              )}

              {copyMessage && <p className={styles.success}>{copyMessage}</p>}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
