"use client";

import { useMemo } from "react";
import styles from "./MockPixQr.module.css";

type MockPixQrProps = {
  value: string;
};

export function MockPixQr({ value }: MockPixQrProps) {
  const cells = useMemo(() => {
    const source = value || "jogajunto";
    return Array.from({ length: 144 }, (_, index) => {
      const charCode = source.charCodeAt(index % source.length);
      return (charCode + index * 11) % 3 === 0;
    });
  }, [value]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.qr}>
        {cells.map((filled, index) => (
          <span key={index} className={filled ? styles.filled : styles.empty} />
        ))}
      </div>
      <small>QR Code ilustrativo</small>
    </div>
  );
}
