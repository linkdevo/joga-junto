"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";

import {
  ApiError,
  createAdminBarProduct,
  deleteAdminBarProduct,
  updateAdminBarProduct,
} from "@/services/admin-api";
import type { AdminBarProduct, BarProductCategory } from "@/types/admin";

import styles from "../CourtModal/CourtModal.module.css";
import localStyles from "./BarProductModal.module.css";

const CATEGORIES: BarProductCategory[] = [
  "Bebidas",
  "Alimentos",
  "Acessórios",
  "Outros",
];

type BarProductModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  product: AdminBarProduct | null;
  onClose: () => void;
  onSaved: (product: AdminBarProduct, mode: "create" | "edit") => void;
  onDeleted: (productId: string) => void;
};

type FormValues = {
  name: string;
  category: BarProductCategory;
  price: string;
  currentStock: string;
  minimumStock: string;
};

function formatPriceInput(priceInCents: number) {
  return (priceInCents / 100).toFixed(2).replace(".", ",");
}

function priceInputToCents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return Math.round(numberValue * 100);
}

function createFormValues(product: AdminBarProduct | null): FormValues {
  if (!product) {
    return {
      name: "",
      category: "Bebidas",
      price: "",
      currentStock: "0",
      minimumStock: "0",
    };
  }

  return {
    name: product.name,
    category: product.category,
    price: formatPriceInput(product.priceInCents),
    currentStock: String(product.currentStock),
    minimumStock: String(product.minimumStock),
  };
}

export function BarProductModal({
  isOpen,
  mode,
  product,
  onClose,
  onSaved,
  onDeleted,
}: BarProductModalProps) {
  const [form, setForm] = useState<FormValues>(() => createFormValues(product));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(createFormValues(mode === "edit" ? product : null));
    setError(null);
    setFieldErrors({});
  }, [isOpen, mode, product]);

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

  function updateField<K extends keyof FormValues>(
    field: K,
    value: FormValues[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setFieldErrors({});

    const priceInCents = priceInputToCents(form.price);
    const currentStock = Number(form.currentStock);
    const minimumStock = Number(form.minimumStock);

    if (
      !form.name.trim() ||
      priceInCents === null ||
      !Number.isInteger(currentStock) ||
      currentStock < 0 ||
      !Number.isInteger(minimumStock) ||
      minimumStock < 0
    ) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    try {
      setIsSaving(true);

      let savedProduct: AdminBarProduct;

      if (mode === "create") {
        const response = await createAdminBarProduct({
          name: form.name.trim(),
          category: form.category,
          priceInCents,
          currentStock,
          minimumStock,
        });

        savedProduct = response.product;
      } else {
        if (!product) {
          setError("Não foi possível identificar o produto que será editado.");
          return;
        }

        const response = await updateAdminBarProduct(product.id, {
          name: form.name.trim(),
          category: form.category,
          priceInCents,
          minimumStock,
        });

        savedProduct = response.product;
      }

      onSaved(savedProduct, mode);
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

      setError("Não foi possível salvar o produto.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) {
      return;
    }

    if (
      !window.confirm(
        `Remover "${product.name}" do estoque? Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteAdminBarProduct(product.id);

      onDeleted(product.id);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível remover o produto.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleOverlayClick() {
    if (!isSaving && !isDeleting) {
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
        aria-labelledby="bar-product-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span>ESTOQUE DO BAR</span>

            <h2 id="bar-product-modal-title">
              {mode === "create" ? "Cadastrar Novo Produto" : "Editar Produto"}
            </h2>

            <p>Produtos vendidos no bar do complexo.</p>
          </div>

          <button
            type="button"
            className={styles.close}
            aria-label="Fechar modal"
            disabled={isSaving || isDeleting}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.modalError}>{error}</div>}

          <div className={styles.grid}>
            <div className={`${styles.group} ${styles.full}`}>
              <label htmlFor="bar-product-name">Nome do Produto *</label>

              <input
                id="bar-product-name"
                className={styles.input}
                value={form.name}
                placeholder="Ex: Coca-cola Lata"
                onChange={(event) => updateField("name", event.target.value)}
              />

              {fieldErrors.name && (
                <span className={styles.fieldError}>{fieldErrors.name}</span>
              )}
            </div>

            <div className={styles.group}>
              <label htmlFor="bar-product-price">Preço de Venda (R$) *</label>

              <div className={styles.priceWrapper}>
                <span>R$</span>

                <input
                  id="bar-product-price"
                  className={styles.input}
                  value={form.price}
                  placeholder="0,00"
                  inputMode="decimal"
                  onChange={(event) => updateField("price", event.target.value)}
                />
              </div>

              {fieldErrors.priceInCents && (
                <span className={styles.fieldError}>
                  {fieldErrors.priceInCents}
                </span>
              )}
            </div>

            <div className={styles.group}>
              <label htmlFor="bar-product-category">Categoria *</label>

              <select
                id="bar-product-category"
                className={styles.input}
                value={form.category}
                onChange={(event) =>
                  updateField(
                    "category",
                    event.target.value as BarProductCategory,
                  )
                }
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.group}>
              <label htmlFor="bar-product-stock">
                Estoque Inicial *{mode === "edit" && " (não editável aqui)"}
              </label>

              <input
                id="bar-product-stock"
                type="number"
                min="0"
                className={styles.input}
                value={form.currentStock}
                disabled={mode === "edit"}
                onChange={(event) =>
                  updateField("currentStock", event.target.value)
                }
              />

              {mode === "edit" && (
                <small>Ajuste o estoque pelos botões +/- da lista.</small>
              )}
            </div>

            <div className={styles.group}>
              <label htmlFor="bar-product-min-stock">Estoque Mínimo *</label>

              <input
                id="bar-product-min-stock"
                type="number"
                min="0"
                className={styles.input}
                value={form.minimumStock}
                onChange={(event) =>
                  updateField("minimumStock", event.target.value)
                }
              />

              {fieldErrors.minimumStock && (
                <span className={styles.fieldError}>
                  {fieldErrors.minimumStock}
                </span>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            {mode === "edit" && (
              <button
                type="button"
                className={`${styles.cancel} ${localStyles.deleteAction}`}
                disabled={isSaving || isDeleting}
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                {isDeleting ? "Removendo..." : "Remover produto"}
              </button>
            )}

            <button
              type="button"
              className={styles.cancel}
              disabled={isSaving || isDeleting}
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={styles.submit}
              disabled={isSaving || isDeleting}
            >
              {isSaving
                ? "Salvando..."
                : mode === "create"
                  ? "Salvar Produto"
                  : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
