"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Send, Wallet as WalletIcon } from "lucide-react";

import {
  ApiError,
  getAdminPayouts,
  getAdminWallet,
  requestAdminPayout,
  updateAdminPayoutAccount,
} from "@/services/admin-api";
import type { AdminPayoutRequest, AdminWallet, PixKeyType } from "@/types/admin";

import styles from "./Carteira.module.css";
import tableStyles from "@/components/admin/AdminTable/AdminTable.module.css";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

const PIX_KEY_LABELS: Record<PixKeyType, string> = {
  EMAIL: "E-mail",
  PHONE: "Telefone",
  CPF_CNPJ: "CPF/CNPJ",
  RANDOM: "Aleatória",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<AdminWallet | null>(null);
  const [payouts, setPayouts] = useState<AdminPayoutRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  const [bankName, setBankName] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("EMAIL");
  const [pixKey, setPixKey] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [walletResponse, payoutsResponse] = await Promise.all([
        getAdminWallet(),
        getAdminPayouts(),
      ]);

      setWallet(walletResponse);
      setPayouts(payoutsResponse.payouts);

      if (walletResponse.payoutAccount) {
        setBankName(walletResponse.payoutAccount.bankName);
        setAgency(walletResponse.payoutAccount.agency);
        setAccountNumber(walletResponse.payoutAccount.accountNumber);
        setPixKeyType(walletResponse.payoutAccount.pixKeyType);
        setPixKey(walletResponse.payoutAccount.pixKey);
      }
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível carregar a carteira.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bankName.trim() || !agency.trim() || !accountNumber.trim() || !pixKey.trim()) {
      setError("Preencha todos os dados de recebimento.");
      return;
    }

    setIsSavingAccount(true);
    setError(null);

    try {
      await updateAdminPayoutAccount({
        bankName: bankName.trim(),
        agency: agency.trim(),
        accountNumber: accountNumber.trim(),
        pixKeyType,
        pixKey: pixKey.trim(),
      });

      setSuccessMessage("Dados de recebimento atualizados com sucesso.");
      void loadData();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível atualizar a chave de repasse.",
      );
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleRequestPayout() {
    setIsRequestingPayout(true);
    setError(null);

    try {
      await requestAdminPayout();

      setSuccessMessage("Transferência Pix solicitada com sucesso.");
      void loadData();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível solicitar a transferência Pix.",
      );
    } finally {
      setIsRequestingPayout(false);
    }
  }

  if (isLoading || !wallet) {
    return (
      <div className={styles.page}>
        <p className={tableStyles.empty}>Carregando carteira...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <section className={styles.walletCard}>
        <div className={styles.walletHeader}>
          <div className={styles.walletIcon}>
            <WalletIcon size={22} />
          </div>

          <div>
            <h2>Carteira Digital Joga Junto</h2>
            <p>
              Saldos de reservas acumulados. Configure a sua chave Pix para
              receber os repasses.
            </p>
          </div>
        </div>

        <div className={styles.walletGrid}>
          <div className={styles.walletBox}>
            <span>Disponível para Saque</span>

            <strong className={styles.walletValue}>
              {formatCurrency(wallet.availableInCents)}
            </strong>

            <button
              type="button"
              className={styles.payoutButton}
              disabled={
                isRequestingPayout ||
                wallet.availableInCents <= 0 ||
                !wallet.payoutAccount
              }
              onClick={() => void handleRequestPayout()}
            >
              <Send size={15} />
              {isRequestingPayout
                ? "Solicitando..."
                : !wallet.payoutAccount
                  ? "Cadastre a chave Pix abaixo"
                  : "Solicitar Transferência Pix"}
            </button>
          </div>

          <div className={styles.walletBox}>
            <span>Recebíveis Futuros</span>

            <strong className={styles.futureValue}>
              {formatCurrency(wallet.futureReceivableInCents)}
            </strong>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3>Dados para Recebimento (Pix/Bancos)</h3>

        <form onSubmit={handleSaveAccount}>
          <div className={styles.grid}>
            <div className={`${styles.group} ${styles.groupFull}`}>
              <label htmlFor="bank-name">Banco</label>

              <input
                id="bank-name"
                className={styles.input}
                value={bankName}
                placeholder="Ex: Itaú Unibanco"
                onChange={(event) => setBankName(event.target.value)}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="agency">Agência</label>

              <input
                id="agency"
                className={styles.input}
                value={agency}
                onChange={(event) => setAgency(event.target.value)}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="account-number">Conta Corrente</label>

              <input
                id="account-number"
                className={styles.input}
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="pix-key-type">Tipo de Chave Pix</label>

              <select
                id="pix-key-type"
                className={styles.input}
                value={pixKeyType}
                onChange={(event) =>
                  setPixKeyType(event.target.value as PixKeyType)
                }
              >
                {Object.entries(PIX_KEY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.group}>
              <label htmlFor="pix-key">Chave Pix</label>

              <input
                id="pix-key"
                className={styles.input}
                value={pixKey}
                onChange={(event) => setPixKey(event.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.saveButton}
            disabled={isSavingAccount}
          >
            {isSavingAccount ? "Salvando..." : "Atualizar Chave de Repasse"}
          </button>
        </form>
      </section>

      <div className={tableStyles.card}>
        <div className={tableStyles.cardHeader}>
          <h3>Histórico de Repasses Pix</h3>
        </div>

        {payouts.length === 0 ? (
          <p className={tableStyles.empty}>Nenhum saque efetuado anteriormente.</p>
        ) : (
          <div className={tableStyles.tableWrapper}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>{formatDateTime(payout.requestedAt)}</td>
                    <td>{formatCurrency(payout.amountInCents)}</td>
                    <td>
                      <span
                        className={`${tableStyles.badge} ${tableStyles.badgeOk}`}
                      >
                        Concluído
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
