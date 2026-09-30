const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_REGEX.test(value);
}

export function getCurrentMonth() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/**
 * Início e fim (exclusivo) do mês em UTC, para consultas
 * de intervalo de datas no Mongo.
 */
export function getMonthRange(month: string) {
  const [yearText, monthText] = month.split("-");

  const year = Number(yearText);
  const monthNumber = Number(monthText);

  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  return {
    start,
    end,
  };
}

/**
 * Compara dois meses no formato "YYYY-MM".
 * Retorna negativo se `a` for antes de `b`, positivo se depois.
 */
export function compareMonths(a: string, b: string) {
  return a.localeCompare(b);
}
