"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import {
  createEmptyBlock,
  createLeisureAreaFormValues,
  createLeisureAreaPayload,
  normalizeSlug,
  updateLeisureAreaPayload,
  validateBlockValues,
  type LeisureAreaFormValues,
  type LeisureBlockFormValues,
} from "@/features/leisure-areas/leisure-area-form";
import {
  ApiError,
  createAdminLeisureArea,
  updateAdminLeisureArea,
} from "@/services/admin-api";
import type { AdminLeisureArea } from "@/types/admin";

import styles from "../CourtModal/CourtModal.module.css";
import blockStyles from "./LeisureAreaModal.module.css";

type LeisureAreaModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  area: AdminLeisureArea | null;
  onClose: () => void;
  onSaved: (area: AdminLeisureArea, mode: "create" | "edit") => void;
};

export function LeisureAreaModal({
  isOpen,
  mode,
  area,
  onClose,
  onSaved,
}: LeisureAreaModalProps) {
  const [form, setForm] = useState<LeisureAreaFormValues>(() =>
    createLeisureAreaFormValues(area),
  );

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(createLeisureAreaFormValues(mode === "edit" ? area : null));
    setError(null);
    setFieldErrors({});
  }, [isOpen, mode, area]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function updateField<K extends keyof LeisureAreaFormValues>(
    field: K,
    value: LeisureAreaFormValues[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleNameChange(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug:
        mode === "create" && !current.slug ? normalizeSlug(name) : current.slug,
    }));
  }

  function updateBlock(key: string, changes: Partial<LeisureBlockFormValues>) {
    setForm((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.key === key ? { ...block, ...changes } : block,
      ),
    }));
  }

  function addBlock() {
    setForm((current) => ({
      ...current,
      blocks: [...current.blocks, createEmptyBlock()],
    }));
  }

  function removeBlock(key: string) {
    setForm((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.key !== key),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setFieldErrors({});

    const blocksError = validateBlockValues(form.blocks);

    if (blocksError) {
      setError(blocksError);
      return;
    }

    try {
      let response;

      if (mode === "create") {
        const payload = createLeisureAreaPayload(form);

        if (!payload) {
          setError("Preencha todos os campos obrigatórios.");
          return;
        }

        setIsSaving(true);

        response = await createAdminLeisureArea(payload);
      } else {
        const payload = updateLeisureAreaPayload(form);

        if (!payload) {
          setError("Preencha todos os campos obrigatórios.");
          return;
        }

        if (!area) {
          setError("Não foi possível identificar a área que será editada.");
          return;
        }

        setIsSaving(true);

        response = await updateAdminLeisureArea(area.id, payload);
      }

      onSaved(response.area, mode);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);

        if (requestError.errors) {
          setFieldErrors(
            Object.fromEntries(
              requestError.errors.map((item) => [item.field, item.message]),
            ),
          );
        }

        return;
      }

      setError("Não foi possível salvar a área de lazer.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleOverlayClick() {
    if (!isSaving) {
      onClose();
    }
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={handleOverlayClick}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leisure-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span>CONFIGURAÇÃO</span>

            <h2 id="leisure-modal-title">
              {mode === "create" ? "Nova Área de Lazer" : "Editar Área de Lazer"}
            </h2>

            <p>
              Cadastre a churrasqueira (ou outra área) e os horários que o
              atleta poderá reservar junto com a quadra.
            </p>
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

          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>01</span>

              <div>
                <strong>Informações da área</strong>
                <small>Dados exibidos para os jogadores.</small>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.group}>
                <label htmlFor="leisure-name">Nome *</label>

                <input
                  id="leisure-name"
                  className={styles.input}
                  value={form.name}
                  placeholder="Churrasqueira Coberta"
                  onChange={(event) => handleNameChange(event.target.value)}
                />

                {fieldErrors.name && (
                  <span className={styles.fieldError}>{fieldErrors.name}</span>
                )}
              </div>

              <div className={styles.group}>
                <label htmlFor="leisure-slug">Slug *</label>

                <input
                  id="leisure-slug"
                  className={styles.input}
                  value={form.slug}
                  disabled={mode === "edit"}
                  placeholder="churrasqueira-coberta"
                  onChange={(event) =>
                    updateField("slug", normalizeSlug(event.target.value))
                  }
                />

                {mode === "edit" && (
                  <small>O slug não pode ser alterado.</small>
                )}

                {fieldErrors.slug && (
                  <span className={styles.fieldError}>{fieldErrors.slug}</span>
                )}
              </div>

              <div className={`${styles.group} ${styles.full}`}>
                <label htmlFor="leisure-description">Descrição *</label>

                <textarea
                  id="leisure-description"
                  className={styles.textarea}
                  value={form.description}
                  placeholder="Churrasqueira com mesas, pia e capacidade para 20 pessoas."
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                />

                {fieldErrors.description && (
                  <span className={styles.fieldError}>
                    {fieldErrors.description}
                  </span>
                )}
              </div>

              <div className={`${styles.group} ${styles.full}`}>
                <label htmlFor="leisure-image">URL da imagem</label>

                <input
                  id="leisure-image"
                  type="url"
                  className={styles.input}
                  value={form.imageUrl}
                  placeholder="https://... (opcional)"
                  onChange={(event) =>
                    updateField("imageUrl", event.target.value)
                  }
                />

                {fieldErrors.imageUrl && (
                  <span className={styles.fieldError}>
                    {fieldErrors.imageUrl}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>02</span>

              <div>
                <strong>Horários e preços</strong>
                <small>
                  Cada horário é um bloco reservável, com preço próprio.
                </small>
              </div>
            </div>

            <div className={blockStyles.blocks}>
              {form.blocks.map((block) => (
                <div key={block.key} className={blockStyles.block}>
                  <div className={blockStyles.blockField}>
                    <label htmlFor={`${block.key}-start`}>Início</label>

                    <input
                      id={`${block.key}-start`}
                      type="time"
                      className={styles.input}
                      value={block.startTime}
                      onChange={(event) =>
                        updateBlock(block.key, {
                          startTime: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className={blockStyles.blockField}>
                    <label htmlFor={`${block.key}-end`}>Fim</label>

                    <input
                      id={`${block.key}-end`}
                      type="time"
                      className={styles.input}
                      value={block.endTime}
                      onChange={(event) =>
                        updateBlock(block.key, { endTime: event.target.value })
                      }
                    />
                  </div>

                  <div
                    className={`${blockStyles.blockField} ${blockStyles.blockPrice}`}
                  >
                    <label htmlFor={`${block.key}-price`}>Preço</label>

                    <div className={styles.priceWrapper}>
                      <span>R$</span>

                      <input
                        id={`${block.key}-price`}
                        className={styles.input}
                        value={block.price}
                        placeholder="150,00"
                        inputMode="decimal"
                        onChange={(event) =>
                          updateBlock(block.key, { price: event.target.value })
                        }
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-pressed={block.isActive}
                    className={`${blockStyles.blockActive} ${
                      block.isActive ? blockStyles.blockActiveOn : ""
                    }`}
                    onClick={() =>
                      updateBlock(block.key, { isActive: !block.isActive })
                    }
                  >
                    {block.isActive ? "Ativo" : "Inativo"}
                  </button>

                  <button
                    type="button"
                    className={blockStyles.remove}
                    aria-label="Remover horário"
                    disabled={form.blocks.length === 1}
                    onClick={() => removeBlock(block.key)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className={blockStyles.addBlock}
                onClick={addBlock}
              >
                <Plus size={16} />
                Adicionar horário
              </button>
            </div>

            {fieldErrors.blocks && (
              <span className={styles.fieldError}>{fieldErrors.blocks}</span>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>03</span>

              <div>
                <strong>Status da área</strong>
                <small>
                  Áreas inativas não aparecem para o atleta na hora de reservar.
                </small>
              </div>
            </div>

            <button
              type="button"
              className={`${styles.statusToggle} ${
                form.isActive ? styles.statusToggleActive : ""
              }`}
              onClick={() => updateField("isActive", !form.isActive)}
            >
              <span className={styles.statusToggleIcon}>
                {form.isActive && <Check size={14} />}
              </span>

              <div>
                <strong>{form.isActive ? "Área ativa" : "Área inativa"}</strong>

                <small>
                  {form.isActive
                    ? "Disponível para reservas."
                    : "Indisponível para novas reservas."}
                </small>
              </div>
            </button>
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
              {isSaving
                ? "Salvando..."
                : mode === "create"
                  ? "Cadastrar Área"
                  : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
