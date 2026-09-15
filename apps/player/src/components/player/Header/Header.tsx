import Link from "next/link";

import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.content}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>⚽</span>

          <span>Joga Junto</span>
        </Link>

        <Link href="/login" className={styles.loginButton}>
          Login
        </Link>
      </div>
    </header>
  );
}
