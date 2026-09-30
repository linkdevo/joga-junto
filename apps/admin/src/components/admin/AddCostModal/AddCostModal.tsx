"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { ApiError, createAdminFinanceCost } from "@/services/admin-api";
import type { FinanceCostType } from "@/types/admin";

import styles from "../CourtModal/CourtModal.module.css";

type AddCostModalProps = {
  isOpen: boolean;
  month: string;
  onClose: () => void;
  onCreated: () => void;
};

function priceInputToCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return Math.round(numberValue * 100);
}

export function AddCostModal({
  isOpen,
  month,
  onClose,
  onCreated,
}: AddCostModalProps) {
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FinanceCostType>("FIXED");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDescription("");
    setType("FIXED");
    setPrice("");
    setError(null);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountInCents = priceInputToCents(price);

    if (!description.trim() || !amountInCents) {
      setError("Preencha a descrição e um valor válido.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createAdminFinanceCost({
        description: description.trim(),
        type,
        amountInCents,
        ...(type === "VARIABLE" ? { month } : {}),
      });

      onCreated();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível cadastrar a despesa.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={() => !isSaving && onClose()}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-cost-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span>FINANCEIRO</span>
            <h2 id="add-cost-modal-title">Adicionar Despesa</h2>
            <p>Custos fixos contam em todo mês. Variáveis, só neste mês.</p>
          </div>

          <button
            type="button"
            className={styles.close}
            aria-label="Fechar modal"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.modalError}>{error}</div>}

          <div className={styles.grid}>
            <div className={`${styles.group} ${styles.full}`}>
              <label htmlFor="cost-description">Descrição *</label>

              <input
                id="cost-description"
                className={styles.input}
                value={description}
                placeholder="Ex: Conta de Energia Elétrica"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="cost-type">Tipo *</label>

              <select
                id="cost-type"
                className={styles.input}
                value={type}
                onChange={(event) =>
                  setType(event.target.value as FinanceCostType)
                }
              >
                <option value="FIXED">Fixo (todo mês)</option>
                <option value="VARIABLE">Variável (só este mês)</option>
              </select>
            </div>

            <div className={styles.group}>
              <label htmlFor="cost-value">Valor (R$) *</label>

              <div className={styles.priceWrapper}>
                <span>R$</span>

                <input
                  id="cost-value"
                  className={styles.input}
                  value={price}
                  placeholder="0,00"
                  inputMode="decimal"
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              disabled={isSaving}
              onClick={onClose}
            >
              Cancelar
            </button>

            <button type="submit" className={styles.submit} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Despesa"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
