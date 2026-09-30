"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { CalendarDays, CookingPot, MapPin, Radio, X } from "lucide-react";

import type { Court } from "@/types/court";

import type { AvailabilitySlot, BookingOptions } from "@/types/booking";

import {
  BookingApiError,
  createBooking,
  getBookingOptions,
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

  const [availability, setAvailability] = useState<BookingOptions | null>(null);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [includeLeisure, setIncludeLeisure] = useState(false);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [captainParticipates, setCaptainParticipates] = useState<
    boolean | null
  >(null);

  const [loading, setLoading] = useState(true);

  const [creatingBooking, setCreatingBooking] = useState(false);

  const [error, setError] = useState("");

  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const selectedArea = useMemo(() => {
    return (
      availability?.leisureAreas.find((area) => area.id === selectedAreaId) ??
      null
    );
  }, [availability, selectedAreaId]);

  const selectedBlock = useMemo(() => {
    return (
      selectedArea?.blocks.find((block) => block.id === selectedBlockId) ?? null
    );
  }, [selectedArea, selectedBlockId]);

  const combinedTotalInCents =
    court.priceInCents +
    (includeLeisure && selectedBlock ? selectedBlock.priceInCents : 0);

  const canConfirm =
    selectedTime !== null &&
    (!includeLeisure ||
      (selectedArea !== null &&
        selectedBlock !== null &&
        captainParticipates !== null));

  async function loadAvailability() {
    setLoading(true);
    setError("");

    try {
      const data = await getBookingOptions(court.slug, selectedDate);

      setAvailability(data);

      setSelectedTime((current) => {
        if (!current) {
          return null;
        }

        const stillAvailable = data.court.slots.some(
          (slot) => slot.time === current && slot.status === "AVAILABLE",
        );

        return stillAvailable ? current : null;
      });

      const currentArea = data.leisureAreas.find(
        (area) => area.id === selectedAreaId,
      );

      const currentBlock = currentArea?.blocks.find(
        (block) => block.id === selectedBlockId && block.status === "AVAILABLE",
      );

      if (selectedAreaId && (!currentArea || !currentBlock)) {
        setSelectedAreaId(null);
        setSelectedBlockId(null);
        setCaptainParticipates(null);
      }
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

  /*
   * Mantém o SSE atual da quadra.
   *
   * O bloqueio definitivo da churrasqueira
   * continua sendo realizado pelo índice
   * UNIQUE no backend.
   */
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

            court: {
              ...current.court,

              slots: current.court.slots.map((slot) => {
                if (slot.time !== event.startTime) {
                  return slot;
                }

                return {
                  ...slot,

                  status:
                    event.type === "BOOKING_CREATED" ? "RESERVED" : "AVAILABLE",
                };
              }),
            },
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

  function resetSelectionsForDate(date: string) {
    setSelectedDate(date);

    setSelectedTime(null);

    setSelectedAreaId(null);
    setSelectedBlockId(null);
    setCaptainParticipates(null);

    setError("");
  }

  function selectCourtSlot(slot: AvailabilitySlot) {
    if (slot.status !== "AVAILABLE") {
      return;
    }

    setError("");
    setSelectedTime(slot.time);
  }

  function handleLeisureToggle(checked: boolean) {
    setIncludeLeisure(checked);
    setError("");

    if (!checked) {
      setSelectedAreaId(null);
      setSelectedBlockId(null);
      setCaptainParticipates(null);
    }
  }

  function selectLeisureArea(areaId: string) {
    setSelectedAreaId(areaId);
    setSelectedBlockId(null);
    setCaptainParticipates(null);
    setError("");
  }

  function selectLeisureBlock(blockId: string) {
    setSelectedBlockId(blockId);
    setError("");
  }

  async function handleConfirmBooking() {
    if (!selectedTime) {
      setError("Selecione o horário da quadra.");

      return;
    }

    if (
      includeLeisure &&
      (!selectedArea || !selectedBlock || captainParticipates === null)
    ) {
      setError(
        "Selecione a churrasqueira, o horário e informe se o capitão participará.",
      );

      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setCreatingBooking(true);
    setError("");

    try {
      const booking = await createBooking(
        {
          courtSlug: court.slug,

          bookingDate: selectedDate,

          startTime: selectedTime,

          expectedPlayers: court.players,

          ...(includeLeisure &&
          selectedArea &&
          selectedBlock &&
          captainParticipates !== null
            ? {
                leisure: {
                  areaId: selectedArea.id,

                  blockId: selectedBlock.id,

                  captainParticipates,
                },
              }
            : {}),
        },

        token,
      );

      router.push(`/reservas/${booking.shareCode}`);
    } catch (err) {
      if (err instanceof BookingApiError && err.status === 409) {
        setError(err.message);

        setSelectedTime(null);
        setSelectedAreaId(null);
        setSelectedBlockId(null);
        setCaptainParticipates(null);

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
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        <header className={styles.header}>
          <div>
            <div className={styles.realtimeBadge}>
              <Radio size={17} />
              Disponibilidade em tempo real
              <span
                className={
                  realtimeConnected ? styles.online : styles.connecting
                }
              />
            </div>

            <h2 id="booking-modal-title">Agende seu horário</h2>

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
                    onClick={() => resetSelectionsForDate(value)}
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
                onChange={(event) => resetSelectionsForDate(event.target.value)}
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
                <span>Valor da quadra</span>

                <strong>{formatCurrency(court.priceInCents)}</strong>
              </div>
            </div>

            {loading ? (
              <div className={styles.stateMessage}>Carregando horários...</div>
            ) : (
              <div className={styles.slots}>
                {availability?.court.slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={slot.status !== "AVAILABLE"}
                    onClick={() => selectCourtSlot(slot)}
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
          </article>

          {availability && availability.leisureAreas.length > 0 && (
            <article className={styles.leisurePanel}>
              <label className={styles.leisureToggle}>
                <input
                  type="checkbox"
                  checked={includeLeisure}
                  onChange={(event) =>
                    handleLeisureToggle(event.target.checked)
                  }
                />

                <span className={styles.toggleIcon}>
                  <CookingPot size={22} />
                </span>

                <span>
                  <strong>Adicionar churrasqueira</strong>

                  <small>Reserve uma área de lazer junto com a quadra.</small>
                </span>
              </label>

              {includeLeisure && (
                <div className={styles.leisureContent}>
                  <div className={styles.leisureHeading}>
                    <span>1. Escolha a área</span>
                  </div>

                  <div className={styles.areaGrid}>
                    {availability.leisureAreas.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => selectLeisureArea(area.id)}
                        className={[
                          styles.areaButton,

                          selectedAreaId === area.id ? styles.areaSelected : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <CookingPot size={20} />

                        <span>
                          <strong>{area.name}</strong>

                          <small>{area.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedArea && (
                    <>
                      <div className={styles.leisureHeading}>
                        <span>2. Escolha o horário</span>
                      </div>

                      <div className={styles.blockGrid}>
                        {selectedArea.blocks.map((block) => (
                          <button
                            key={block.id}
                            type="button"
                            disabled={block.status !== "AVAILABLE"}
                            onClick={() => selectLeisureBlock(block.id)}
                            className={[
                              styles.leisureBlock,

                              block.status === "AVAILABLE"
                                ? styles.available
                                : "",

                              block.status === "RESERVED"
                                ? styles.reserved
                                : "",

                              block.status === "UNAVAILABLE"
                                ? styles.unavailable
                                : "",

                              selectedBlockId === block.id
                                ? styles.selected
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <strong>
                              {block.startTime} – {block.endTime}
                            </strong>

                            <span>
                              {block.status === "AVAILABLE"
                                ? formatCurrency(block.priceInCents)
                                : block.status === "RESERVED"
                                  ? "Reservado"
                                  : "Indisponível"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedBlock && (
                    <fieldset className={styles.participationChoice}>
                      <legend>3. O capitão participará do churrasco?</legend>

                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name="captainParticipates"
                          checked={captainParticipates === true}
                          onChange={() => setCaptainParticipates(true)}
                        />
                        Sim, participarei
                      </label>

                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name="captainParticipates"
                          checked={captainParticipates === false}
                          onChange={() => setCaptainParticipates(false)}
                        />
                        Não participarei
                      </label>
                    </fieldset>
                  )}
                </div>
              )}
            </article>
          )}

          {error && <p className={styles.error}>{error}</p>}

          {selectedTime && (
            <div className={styles.confirmation}>
              <div>
                <span>Quadra selecionada</span>

                <strong>
                  {formatFullDate(selectedDate)} às {selectedTime}
                </strong>
              </div>

              <div>
                <span>Valor da quadra</span>

                <strong>{formatCurrency(court.priceInCents)}</strong>
              </div>

              {includeLeisure && selectedArea && selectedBlock && (
                <div>
                  <span>{selectedArea.name}</span>

                  <strong>
                    {selectedBlock.startTime} – {selectedBlock.endTime}
                  </strong>
                </div>
              )}

              <div>
                <span>Total reservado</span>

                <strong>{formatCurrency(combinedTotalInCents)}</strong>
              </div>

              <button
                type="button"
                disabled={creatingBooking || !canConfirm}
                onClick={handleConfirmBooking}
                className={styles.confirmButton}
              >
                {creatingBooking ? "Reservando..." : "Confirmar reserva"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
