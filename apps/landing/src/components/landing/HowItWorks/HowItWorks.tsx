import { howItWorksSteps } from "@/data/landing";

import styles from "./HowItWorks.module.css";

export function HowItWorks() {
  return (
    <section id="como-funciona" className={styles.section}>
      <div className="container">
        <div className={styles.heading}>
          <h2>Como Funciona</h2>

          <p>
            Do primeiro convite ao apito inicial, organize sua partida em poucos
            passos.
          </p>
        </div>

        <div className={styles.grid}>
          {howItWorksSteps.map((step) => (
            <article key={step.number} className={styles.step}>
              <span className={styles.number}>{step.number}</span>

              <h3>{step.title}</h3>

              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
