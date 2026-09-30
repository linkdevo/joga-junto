"use client";

import { useEffect, useState } from "react";
import { Minus, Package, Pencil, Plus, RefreshCcw } from "lucide-react";

import { BarProductModal } from "@/components/admin/BarProductModal/BarProductModal";
import {
  ApiError,
  adjustAdminBarProductStock,
  getAdminBarProducts,
} from "@/services/admin-api";
import type { AdminBarProduct } from "@/types/admin";

import courtsStyles from "../quadras/Courts.module.css";
import tableStyles from "@/components/admin/AdminTable/AdminTable.module.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function BarStockPage() {
  const [products, setProducts] = useState<AdminBarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProduct, setSelectedProduct] =
    useState<AdminBarProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [pendingProductId, setPendingProductId] = useState<string | null>(
    null,
  );

  async function loadProducts() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getAdminBarProducts();

      setProducts(response.products);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível carregar o estoque do bar.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function openCreateModal() {
    setModalMode("create");
    setSelectedProduct(null);
    setIsModalOpen(true);
  }

  function openEditModal(product: AdminBarProduct) {
    setModalMode("edit");
    setSelectedProduct(product);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedProduct(null);
  }

  function handleSaved(savedProduct: AdminBarProduct, mode: "create" | "edit") {
    setProducts((current) => {
      if (mode === "create") {
        return [...current, savedProduct].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR"),
        );
      }

      return current.map((product) =>
        product.id === savedProduct.id ? savedProduct : product,
      );
    });

    setSuccessMessage(
      mode === "create"
        ? "Produto cadastrado com sucesso."
        : "Produto atualizado com sucesso.",
    );

    closeModal();
  }

  function handleDeleted(productId: string) {
    setProducts((current) =>
      current.filter((product) => product.id !== productId),
    );

    setSuccessMessage("Produto removido com sucesso.");
    closeModal();
  }

  async function handleAdjustStock(product: AdminBarProduct, delta: number) {
    if (product.currentStock + delta < 0) {
      return;
    }

    setPendingProductId(product.id);
    setError(null);

    try {
      const response = await adjustAdminBarProductStock(product.id, delta);

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? response.product : item,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível ajustar o estoque.",
      );
    } finally {
      setPendingProductId(null);
    }
  }

  return (
    <div className={courtsStyles.page}>
      <section className={courtsStyles.toolbar}>
        <div className={courtsStyles.toolbarCopy}>
          <div className={courtsStyles.toolbarIcon}>
            <Package size={22} />
          </div>

          <div>
            <span>PDV OPCIONAL</span>

            <h2>Estoque do Bar</h2>

            <p>
              Gerencie o inventário de produtos do bar. Você cadastra os
              produtos e dá baixa manualmente conforme vende.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={courtsStyles.newButton}
          onClick={openCreateModal}
        >
          <Plus size={18} />
          Cadastrar Produto
        </button>
      </section>

      {successMessage && (
        <div className={courtsStyles.success}>{successMessage}</div>
      )}

      {isLoading && (
        <div className={courtsStyles.state}>
          <div className={courtsStyles.spinner} />
          <span>Carregando estoque...</span>
        </div>
      )}

      {!isLoading && error && products.length === 0 && (
        <div className={courtsStyles.state}>
          <strong>Não foi possível carregar o estoque</strong>
          <p>{error}</p>

          <button
            type="button"
            className={courtsStyles.retry}
            onClick={() => void loadProducts()}
          >
            <RefreshCcw size={16} />
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <div className={courtsStyles.state}>
          <div className={courtsStyles.emptyIcon}>
            <Package size={30} />
          </div>

          <strong>Nenhum produto cadastrado</strong>

          <p>
            Cadastre o primeiro produto do bar para começar a controlar o
            estoque.
          </p>

          <button
            type="button"
            className={courtsStyles.newButton}
            onClick={openCreateModal}
          >
            <Plus size={18} />
            Cadastrar Produto
          </button>
        </div>
      )}

      {!isLoading && products.length > 0 && (
        <div className={tableStyles.card}>
          {error && (
            <div className={tableStyles.errorBanner}>{error}</div>
          )}

          <div className={tableStyles.tableWrapper}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço de Venda</th>
                  <th>Estoque Atual</th>
                  <th>Estoque Mínimo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>

                    <td>{product.category}</td>

                    <td>{currencyFormatter.format(product.priceInCents / 100)}</td>

                    <td>
                      <div className={tableStyles.stepper}>
                        <button
                          type="button"
                          className={tableStyles.stepperButton}
                          disabled={
                            pendingProductId === product.id ||
                            product.currentStock === 0
                          }
                          onClick={() => void handleAdjustStock(product, -1)}
                          aria-label={`Diminuir estoque de ${product.name}`}
                        >
                          <Minus size={13} />
                        </button>

                        <span className={tableStyles.stepperValue}>
                          {product.currentStock}
                        </span>

                        <button
                          type="button"
                          className={tableStyles.stepperButton}
                          disabled={pendingProductId === product.id}
                          onClick={() => void handleAdjustStock(product, 1)}
                          aria-label={`Aumentar estoque de ${product.name}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>

                    <td>{product.minimumStock}</td>

                    <td>
                      <span
                        className={`${tableStyles.badge} ${
                          product.isBelowMinimum
                            ? tableStyles.badgeWarning
                            : tableStyles.badgeOk
                        }`}
                      >
                        {product.isBelowMinimum ? "Abaixo do Mínimo" : "Normal"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={tableStyles.editButton}
                        onClick={() => openEditModal(product)}
                      >
                        <Pencil size={13} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BarProductModal
        isOpen={isModalOpen}
        mode={modalMode}
        product={selectedProduct}
        onClose={closeModal}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
