"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { AddContractModal } from "@/components/admin/AddContractModal/AddContractModal";
import { AddCostModal } from "@/components/admin/AddCostModal/AddCostModal";
import { useAdminMonth } from "@/contexts/AdminMonthContext";
import {
  ApiError,
  deleteAdminFinanceContract,
  deleteAdminFinanceCost,
  getAdminFinanceContracts,
  getAdminFinanceCosts,
  getAdminFinanceSummary,
} from "@/services/admin-api";
import type {
  AdminFinanceContract,
  AdminFinanceCost,
  AdminFinanceSummary,
} from "@/types/admin";

import dashboardStyles from "../resumo/Dashboard.module.css";
import financeStyles from "./Financeiro.module.css";
import tableStyles from "@/components/admin/AdminTable/AdminTable.module.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export default function FinancePage() {
  const { month } = useAdminMonth();

  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [costs, setCosts] = useState<AdminFinanceCost[]>([]);
  const [contracts, setContracts] = useState<AdminFinanceContract[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [summaryResponse, costsResponse, contractsResponse] =
        await Promise.all([
          getAdminFinanceSummary(month),
          getAdminFinanceCosts(month),
          getAdminFinanceContracts(),
        ]);

      setSummary(summaryResponse);
      setCosts(costsResponse.costs);
      setContracts(contractsResponse.contracts);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível carregar os dados financeiros.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleDeleteCost(costId: string) {
    if (!window.confirm("Remover esta despesa?")) {
      return;
    }

    try {
      await deleteAdminFinanceCost(costId);
      void loadData();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível remover a despesa.",
      );
    }
  }

  async function handleDeleteContract(contractId: string) {
    if (!window.confirm("Remover este contrato?")) {
      return;
    }

    try {
      await deleteAdminFinanceContract(contractId);
      void loadData();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível remover o contrato.",
      );
    }
  }

  return (
    <div className={dashboardStyles.page}>
      {error && <div className={dashboardStyles.error}>{error}</div>}

      {isLoading || !summary ? (
        <div className={tableStyles.empty}>Carregando dados financeiros...</div>
      ) : (
        <>
          <div className={dashboardStyles.cards}>
            <article className={dashboardStyles.summaryCard}>
              <div className={dashboardStyles.summaryContent}>
                <span className={dashboardStyles.summaryLabel}>
                  Receitas Totais
                </span>

                <strong
                  className={`${dashboardStyles.summaryValue} ${dashboardStyles.greenValue}`}
                >
                  {formatCurrency(summary.revenue.totalInCents)}
                </strong>

                <p className={dashboardStyles.summaryDescription}>
                  Locações Quadras: {formatCurrency(summary.revenue.courtRentalsInCents)}
                  <br />
                  Vendas do Bar: {formatCurrency(summary.revenue.barSalesInCents)}
                  <br />
                  Mensalidades Fixas: {formatCurrency(summary.revenue.fixedContractsInCents)}
                </p>
              </div>

              <div
                className={`${dashboardStyles.summaryIcon} ${dashboardStyles.greenIcon}`}
              >
                <TrendingUp size={24} />
              </div>
            </article>

            <article className={dashboardStyles.summaryCard}>
              <div className={dashboardStyles.summaryContent}>
                <span className={dashboardStyles.summaryLabel}>
                  Custos Registrados
                </span>

                <strong className={dashboardStyles.summaryValue}>
                  {formatCurrency(summary.costs.totalInCents)}
                </strong>

                <p className={dashboardStyles.summaryDescription}>
                  Custos Fixos: {formatCurrency(summary.costs.fixedInCents)}
                  <br />
                  Custos Variáveis: {formatCurrency(summary.costs.variableInCents)}
                </p>
              </div>

              <div className={dashboardStyles.summaryIcon}>
                <TrendingDown size={24} />
              </div>
            </article>

            <article className={dashboardStyles.summaryCard}>
              <div className={dashboardStyles.summaryContent}>
                <span className={dashboardStyles.summaryLabel}>
                  Lucro Líquido Esperado
                </span>

                <strong
                  className={`${dashboardStyles.summaryValue} ${
                    summary.netProfitInCents >= 0
                      ? dashboardStyles.greenValue
                      : financeStyles.negativeValue
                  }`}
                >
                  {formatCurrency(summary.netProfitInCents)}
                </strong>

                <p className={dashboardStyles.summaryDescription}>
                  Receitas - Custos
                </p>
              </div>

              <div
                className={`${dashboardStyles.summaryIcon} ${
                  summary.netProfitInCents >= 0
                    ? dashboardStyles.greenIcon
                    : ""
                }`}
              >
                <Wallet size={24} />
              </div>
            </article>
          </div>

          <div className={dashboardStyles.bottomGrid}>
            <div className={tableStyles.card}>
              <div className={tableStyles.cardHeader}>
                <h3>Custos Fixos e Variáveis</h3>

                <button
                  type="button"
                  className={tableStyles.addButton}
                  onClick={() => setIsCostModalOpen(true)}
                >
                  <Plus size={15} />
                  Adicionar Despesa
                </button>
              </div>

              {costs.length === 0 ? (
                <p className={tableStyles.empty}>
                  Nenhum custo cadastrado neste mês.
                </p>
              ) : (
                <div className={tableStyles.tableWrapper}>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                        <th>Ação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {costs.map((cost) => (
                        <tr key={cost.id}>
                          <td>{cost.description}</td>

                          <td>
                            <span
                              className={`${tableStyles.badge} ${
                                cost.type === "FIXED"
                                  ? tableStyles.badgeFixed
                                  : tableStyles.badgeVariable
                              }`}
                            >
                              {cost.type === "FIXED" ? "Fixo" : "Variável"}
                            </span>
                          </td>

                          <td>{formatCurrency(cost.amountInCents)}</td>

                          <td>
                            <button
                              type="button"
                              className={tableStyles.deleteButton}
                              aria-label={`Remover ${cost.description}`}
                              onClick={() => void handleDeleteCost(cost.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={tableStyles.card}>
              <div className={tableStyles.cardHeader}>
                <h3>Contratos e Receitas Fixas</h3>

                <button
                  type="button"
                  className={tableStyles.addButton}
                  onClick={() => setIsContractModalOpen(true)}
                >
                  <Plus size={15} />
                  Adicionar Contrato
                </button>
              </div>

              {contracts.length === 0 ? (
                <p className={tableStyles.empty}>
                  Nenhum contrato cadastrado.
                </p>
              ) : (
                <div className={tableStyles.tableWrapper}>
                  <table className={tableStyles.table}>
                    <thead>
                      <tr>
                        <th>Descrição / Parceiro</th>
                        <th>Categoria</th>
                        <th>Faturamento Fixo</th>
                        <th>Ação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {contracts.map((contract) => (
                        <tr key={contract.id}>
                          <td>{contract.description}</td>

                          <td>
                            <span
                              className={`${tableStyles.badge} ${tableStyles.badgeVariable}`}
                            >
                              {contract.category}
                            </span>
                          </td>

                          <td className={dashboardStyles.greenValue}>
                            {formatCurrency(contract.amountInCents)}
                          </td>

                          <td>
                            <button
                              type="button"
                              className={tableStyles.deleteButton}
                              aria-label={`Remover ${contract.description}`}
                              onClick={() =>
                                void handleDeleteContract(contract.id)
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <AddCostModal
        isOpen={isCostModalOpen}
        month={month}
        onClose={() => setIsCostModalOpen(false)}
        onCreated={() => {
          setIsCostModalOpen(false);
          void loadData();
        }}
      />

      <AddContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        onCreated={() => {
          setIsContractModalOpen(false);
          void loadData();
        }}
      />
    </div>
  );
}
