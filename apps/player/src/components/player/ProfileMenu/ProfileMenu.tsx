"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronDown,
  History,
  LogOut,
  UserRound,
} from "lucide-react";

import { getToken, updateStoredUser } from "@/lib/auth";
import {
  ProfileApiError,
  getPlayerGames,
  getPlayerProfile,
  updatePlayerProfile,
} from "@/services/profile.service";
import type { AuthUser } from "@/types/auth";
import type { PlayerGame, PlayerGamesResponse } from "@/types/games";

import styles from "./ProfileMenu.module.css";

type ProfileMenuProps = {
  user: AuthUser;
  onUserUpdate: (user: AuthUser) => void;
  onLogout: () => void;
};

type Tab = "profile" | "games";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return `${first}${last}`.toUpperCase();
}

function getPaymentLabel(status: PlayerGame["paymentStatus"]) {
  if (status === "PAID") {
    return "Pago";
  }

  if (status === "CANCELLED") {
    return "Cancelado";
  }

  return "A pagar";
}

function getBookingLabel(status: PlayerGame["bookingStatus"]) {
  if (status === "CANCELLED") {
    return "Cancelado";
  }

  if (status === "COMPLETED") {
    return "Concluído";
  }

  return null;
}

function Avatar({ user }: { user: AuthUser }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt={user.name} className={styles.avatarImage} />
    );
  }

  return <span className={styles.avatarInitials}>{getInitials(user.name)}</span>;
}

function GameItem({ game }: { game: PlayerGame }) {
  const bookingLabel = getBookingLabel(game.bookingStatus);

  return (
    <Link href={`/reservas/${game.shareCode}`} className={styles.gameItem}>
      <div className={styles.gameDate}>
        <span>{formatDate(game.bookingDate)}</span>
        <small>{game.startTime}</small>
      </div>

      <div className={styles.gameInfo}>
        <strong>{game.courtName}</strong>
        <small>{game.courtType}</small>
      </div>

      <div className={styles.gameBadges}>
        {bookingLabel && (
          <span
            className={`${styles.badge} ${
              game.bookingStatus === "CANCELLED"
                ? styles.badgeMuted
                : styles.badgeNeutral
            }`}
          >
            {bookingLabel}
          </span>
        )}

        <span
          className={`${styles.badge} ${
            game.paymentStatus === "PAID"
              ? styles.badgePaid
              : game.paymentStatus === "CANCELLED"
                ? styles.badgeMuted
                : styles.badgePending
          }`}
        >
          {getPaymentLabel(game.paymentStatus)}
          {game.paymentStatus === "WAITING_PAYMENT" &&
            ` · ${currencyFormatter.format(game.amountToPayInCents / 100)}`}
        </span>
      </div>
    </Link>
  );
}

export function ProfileMenu({ user, onUserUpdate, onLogout }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [nameInput, setNameInput] = useState(user.name);
  const [avatarUrlInput, setAvatarUrlInput] = useState(user.avatarUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [games, setGames] = useState<PlayerGamesResponse | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameInput(user.name);
    setAvatarUrlInput(user.avatarUrl ?? "");
  }, [user]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const token = getToken();

    if (!token) {
      return;
    }

    getPlayerProfile(token)
      .then((freshUser) => {
        updateStoredUser(freshUser);
        onUserUpdate(freshUser);
      })
      .catch(() => {
        // Mantém os dados já exibidos em caso de falha.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== "games" || games || isLoadingGames) {
      return;
    }

    const token = getToken();

    if (!token) {
      return;
    }

    setIsLoadingGames(true);
    setGamesError(null);

    getPlayerGames(token)
      .then(setGames)
      .catch((error) => {
        setGamesError(
          error instanceof ProfileApiError
            ? error.message
            : "Não foi possível carregar seus jogos.",
        );
      })
      .finally(() => {
        setIsLoadingGames(false);
      });
  }, [isOpen, activeTab, games, isLoadingGames]);

  function toggleOpen() {
    setIsOpen((current) => !current);
    setSaveSuccess(false);
    setSaveError(null);
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);

    const trimmedName = nameInput.trim();
    const trimmedAvatarUrl = avatarUrlInput.trim();

    if (trimmedName.length < 2) {
      setSaveError("Informe um nome válido.");
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = await updatePlayerProfile(token, {
        name: trimmedName,
        avatarUrl: trimmedAvatarUrl || null,
      });

      updateStoredUser(updatedUser);
      onUserUpdate(updatedUser);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(
        error instanceof ProfileApiError
          ? error.message
          : "Não foi possível salvar as alterações.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={toggleOpen}
      >
        <span className={styles.avatar}>
          <Avatar user={user} />
        </span>

        <ChevronDown
          size={16}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.dropdownHeader}>
            <span className={`${styles.avatar} ${styles.avatarLarge}`}>
              <Avatar user={user} />
            </span>

            <div className={styles.dropdownHeaderText}>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              className={
                activeTab === "profile" ? styles.tabActive : styles.tab
              }
              onClick={() => setActiveTab("profile")}
            >
              <UserRound size={15} />
              Perfil
            </button>

            <button
              type="button"
              className={activeTab === "games" ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab("games")}
            >
              <CalendarClock size={15} />
              Jogos
            </button>
          </div>

          <div className={styles.panel}>
            {activeTab === "profile" ? (
              <form className={styles.profileForm} onSubmit={handleSaveProfile}>
                {saveError && (
                  <div className={styles.formError}>{saveError}</div>
                )}

                {saveSuccess && (
                  <div className={styles.formSuccess}>
                    Perfil atualizado com sucesso.
                  </div>
                )}

                <div className={styles.field}>
                  <label htmlFor="profile-name">Nome</label>

                  <input
                    id="profile-name"
                    className={styles.input}
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="profile-email">E-mail</label>

                  <input
                    id="profile-email"
                    className={styles.input}
                    value={user.email}
                    disabled
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="profile-avatar">URL da foto de perfil</label>

                  <input
                    id="profile-avatar"
                    type="url"
                    className={styles.input}
                    placeholder="https://..."
                    value={avatarUrlInput}
                    onChange={(event) => setAvatarUrlInput(event.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </button>
              </form>
            ) : (
              <div className={styles.gamesTab}>
                {isLoadingGames && (
                  <p className={styles.gamesState}>Carregando jogos...</p>
                )}

                {!isLoadingGames && gamesError && (
                  <p className={styles.gamesState}>{gamesError}</p>
                )}

                {!isLoadingGames && !gamesError && games && (
                  <>
                    <div className={styles.gamesSection}>
                      <span className={styles.gamesSectionTitle}>
                        <CalendarClock size={14} />
                        Próximos jogos
                      </span>

                      {games.upcoming.length === 0 ? (
                        <p className={styles.gamesEmpty}>
                          Você não tem jogos agendados.
                        </p>
                      ) : (
                        <div className={styles.gamesList}>
                          {games.upcoming.map((game) => (
                            <GameItem key={`${game.id}-upcoming`} game={game} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.gamesSection}>
                      <span className={styles.gamesSectionTitle}>
                        <History size={14} />
                        Histórico
                      </span>

                      {games.history.length === 0 ? (
                        <p className={styles.gamesEmpty}>
                          Você ainda não participou de nenhum jogo.
                        </p>
                      ) : (
                        <div className={styles.gamesList}>
                          {games.history.map((game) => (
                            <GameItem key={`${game.id}-history`} game={game} />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <button type="button" className={styles.logout} onClick={onLogout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
