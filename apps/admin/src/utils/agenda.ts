export function buildMonthCalendar(
  year: number,
  month: number,
): Array<number | null> {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const calendar: Array<number | null> = Array(42).fill(null);

  for (let day = 1; day <= totalDays; day++) {
    calendar[firstDay + day - 1] = day;
  }

  return calendar;
}

export function formatDatePtBr(year: number, month: number, day: number) {
  const formattedMonth = String(month + 1).padStart(2, "0");
  const formattedDay = String(day).padStart(2, "0");

  return `${formattedDay}/${formattedMonth}/${year}`;
}

export function formatPrice(priceInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceInCents / 100);
}

export function getMonthName(year: number, month: number) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
