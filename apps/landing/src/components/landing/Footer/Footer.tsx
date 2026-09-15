import { APP_LINKS } from "@/config/app-links";

import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div>
          <a href="#topo" className={styles.logo}>
            <span>⚽</span>
            Joga Junto
          </a>

          <p className={styles.description}>
            O fim da dor de cabeça para organizar a pelada e gerenciar a sua
            quadra.
          </p>

          <div className={styles.socials}>
            <span>◎</span>
            <span>𝕏</span>
            <span>f</span>
          </div>
        </div>

        <div className={styles.column}>
          <h4>Plataforma</h4>

          <a href="#para-jogadores">Para Jogadores</a>
          <a href="#para-quadras">Para Quadras</a>
          <a href="#como-funciona">Como Funciona</a>
        </div>

        <div className={styles.column}>
          <h4>Acessar</h4>

          <a href={APP_LINKS.player}>Área do Jogador</a>
          <a href={APP_LINKS.admin}>Área da Quadra</a>
        </div>

        <div className={styles.column}>
          <h4>Suporte</h4>

          <a href="#topo">Central de Ajuda</a>
          <a href="#topo">Fale Conosco</a>
          <a href="#topo">Termos de Uso</a>
          <a href="#topo">Privacidade</a>
        </div>
      </div>
    </footer>
  );
}
