"use client";

import {
  COURT_TIME_OPTIONS,
  sortUniqueTimes,
} from "@/features/courts/court-form";

import styles from "./CourtTimeSelector.module.css";

type CourtTimeSelectorProps = {
  value: string[];
  onChange: (times: string[]) => void;
};

export function CourtTimeSelector({
  value,
  onChange,
}: CourtTimeSelectorProps) {
  const availableTimes = sortUniqueTimes([...COURT_TIME_OPTIONS, ...value]);

  function toggleTime(time: string) {
    if (value.includes(time)) {
      onChange(value.filter((currentTime) => currentTime !== time));
      return;
    }

    onChange(sortUniqueTimes([...value, time]));
  }

  return (
    <div className={styles.selector}>
      {availableTimes.map((time) => {
        const isSelected = value.includes(time);

        return (
          <button
            key={time}
            type="button"
            aria-pressed={isSelected}
            className={`${styles.chip} ${
              isSelected ? styles.chipActive : ""
            }`}
            onClick={() => toggleTime(time)}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}
