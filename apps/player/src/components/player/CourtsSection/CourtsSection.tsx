import type { Court } from "@/types/court";

import { CourtCard } from "../CourtCard/CourtCard";
import { CourtFilters } from "../CourtFilters/CourtFilters";

import styles from "./CourtsSection.module.css";

type CourtsSectionProps = {
  courts: Court[];
  error?: string;
};

export function CourtsSection({ courts, error }: CourtsSectionProps) {
  return (
    <section id="quadras" className={styles.section}>
      <div className="container">
        <div className={styles.heading}>
          <span>Encontre seu próximo jogo</span>

          <h1>Reserve uma quadra</h1>

          <p>
            Veja as quadras disponíveis nos complexos parceiros do Joga Junto.
          </p>
        </div>

        <div className={styles.layout}>
          <div>
            {error ? (
              <div className={styles.message}>
                <h2>Não foi possível carregar as quadras</h2>
                <p>{error}</p>
              </div>
            ) : courts.length === 0 ? (
              <div className={styles.message}>
                <h2>Nenhuma quadra disponível</h2>

                <p>
                  Ainda não existem quadras ativas vinculadas a complexos
                  ativos.
                </p>
              </div>
            ) : (
              <div className={styles.grid}>
                {courts.map((court) => (
                  <CourtCard key={court.id} court={court} />
                ))}
              </div>
            )}
          </div>

          <CourtFilters />
        </div>
      </div>
    </section>
  );
}
