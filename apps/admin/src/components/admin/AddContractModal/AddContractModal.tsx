"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { ApiError, createAdminFinanceContract } from "@/services/admin-api";

import styles from "../CourtModal/CourtModal.module.css";

type AddContractModalProps = {
  isOpen: boolean;
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

export function AddContractModal({
  isOpen,
  onClose,
  onCreated,
}: AddContractModalProps) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDescription("");
    setCategory("");
    setPrice("");
    setError(null);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountInCents = priceInputToCents(price);

    if (!description.trim() || !category.trim() || !amountInCents) {
      setError("Preencha todos os campos com um valor válido.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createAdminFinanceContract({
        description: description.trim(),
        category: category.trim(),
        amountInCents,
      });

      onCreated();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível cadastrar o contrato.",
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
        aria-labelledby="add-contract-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span>FINANCEIRO</span>
            <h2 id="add-contract-modal-title">Adicionar Contrato</h2>
            <p>Receita fixa mensal, como escolinhas e parcerias.</p>
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
              <label htmlFor="contract-description">
                Descrição / Parceiro *
              </label>

              <input
                id="contract-description"
                className={styles.input}
                value={description}
                placeholder="Ex: Escolinha de Beach Tennis (Mensalidade)"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="contract-category">Categoria *</label>

              <input
                id="contract-category"
                className={styles.input}
                value={category}
                placeholder="Ex: Escolinha"
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="contract-value">Faturamento Fixo (R$) *</label>

              <div className={styles.priceWrapper}>
                <span>R$</span>

                <input
                  id="contract-value"
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
              {isSaving ? "Salvando..." : "Salvar Contrato"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
