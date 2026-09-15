"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { CalendarDays, CheckCircle2, MapPin, Radio, X } from "lucide-react";

import type { Court } from "@/types/court";
import type { AvailabilitySlot, CourtAvailability } from "@/types/booking";

import {
  BookingApiError,
  createBooking,
  getCourtAvailability,
  subscribeCourtAvailability,
} from "@/services/booking.service";

import { getToken } from "@/lib/auth";

import styles from "./BookingCalendar.module.css";

type BookingCalendarProps = {
  court: Court;
  onClose: () => void;
};

function getLocalDateValue(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);

  result.setDate(result.getDate() + amount);

  return result;
}

function formatQuickDate(date: Date, index: number) {
  if (index === 0) {
    return "Hoje";
  }

  if (index === 1) {
    return "Amanhã";
  }

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "");

  const day = String(date.getDate()).padStart(2, "0");

  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${weekday} ${day}/${month}`;
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function formatFullDate(date: string) {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

export function BookingCalendar({ court, onClose }: BookingCalendarProps) {
  const router = useRouter();

  const today = useMemo(() => new Date(), []);

  const todayValue = useMemo(() => getLocalDateValue(today), [today]);

  const quickDates = useMemo(
    () => Array.from({ length: 5 }, (_, index) => addDays(today, index)),
    [today],
  );

  const [selectedDate, setSelectedDate] = useState(todayValue);

  const [availability, setAvailability] = useState<CourtAvailability | null>(
    null,
  );

  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [creatingBooking, setCreatingBooking] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [realtimeConnected, setRealtimeConnected] = useState(false);

  async function loadAvailability() {
    setLoading(true);
    setError("");

    try {
      const data = await getCourtAvailability(court.slug, selectedDate);

      setAvailability(data);

      setSelectedTime((current) => {
        if (!current) {
          return null;
        }

        const stillAvailable = data.slots.some(
          (slot) => slot.time === current && slot.status === "AVAILABLE",
        );

        return stillAvailable ? current : null;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os horários.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAvailability();
  }, [court.slug, selectedDate]);

  useEffect(() => {
    const unsubscribe = subscribeCourtAvailability(
      court.slug,
      selectedDate,

      (event) => {
        if (
          event.courtSlug !== court.slug ||
          event.bookingDate !== selectedDate
        ) {
          return;
        }

        setAvailability((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            slots: current.slots.map((slot) => {
              if (slot.time !== event.startTime) {
                return slot;
              }

              if (event.type === "BOOKING_CREATED") {
                return {
                  ...slot,
                  status: "RESERVED",
                };
              }

              return {
                ...slot,
                status: "AVAILABLE",
              };
            }),
          };
        });

        if (event.type === "BOOKING_CREATED") {
          setSelectedTime((current) => {
            if (current !== event.startTime) {
              return current;
            }

            setError("Este horário acabou de ser reservado por outro usuário.");

            return null;
          });
        }
      },

      setRealtimeConnected,
    );

    return unsubscribe;
  }, [court.slug, selectedDate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function selectSlot(slot: AvailabilitySlot) {
    if (slot.status !== "AVAILABLE") {
      return;
    }

    setError("");
    setSuccess("");

    setSelectedTime(slot.time);
  }

  async function handleConfirmBooking() {
    if (!selectedTime) {
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setCreatingBooking(true);
    setError("");
    setSuccess("");

    try {
      const booking = await createBooking(
        {
          courtSlug: court.slug,
          bookingDate: selectedDate,
          startTime: selectedTime,
          expectedPlayers: court.players,
        },
        token,
      );

      router.push(`/reservas/${booking.shareCode}`);
    } catch (err) {
      if (err instanceof BookingApiError && err.status === 409) {
        setError(
          "Este horário acabou de ser reservado. Escolha outro horário.",
        );

        setSelectedTime(null);

        await loadAvailability();

        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar a reserva.",
      );
    } finally {
      setCreatingBooking(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className={styles.modal}>
        <header className={styles.header}>
          <div>
            <div className={styles.realtimeBadge}>
              <Radio size={17} />
              Disponibilidade de Quadras em Tempo Real
              <span
                className={
                  realtimeConnected ? styles.online : styles.connecting
                }
              />
            </div>

            <h2>Agende seu Horário</h2>

            <p>
              <MapPin size={18} />
              {court.complex.name} — {court.complex.address.neighborhood},{" "}
              {court.complex.address.city} - {court.complex.address.state}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={27} />
          </button>
        </header>

        <div className={styles.dateArea}>
          <div className={styles.dateRow}>
            <div className={styles.dateLabel}>
              <CalendarDays size={21} />
              <strong>Data:</strong>
            </div>

            <div className={styles.quickDates}>
              {quickDates.map((date, index) => {
                const value = getLocalDateValue(date);

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelectedDate(value);

                      setSelectedTime(null);

                      setSuccess("");
                    }}
                    className={selectedDate === value ? styles.activeDate : ""}
                  >
                    {formatQuickDate(date, index)}
                  </button>
                );
              })}

              <input
                type="date"
                min={todayValue}
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);

                  setSelectedTime(null);

                  setSuccess("");
                }}
                className={styles.dateInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.legend}>
          <span>
            <i className={styles.freeLegend} />
            Livre
          </span>

          <span>
            <i className={styles.reservedLegend} />
            Reservado
          </span>

          <span>
            <i className={styles.unavailableLegend} />
            Indisponível
          </span>
        </div>

        <div className={styles.content}>
          <article className={styles.courtPanel}>
            <div className={styles.courtHeading}>
              <div>
                <h3>{court.name}</h3>

                <p>
                  {court.surface} • {court.type}
                </p>
              </div>

              <div className={styles.price}>
                <span>A partir de</span>

                <strong>{formatCurrency(court.priceInCents)}</strong>
              </div>
            </div>

            {loading ? (
              <div className={styles.stateMessage}>Carregando horários...</div>
            ) : (
              <div className={styles.slots}>
                {availability?.slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={slot.status !== "AVAILABLE"}
                    onClick={() => selectSlot(slot)}
                    className={[
                      styles.slot,

                      slot.status === "AVAILABLE" ? styles.available : "",

                      slot.status === "RESERVED" ? styles.reserved : "",

                      slot.status === "UNAVAILABLE" ? styles.unavailable : "",

                      selectedTime === slot.time ? styles.selected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <strong>{slot.time}</strong>

                    <span>
                      {slot.status === "AVAILABLE"
                        ? formatCurrency(court.priceInCents)
                        : slot.status === "RESERVED"
                          ? "Reservado"
                          : "Indisponível"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            {success && (
              <p className={styles.success}>
                <CheckCircle2 size={18} />

                {success}
              </p>
            )}

            {selectedTime && (
              <div className={styles.confirmation}>
                <div>
                  <span>Reserva selecionada</span>

                  <strong>
                    {formatFullDate(selectedDate)} às {selectedTime}
                  </strong>
                </div>

                <div>
                  <span>Valor da quadra</span>

                  <strong>{formatCurrency(court.priceInCents)}</strong>
                </div>

                <div>
                  <span>Jogadores</span>

                  <strong>{court.players}</strong>
                </div>

                <button
                  type="button"
                  disabled={creatingBooking}
                  onClick={handleConfirmBooking}
                  className={styles.confirmButton}
                >
                  {creatingBooking ? "Reservando..." : "Confirmar Reserva"}
                </button>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
