"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  MapPin,
} from "lucide-react";

import { ApiError, getAdminCourts } from "@/services/admin-api";
import type { AdminCourt } from "@/types/admin";
import {
  buildMonthCalendar,
  formatDatePtBr,
  formatPrice,
  getMonthName,
} from "@/utils/agenda";

import styles from "./Agenda.module.css";

const WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function AgendaPage() {
  const today = useMemo(() => new Date(), []);

  const [courts, setCourts] = useState<AdminCourt[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState("");

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCourts() {
      try {
        setIsLoading(true);
        setError("");

        const response = await getAdminCourts();
        const activeCourts = response.courts.filter((court) => court.isActive);

        setCourts(activeCourts);

        if (activeCourts.length > 0) {
          setSelectedCourtId(activeCourts[0].id);
        }
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Não foi possível carregar a agenda.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCourts();
  }, []);

  const selectedCourt = useMemo(
    () => courts.find((court) => court.id === selectedCourtId) ?? null,
    [courts, selectedCourtId],
  );

  const calendar = useMemo(
    () => buildMonthCalendar(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  const selectedDate = formatDatePtBr(
    currentYear,
    currentMonth,
    selectedDay,
  );

  function previousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth((month) => month - 1);
    }

    setSelectedDay(1);
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth((month) => month + 1);
    }

    setSelectedDay(1);
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Carregando agenda...</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.toolbar}>
        <div className={styles.toolbarTitle}>
          <span className={styles.badge}>
            <CalendarDays size={16} />
            Gestão da Arena
          </span>

          <h2>Controle de Agenda Mensal</h2>

          <p>
            Data selecionada: <strong>{selectedDate}</strong>
          </p>
        </div>

        {courts.length > 0 && (
          <div className={styles.toolbarActions}>
            <label htmlFor="court-filter">Filtrar Quadra:</label>

            <select
              id="court-filter"
              value={selectedCourtId}
              onChange={(event) => setSelectedCourtId(event.target.value)}
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name} ({court.type})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {courts.length === 0 ? (
        <section className={styles.noCourts}>
          <CircleDot size={42} />
          <h3>Nenhuma quadra ativa</h3>
          <p>Cadastre ou ative uma quadra antes de configurar a agenda.</p>
        </section>
      ) : (
        <section className={styles.grid}>
          <article className={styles.calendarPanel}>
            <div className={styles.calendarHeader}>
              <button
                type="button"
                onClick={previousMonth}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={19} />
              </button>

              <h3>{getMonthName(currentYear, currentMonth)}</h3>

              <button
                type="button"
                onClick={nextMonth}
                aria-label="Próximo mês"
              >
                <ChevronRight size={19} />
              </button>
            </div>

            <p className={styles.calendarDescription}>
              Clique em um dia para visualizar os horários.
            </p>

            <div className={styles.calendarWeek}>
              {WEEK_DAYS.map((weekDay) => (
                <span key={weekDay}>{weekDay}</span>
              ))}
            </div>

            <div className={styles.calendarDays}>
              {calendar.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className={`${styles.calendarDay} ${styles.calendarDayEmpty}`}
                    />
                  );
                }

                const isSelected = day === selectedDay;

                const isToday =
                  day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear();

                return (
                  <button
                    key={day}
                    type="button"
                    className={[
                      styles.calendarDay,
                      isSelected ? styles.calendarDaySelected : "",
                      isToday ? styles.calendarDayToday : "",
                    ].join(" ")}
                    onClick={() => setSelectedDay(day)}
                  >
                    <span>{day}</span>
                    {isToday && <small>Hoje</small>}
                  </button>
                );
              })}
            </div>

            <div className={styles.calendarSummary}>
              <span>Horários padrão</span>
              <strong>{selectedCourt?.times.length ?? 0}</strong>
              <small>cadastrados na quadra</small>
            </div>
          </article>

          <article className={styles.schedulePanel}>
            <div className={styles.scheduleHeader}>
              <div>
                <span className={styles.eyebrow}>AGENDA DA QUADRA</span>

                <h3>Grade Horária de Jogos ({selectedDate})</h3>
              </div>

              <div className={styles.legend}>
                <span>
                  <i className={styles.statusFree} />
                  Livre
                </span>

                <span className={styles.legendDisabled}>
                  <i className={styles.statusReserved} />
                  Reservado
                </span>

                <span className={styles.legendDisabled}>
                  <i className={styles.statusBlocked} />
                  Bloqueado
                </span>
              </div>
            </div>

            {selectedCourt && (
              <div className={styles.courtSchedule}>
                <div className={styles.courtScheduleHeader}>
                  <div>
                    <h4>{selectedCourt.name}</h4>
                    <span>
                      {selectedCourt.type} • {selectedCourt.surface}
                    </span>
                  </div>

                  <div className={styles.courtScheduleMeta}>
                    <span>
                      <MapPin size={14} />
                      {selectedCourt.location}
                    </span>

                    <strong>{formatPrice(selectedCourt.priceInCents)}/h</strong>
                  </div>
                </div>

                {selectedCourt.times.length === 0 ? (
                  <div className={styles.scheduleEmpty}>
                    <Clock3 size={35} />
                    <h4>Nenhum horário cadastrado</h4>
                    <p>
                      Configure os horários padrão desta quadra na aba Quadras &
                      Preços.
                    </p>
                  </div>
                ) : (
                  <div className={styles.timeGrid}>
                    {selectedCourt.times.map((time) => (
                      <div key={time} className={styles.timeCard}>
                        <div className={styles.timeCardTop}>
                          <Clock3 size={17} />
                          <strong>{time}</strong>
                        </div>

                        <span className={styles.timePrice}>
                          {formatPrice(selectedCourt.priceInCents)}
                        </span>

                        <div className={styles.timeStatus}>Livre</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.note}>
                  <strong>Grade padrão</strong>
                  <p>
                    Estes horários correspondem aos horários cadastrados
                    atualmente para esta quadra.
                  </p>
                </div>
              </div>
            )}
          </article>
        </section>
      )}
    </div>
  );
}
