import { APP_LINKS } from "@/config/app-links";

import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.content}`}>
        <a
          href="#topo"
          className={styles.logo}
          aria-label="Joga Junto - Página inicial"
        >
          <span className={styles.logoMark}>⚽</span>
          <span>Joga Junto</span>
        </a>

        <nav className={styles.navigation} aria-label="Navegação principal">
          <a href="#para-jogadores">Para Jogadores</a>
          <a href="#para-quadras">Para Quadras</a>
          <a href="#como-funciona">Como Funciona</a>
        </nav>

        <a href={APP_LINKS.player} className={styles.playerButton}>
          Área do Jogador
        </a>
      </div>
    </header>
  );
}
