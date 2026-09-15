import { APP_LINKS } from "@/config/app-links";
import { heroBenefits } from "@/data/landing";

import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section id="topo" className={styles.hero}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.content}>
          <span className={styles.pill}>A revolução do esporte amador</span>

          <h1>
            O fim da dor de cabeça para organizar a pelada e gerenciar a sua
            quadra.
          </h1>

          <p className={styles.description}>
            Joga Junto conecta atletas e complexos esportivos em uma plataforma
            feita para organizar jogos, reservas, pagamentos e gestão sem
            burocracia.
          </p>

          <div className={styles.actions}>
            <a
              href={APP_LINKS.player}
              className={`${styles.button} ${styles.primary}`}
            >
              Sou Atleta
              <span>Organizar Jogo</span>
            </a>

            <a
              href={APP_LINKS.admin}
              className={`${styles.button} ${styles.secondary}`}
            >
              Sou Dono de Quadra
            </a>
          </div>

          <div className={styles.benefits}>
            {heroBenefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div key={benefit.label} className={styles.benefit}>
                  <Icon size={18} />
                  <span>{benefit.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={styles.media}
          role="img"
          aria-label="Entrada de uma arena esportiva"
        />
      </div>
    </section>
  );
}
