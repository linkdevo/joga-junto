import type { LandingFeature } from "@/data/landing";

import styles from "./FeaturesSection.module.css";

type FeaturesSectionProps = {
  id: string;
  title: string;
  description: string;
  features: LandingFeature[];
  compact?: boolean;
};

export function FeaturesSection({
  id,
  title,
  description,
  features,
  compact = false,
}: FeaturesSectionProps) {
  return (
    <section
      id={id}
      className={`${styles.section} ${compact ? styles.compact : ""}`}
    >
      <div className="container">
        <div className={styles.heading}>
          <h2>{title}</h2>
          <p>{description}</p>
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
                  <Icon size={26} strokeWidth={2} />
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
