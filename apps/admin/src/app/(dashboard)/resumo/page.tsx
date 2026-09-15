"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  CircleDot,
  MapPin,
  ShieldCheck,
  UserRound,
  Warehouse,
} from "lucide-react";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { ApiError, getAdminCourts } from "@/services/admin-api";
import type { AdminCourt } from "@/types/admin";
import { createDashboardSummary } from "@/utils/dashboard";

import styles from "./Dashboard.module.css";

export default function DashboardPage() {
  const { admin, complex } = useAdminAuth();

  const [courts, setCourts] = useState<AdminCourt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCourts() {
      try {
        setIsLoading(true);
        setError("");

        const response = await getAdminCourts();

        setCourts(response.courts);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Não foi possível carregar as quadras.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCourts();
  }, []);

  const summary = createDashboardSummary(courts);
  const address = complex?.address;

  const formattedAddress = address
    ? [
        `${address.street}, ${address.number}`,
        address.complement,
        address.neighborhood,
        `${address.city} - ${address.state}`,
      ]
        .filter(Boolean)
        .join(" - ")
    : "Endereço não informado";

  return (
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.cards}>
        <article className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Quadras Cadastradas</span>
            <strong className={styles.summaryValue}>
              {isLoading ? "..." : summary.totalCourts}
            </strong>
            <span className={styles.summaryDescription}>
              Total vinculado ao complexo
            </span>
          </div>

          <div className={styles.summaryIcon}>
            <CircleDot size={27} />
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Quadras Ativas</span>
            <strong className={`${styles.summaryValue} ${styles.greenValue}`}>
              {isLoading ? "..." : summary.activeCourts}
            </strong>
            <span className={styles.summaryDescription}>
              Disponíveis no sistema
            </span>
          </div>

          <div className={`${styles.summaryIcon} ${styles.greenIcon}`}>
            <ShieldCheck size={27} />
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Horários Padrão</span>
            <strong className={styles.summaryValue}>
              {isLoading ? "..." : summary.totalDefaultTimes}
            </strong>
            <span className={styles.summaryDescription}>
              Horários cadastrados nas quadras
            </span>
          </div>

          <div className={styles.summaryIcon}>
            <CalendarClock size={27} />
          </div>
        </article>

        <article className={`${styles.summaryCard} ${styles.statusCard}`}>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>Status do Complexo</span>

            <strong className={styles.summaryStatus}>
              <span
                className={
                  complex?.isActive
                    ? styles.statusIndicator
                    : styles.statusIndicatorInactive
                }
              />
              {complex?.isActive ? "Ativo" : "Inativo"}
            </strong>

            <span className={styles.summaryDescription}>Situação atual</span>
          </div>

          <div className={`${styles.summaryIcon} ${styles.greenIcon}`}>
            <Warehouse size={27} />
          </div>
        </article>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>GESTÃO DA ARENA</span>
              <h2>{complex?.name ?? "Complexo esportivo"}</h2>
            </div>
          </div>

          <div className={styles.arenaOverview}>
            <div className={styles.arenaInfoRow}>
              <div className={styles.arenaInfoIcon}>
                <MapPin size={20} />
              </div>

              <div className={styles.arenaInfoText}>
                <span>Endereço</span>
                <strong>{formattedAddress}</strong>
              </div>
            </div>

            <div className={styles.arenaInfoRow}>
              <div className={styles.arenaInfoIcon}>
                <UserRound size={20} />
              </div>

              <div className={styles.arenaInfoText}>
                <span>Administrador responsável</span>
                <strong>{admin?.name ?? "Não informado"}</strong>
                <small>{admin?.email ?? ""}</small>
              </div>
            </div>

            <div className={styles.arenaInfoRow}>
              <div className={styles.arenaInfoIcon}>
                <CircleDot size={20} />
              </div>

              <div className={styles.arenaInfoText}>
                <span>Localização</span>
                <strong>{complex?.location || "Não informada"}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>QUADRAS</span>
              <h2>Visão rápida</h2>
            </div>
          </div>

          <div className={styles.courtOverviewList}>
            {isLoading ? (
              <div className={styles.empty}>Carregando quadras...</div>
            ) : courts.length === 0 ? (
              <div className={styles.empty}>Nenhuma quadra cadastrada.</div>
            ) : (
              courts.slice(0, 4).map((court) => (
                <div key={court.id} className={styles.courtOverviewItem}>
                  <div className={styles.courtOverviewText}>
                    <strong>{court.name}</strong>
                    <span>
                      {court.type} • {court.surface}
                    </span>
                  </div>

                  <div className={styles.courtOverviewStatus}>
                    <span
                      className={`${styles.courtStatusDot} ${
                        court.isActive
                          ? styles.courtStatusActive
                          : styles.courtStatusInactive
                      }`}
                    />
                    {court.isActive ? "Ativa" : "Inativa"}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
