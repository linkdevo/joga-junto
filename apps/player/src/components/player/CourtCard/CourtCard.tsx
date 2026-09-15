import { CourtBookingButton } from "../CourtBookingButton/CourtBookingButton";
import { Building2, Clock3, MapPin, Users } from "lucide-react";

import type { Court } from "@/types/court";

import styles from "./CourtCard.module.css";

type CourtCardProps = {
  court: Court;
};

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function CourtCard({ court }: CourtCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <img src={court.imageUrl} alt={court.name} className={styles.image} />

        <div className={styles.imageOverlay} />

        {court.highlight && (
          <span className={styles.highlight}>{court.highlight}</span>
        )}

        <div className={styles.imageTitle}>
          <h3>{court.name}</h3>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tags}>
          <span>{court.type}</span>
          <span>{court.surface}</span>
        </div>

        <p className={styles.description}>{court.description}</p>

        <div className={styles.complex}>
          <Building2 size={18} />

          <div>
            <span>Complexo</span>
            <strong>{court.complex.name}</strong>
          </div>
        </div>

        <div className={styles.location}>
          <MapPin size={16} />

          <span>
            {court.complex.address.neighborhood}, {court.complex.address.city} -{" "}
            {court.complex.address.state}
          </span>
        </div>

        <div className={styles.infoGrid}>
          <div>
            <span>A partir de</span>

            <strong>{formatCurrency(court.priceInCents)}</strong>
          </div>

          <div>
            <span>Jogadores</span>

            <strong>
              <Users size={16} />
              {court.players}
            </strong>
          </div>

          <div>
            <span>Horários</span>

            <strong>
              <Clock3 size={16} />
              {court.times.length}
            </strong>
          </div>
        </div>

        <CourtBookingButton court={court} className={styles.button} />
      </div>
    </article>
  );
}
