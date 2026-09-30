"use client";

import { useEffect, useState } from "react";
import { Flame, Plus, RefreshCcw } from "lucide-react";

import { LeisureAreaCard } from "@/components/admin/LeisureAreaCard/LeisureAreaCard";
import { LeisureAreaModal } from "@/components/admin/LeisureAreaModal/LeisureAreaModal";
import { ApiError, getAdminLeisureAreas } from "@/services/admin-api";
import type { AdminLeisureArea } from "@/types/admin";

import styles from "../quadras/Courts.module.css";

export default function LeisureAreasPage() {
  const [areas, setAreas] = useState<AdminLeisureArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedArea, setSelectedArea] = useState<AdminLeisureArea | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadAreas() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getAdminLeisureAreas();

      setAreas(response.areas);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível carregar as áreas de lazer.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAreas();
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
    setSelectedArea(null);
    setIsModalOpen(true);
  }

  function openEditModal(area: AdminLeisureArea) {
    setModalMode("edit");
    setSelectedArea(area);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedArea(null);
  }

  function handleSaved(savedArea: AdminLeisureArea, mode: "create" | "edit") {
    setAreas((current) => {
      if (mode === "create") {
        return [...current, savedArea];
      }

      return current.map((area) =>
        area.id === savedArea.id ? savedArea : area,
      );
    });

    setSuccessMessage(
      mode === "create"
        ? "Área de lazer cadastrada com sucesso."
        : "Área de lazer atualizada com sucesso.",
    );

    setIsModalOpen(false);
    setSelectedArea(null);
  }

  return (
    <div className={styles.page}>
      <section className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <div className={styles.toolbarIcon}>
            <Flame size={22} />
          </div>

          <div>
            <span>CONFIGURAÇÃO</span>

            <h2>Áreas de Lazer</h2>

            <p>
              Cadastre churrasqueiras e outras áreas do complexo, com horários
              e preços. O atleta poderá reservá-las junto com a quadra.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={openCreateModal}
        >
          <Plus size={18} />
          Nova Área
        </button>
      </section>

      {successMessage && (
        <div className={styles.success}>{successMessage}</div>
      )}

      {isLoading && (
        <div className={styles.state}>
          <div className={styles.spinner} />
          <span>Carregando áreas de lazer...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.state}>
          <strong>Não foi possível carregar as áreas de lazer</strong>
          <p>{error}</p>

          <button
            type="button"
            className={styles.retry}
            onClick={() => void loadAreas()}
          >
            <RefreshCcw size={16} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && areas.length === 0 && (
        <div className={styles.state}>
          <div className={styles.emptyIcon}>
            <Flame size={30} />
          </div>

          <strong>Nenhuma área de lazer cadastrada</strong>

          <p>
            Cadastre a primeira churrasqueira do complexo para que os atletas
            possam reservá-la junto com a quadra.
          </p>

          <button
            type="button"
            className={styles.newButton}
            onClick={openCreateModal}
          >
            <Plus size={18} />
            Nova Área
          </button>
        </div>
      )}

      {!isLoading && !error && areas.length > 0 && (
        <div className={styles.grid}>
          {areas.map((area) => (
            <LeisureAreaCard key={area.id} area={area} onEdit={openEditModal} />
          ))}
        </div>
      )}

      <LeisureAreaModal
        isOpen={isModalOpen}
        mode={modalMode}
        area={selectedArea}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </div>
  );
}
