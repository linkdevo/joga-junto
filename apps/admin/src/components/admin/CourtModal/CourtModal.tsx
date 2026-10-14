"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";

import { CourtTimeSelector } from "@/components/admin/CourtTimeSelector/CourtTimeSelector";
import {
  createCourtFormValues,
  createCourtPayload,
  normalizeSlug,
  updateCourtPayload,
  type CourtFormValues,
} from "@/features/courts/court-form";
import {
  ApiError,
  createAdminCourt,
  updateAdminCourt,
} from "@/services/admin-api";
import type { AdminCourt } from "@/types/admin";

import styles from "./CourtModal.module.css";

type CourtModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  court: AdminCourt | null;
  onClose: () => void;
  onSaved: (court: AdminCourt, mode: "create" | "edit") => void;
};

export function CourtModal({
  isOpen,
  mode,
  court,
  onClose,
  onSaved,
}: CourtModalProps) {
  const [form, setForm] = useState<CourtFormValues>(() =>
    createCourtFormValues(court),
  );

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(createCourtFormValues(mode === "edit" ? court : null));
    setError(null);
    setFieldErrors({});
  }, [isOpen, mode, court]);

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

  function updateField<K extends keyof CourtFormValues>(
    field: K,
    value: CourtFormValues[K],
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setFieldErrors({});

    try {
      let response;

      if (mode === "create") {
        const payload = createCourtPayload(form);

        if (!payload) {
          setError(
            "Preencha todos os campos obrigatórios e selecione pelo menos um horário.",
          );

          return;
        }

        setIsSaving(true);

        response = await createAdminCourt(payload);
      } else {
        const payload = updateCourtPayload(form);

        if (!payload) {
          setError(
            "Preencha todos os campos obrigatórios e selecione pelo menos um horário.",
          );

          return;
        }

        if (!court) {
          setError("Não foi possível identificar a quadra que será editada.");

          return;
        }

        setIsSaving(true);

        response = await updateAdminCourt(court.id, payload);
      }

      onSaved(response.court, mode);
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

      setError("Não foi possível salvar a quadra.");
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
        aria-labelledby="court-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span>CONFIGURAÇÃO</span>

            <h2 id="court-modal-title">
              {mode === "create" ? "Nova Quadra" : "Editar Quadra"}
            </h2>

            <p>
              Configure as informações, preço e horários disponíveis da quadra.
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
                <strong>Informações da quadra</strong>
                <small>Dados exibidos para os jogadores.</small>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.group}>
                <label htmlFor="court-name">Nome *</label>

                <input
                  id="court-name"
                  className={styles.input}
                  value={form.name}
                  placeholder="Campo Society Premium"
                  onChange={(event) => handleNameChange(event.target.value)}
                />

                {fieldErrors.name && (
                  <span className={styles.fieldError}>{fieldErrors.name}</span>
                )}
              </div>

              <div className={styles.group}>
                <label htmlFor="court-slug">Slug *</label>

                <input
                  id="court-slug"
                  className={styles.input}
                  value={form.slug}
                  disabled={mode === "edit"}
                  placeholder="campo-society-premium"
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

              <div className={styles.group}>
                <label htmlFor="court-type">Tipo *</label>

                <input
                  id="court-type"
                  className={styles.input}
                  value={form.type}
                  placeholder="Futebol 7"
                  onChange={(event) => updateField("type", event.target.value)}
                />

                {fieldErrors.type && (
                  <span className={styles.fieldError}>{fieldErrors.type}</span>
                )}
              </div>

              <div className={styles.group}>
                <label htmlFor="court-surface">Superfície *</label>

                <input
                  id="court-surface"
                  className={styles.input}
                  value={form.surface}
                  placeholder="Grama sintética"
                  onChange={(event) =>
                    updateField("surface", event.target.value)
                  }
                />

                {fieldErrors.surface && (
                  <span className={styles.fieldError}>
                    {fieldErrors.surface}
                  </span>
                )}
              </div>

              <div className={styles.group}>
                <label htmlFor="court-price">Preço por hora *</label>

                <div className={styles.priceWrapper}>
                  <span>R$</span>

                  <input
                    id="court-price"
                    className={styles.input}
                    value={form.price}
                    placeholder="320,00"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateField("price", event.target.value)
                    }
                  />
                </div>

                {fieldErrors.priceInCents && (
                  <span className={styles.fieldError}>
                    {fieldErrors.priceInCents}
                  </span>
                )}
              </div>

              <div className={styles.group}>
                <label htmlFor="court-players">Jogadores *</label>

                <input
                  id="court-players"
                  type="number"
                  min="1"
                  className={styles.input}
                  value={form.players}
                  placeholder="14"
                  onChange={(event) =>
                    updateField("players", event.target.value)
                  }
                />

                {fieldErrors.players && (
                  <span className={styles.fieldError}>
                    {fieldErrors.players}
                  </span>
                )}
              </div>

              <div className={styles.group}>
                <label htmlFor="court-min-players">
                  Mínimo para liberar pagamento *
                </label>

                <input
                  id="court-min-players"
                  type="number"
                  min="1"
                  className={styles.input}
                  value={form.minPlayers}
                  placeholder={form.players || "10"}
                  onChange={(event) =>
                    updateField("minPlayers", event.target.value)
                  }
                />

                {fieldErrors.minPlayers && (
                  <span className={styles.fieldError}>
                    {fieldErrors.minPlayers}
                  </span>
                )}
              </div>

              <div className={styles.group}>
                <label htmlFor="court-goalkeeper-price">
                  Valor do goleiro (rateado)
                </label>

                <div className={styles.priceWrapper}>
                  <span>R$</span>

                  <input
                    id="court-goalkeeper-price"
                    className={styles.input}
                    value={form.goalkeeperPrice}
                    placeholder="80,00"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateField("goalkeeperPrice", event.target.value)
                    }
                  />
                </div>

                {fieldErrors.goalkeeperPriceInCents && (
                  <span className={styles.fieldError}>
                    {fieldErrors.goalkeeperPriceInCents}
                  </span>
                )}
              </div>

              <div className={`${styles.group} ${styles.full}`}>
                <label htmlFor="court-highlight">Destaque</label>

                <input
                  id="court-highlight"
                  className={styles.input}
                  value={form.highlight}
                  placeholder="Mais reservado"
                  onChange={(event) =>
                    updateField("highlight", event.target.value)
                  }
                />
              </div>

              <div className={`${styles.group} ${styles.full}`}>
                <label htmlFor="court-description">Descrição *</label>

                <textarea
                  id="court-description"
                  className={styles.textarea}
                  value={form.description}
                  placeholder="Campo society coberto, iluminação profissional e vestiários."
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
                <label htmlFor="court-image">URL da imagem *</label>

                <input
                  id="court-image"
                  type="url"
                  className={styles.input}
                  value={form.imageUrl}
                  placeholder="https://..."
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
                <strong>Horários disponíveis</strong>
                <small>Defina os horários que poderão ser reservados.</small>
              </div>
            </div>

            <CourtTimeSelector
              value={form.times}
              onChange={(times) => updateField("times", times)}
            />

            {fieldErrors.times && (
              <span className={styles.fieldError}>{fieldErrors.times}</span>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>03</span>

              <div>
                <strong>Status da quadra</strong>
                <small>
                  Quadras inativas não ficam disponíveis para novas reservas.
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
                <strong>
                  {form.isActive ? "Quadra ativa" : "Quadra inativa"}
                </strong>

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
                  ? "Cadastrar Quadra"
                  : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
