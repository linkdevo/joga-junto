export function getCurrentMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function formatMonthLabel(month: string) {
  const [yearText, monthText] = month.split("-");

  const date = new Date(Number(yearText), Number(monthText) - 1, 1);

  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function addMonths(month: string, amount: number) {
  const [yearText, monthText] = month.split("-");

  const date = new Date(Number(yearText), Number(monthText) - 1 + amount, 1);

  const year = date.getFullYear();
  const monthNumber = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${monthNumber}`;
}

/**
 * Lista os últimos `count` meses (incluindo o atual),
 * do mais recente para o mais antigo, para o seletor de mês.
 */
export function listRecentMonths(count = 12) {
  const currentMonth = getCurrentMonth();

  return Array.from({ length: count }, (_, index) => {
    const month = addMonths(currentMonth, -index);

    return {
      month,
      label: formatMonthLabel(month),
    };
  });
}
