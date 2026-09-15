"use client";

import { Clock3, Pencil, Users } from "lucide-react";

import type { AdminCourt } from "@/types/admin";

import styles from "./CourtCard.module.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type CourtCardProps = {
  court: AdminCourt;
  onEdit: (court: AdminCourt) => void;
};

export function CourtCard({ court, onEdit }: CourtCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3>{court.name}</h3>

          <span className={styles.type}>
            {court.type} • {court.surface}
          </span>
        </div>

        <div className={styles.status}>
          <span
            className={`${styles.statusDot} ${
              court.isActive ? styles.active : styles.inactive
            }`}
          />
          {court.isActive ? "Ativa" : "Inativa"}
        </div>
      </div>

      {court.highlight && (
        <span className={styles.highlight}>{court.highlight}</span>
      )}

      <div className={styles.details}>
        <div>
          <span>Preço por hora</span>
          <strong>{currencyFormatter.format(court.priceInCents / 100)}</strong>
        </div>

        <div>
          <span>
            <Users size={15} />
            Jogadores
          </span>
          <strong>{court.players}</strong>
        </div>
      </div>

      <div className={styles.times}>
        <span className={styles.timesTitle}>
          <Clock3 size={15} />
          Horários disponíveis
        </span>

        <div className={styles.timesList}>
          {court.times.map((time) => (
            <span key={time}>{time}</span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.edit}
        onClick={() => onEdit(court)}
      >
        <Pencil size={16} />
        Editar
      </button>
    </article>
  );
}
