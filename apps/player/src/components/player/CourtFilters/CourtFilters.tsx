import {
  CircleDollarSign,
  LocateFixed,
  SlidersHorizontal,
  X,
} from "lucide-react";

import styles from "./CourtFilters.module.css";

export type SortMode = "distance" | "price" | null;

type CourtFiltersProps = {
  types: string[];
  selectedType: string | null;

  sortMode: SortMode;
  isLocating: boolean;
  locationError: string | null;

  hasActiveFilters: boolean;
  resultCount: number;

  onSelectType: (type: string) => void;
  onSelectSort: (mode: "distance" | "price") => void;
  onReset: () => void;
};

export function CourtFilters({
  types,
  selectedType,
  sortMode,
  isLocating,
  locationError,
  hasActiveFilters,
  resultCount,
  onSelectType,
  onSelectSort,
  onReset,
}: CourtFiltersProps) {
  return (
    <aside className={styles.filters}>
      <div className={styles.title}>
        <SlidersHorizontal size={18} />

        <h2>Filtros</h2>

        {hasActiveFilters && (
          <button type="button" className={styles.reset} onClick={onReset}>
            <X size={13} />
            Limpar
          </button>
        )}
      </div>

      {types.length > 0 && (
        <div className={styles.group}>
          <label className={styles.groupLabel} htmlFor="court-type-select">
            Tipo de quadra
          </label>

          <select
            id="court-type-select"
            className={styles.select}
            value={selectedType ?? ""}
            onChange={(event) => onSelectType(event.target.value)}
          >
            <option value="">Todos os tipos</option>

            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.group}>
        <span className={styles.groupLabel}>Ordenar</span>

        <div className={styles.options}>
          <button
            type="button"
            aria-pressed={sortMode === "distance"}
            className={
              sortMode === "distance" ? styles.optionActive : undefined
            }
            disabled={isLocating}
            onClick={() => onSelectSort("distance")}
          >
            <LocateFixed size={18} />
            {isLocating
              ? "Localizando..."
              : sortMode === "distance"
                ? "Mais próximas"
                : "Usar minha localização"}
          </button>

          <button
            type="button"
            aria-pressed={sortMode === "price"}
            className={sortMode === "price" ? styles.optionActive : undefined}
            onClick={() => onSelectSort("price")}
          >
            <CircleDollarSign size={18} />
            Menor preço
          </button>
        </div>

        {locationError && (
          <span className={styles.locationError}>{locationError}</span>
        )}
      </div>

      <p>
        {resultCount === 1
          ? "1 quadra encontrada."
          : `${resultCount} quadras encontradas.`}
      </p>
    </aside>
  );
}
