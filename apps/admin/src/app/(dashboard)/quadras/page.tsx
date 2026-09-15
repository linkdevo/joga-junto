"use client";

import { useEffect, useState } from "react";
import { CircleDot, Plus, RefreshCcw } from "lucide-react";

import { CourtCard } from "@/components/admin/CourtCard/CourtCard";
import { CourtModal } from "@/components/admin/CourtModal/CourtModal";
import { ApiError, getAdminCourts } from "@/services/admin-api";
import type { AdminCourt } from "@/types/admin";

import styles from "./Courts.module.css";

export default function CourtsPage() {
  const [courts, setCourts] = useState<AdminCourt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCourt, setSelectedCourt] = useState<AdminCourt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadCourts() {
    try {
      setIsLoading(true);
      setError(null);

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

  useEffect(() => {
    void loadCourts();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function openCreateModal() {
    setModalMode("create");
    setSelectedCourt(null);
    setIsModalOpen(true);
  }

  function openEditModal(court: AdminCourt) {
    setModalMode("edit");
    setSelectedCourt(court);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedCourt(null);
  }

  function handleSaved(savedCourt: AdminCourt, mode: "create" | "edit") {
    setCourts((current) => {
      if (mode === "create") {
        return [...current, savedCourt];
      }

      return current.map((court) =>
        court.id === savedCourt.id ? savedCourt : court,
      );
    });

    setSuccessMessage(
      mode === "create"
        ? "Quadra cadastrada com sucesso."
        : "Quadra atualizada com sucesso.",
    );

    setIsModalOpen(false);
    setSelectedCourt(null);
  }

  return (
    <div className={styles.page}>
      <section className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <div className={styles.toolbarIcon}>
            <CircleDot size={22} />
          </div>

          <div>
            <span>CONFIGURAÇÃO</span>

            <h2>Configuração das Quadras</h2>

            <p>
              Gerencie as quadras do complexo, seus preços, horários
              disponíveis e status.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={openCreateModal}
        >
          <Plus size={18} />
          Nova Quadra
        </button>
      </section>

      {successMessage && (
        <div className={styles.success}>{successMessage}</div>
      )}

      {isLoading && (
        <div className={styles.state}>
          <div className={styles.spinner} />
          <span>Carregando quadras...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.state}>
          <strong>Não foi possível carregar as quadras</strong>
          <p>{error}</p>

          <button
            type="button"
            className={styles.retry}
            onClick={() => void loadCourts()}
          >
            <RefreshCcw size={16} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && courts.length === 0 && (
        <div className={styles.state}>
          <div className={styles.emptyIcon}>
            <CircleDot size={30} />
          </div>

          <strong>Nenhuma quadra cadastrada</strong>

          <p>
            Cadastre a primeira quadra do complexo para começar a
            disponibilizar horários.
          </p>

          <button
            type="button"
            className={styles.newButton}
            onClick={openCreateModal}
          >
            <Plus size={18} />
            Nova Quadra
          </button>
        </div>
      )}

      {!isLoading && !error && courts.length > 0 && (
        <div className={styles.grid}>
          {courts.map((court) => (
            <CourtCard
              key={court.id}
              court={court}
              onEdit={openEditModal}
            />
          ))}
        </div>
      )}

      <CourtModal
        isOpen={isModalOpen}
        mode={modalMode}
        court={selectedCourt}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
}
