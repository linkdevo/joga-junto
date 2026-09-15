import { Share2, ShieldCheck, Trophy } from "lucide-react";

import styles from "./PlayerFeatures.module.css";

const features = [
  {
    title: "Votação de MVP",
    description:
      "Vote no melhor jogador após a partida e acompanhe os destaques do seu grupo.",
    icon: Trophy,
    featured: true,
  },
  {
    title: "Ranking de Goleadores",
    description:
      "Acompanhe a artilharia e veja quem está liderando o ranking do seu time.",
    icon: Trophy,
  },
  {
    title: "Melhor do Mês",
    description:
      "Pontuação por presença, vitória e empate para acompanhar os destaques do mês.",
    icon: ShieldCheck,
  },
  {
    title: "Relatórios no WhatsApp",
    description:
      "Receba estatísticas, resultados e informações do seu time diretamente no WhatsApp.",
    icon: Share2,
  },
];

export function PlayerFeatures() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.heading}>
          <span>Mais do que reservas</span>

          <h2>Tudo para organizar seu time</h2>

          <p>Recursos que vão transformar a organização das suas partidas.</p>
        </div>

        <div className={styles.grid}>
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className={`${styles.card} ${
                  feature.featured ? styles.featured : ""
                }`}
              >
                <div className={styles.icon}>
                  <Icon size={27} />
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>

                <span className={styles.status}>Em breve</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
