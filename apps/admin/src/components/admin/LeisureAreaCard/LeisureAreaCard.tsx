"use client";

import { Clock3, Pencil } from "lucide-react";

import type { AdminLeisureArea } from "@/types/admin";

import styles from "../CourtCard/CourtCard.module.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type LeisureAreaCardProps = {
  area: AdminLeisureArea;
  onEdit: (area: AdminLeisureArea) => void;
};

export function LeisureAreaCard({ area, onEdit }: LeisureAreaCardProps) {
  const activeBlocks = area.blocks.filter((block) => block.isActive);

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3>{area.name}</h3>

          <span className={styles.type}>{area.description}</span>
        </div>

        <div className={styles.status}>
          <span
            className={`${styles.statusDot} ${
              area.isActive ? styles.active : styles.inactive
            }`}
          />
          {area.isActive ? "Ativa" : "Inativa"}
        </div>
      </div>

      <div className={styles.times}>
        <span className={styles.timesTitle}>
          <Clock3 size={15} />
          Horários ({activeBlocks.length} ativos)
        </span>

        <div className={styles.timesList}>
          {area.blocks.map((block) => (
            <span key={block.id} style={{ opacity: block.isActive ? 1 : 0.45 }}>
              {block.startTime}–{block.endTime} •{" "}
              {currencyFormatter.format(block.priceInCents / 100)}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.edit}
        onClick={() => onEdit(area)}
      >
        <Pencil size={16} />
        Editar
      </button>
    </article>
  );
}
