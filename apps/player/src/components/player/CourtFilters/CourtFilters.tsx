import {
  CircleDollarSign,
  MapPin,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";

import styles from "./CourtFilters.module.css";

export function CourtFilters() {
  return (
    <aside className={styles.filters}>
      <div className={styles.title}>
        <SlidersHorizontal size={18} />

        <h2>Filtros</h2>
      </div>

      <div className={styles.options}>
        <button type="button">
          <MapPin size={18} />
          Localidade
        </button>

        <button type="button">
          <Trophy size={18} />
          Futebol
        </button>

        <button type="button">
          <Trophy size={18} />
          Vôlei
        </button>

        <button type="button">
          <CircleDollarSign size={18} />
          Menor preço
        </button>
      </div>

      <p>Os filtros serão habilitados em uma próxima etapa.</p>
    </aside>
  );
}
