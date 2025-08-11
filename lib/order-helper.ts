export function formatCurrency(n: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n);
}

export function formatVN(dt: Date) {
  return dt
    .toLocaleString("vi-VN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(",", "");
}

export function numberCompact(n: number) {
    return Intl.NumberFormat("vi-VN", { notation: "compact" }).format(n);
}


export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}