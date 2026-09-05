/** Suma meses conservando el día de corte (ajusta fin de mes: 31 ene + 1 mes → 28/29 feb). */
export function addMonthsKeepCutDay(fecha: Date, meses: number): Date {
  if (meses <= 0) return new Date(fecha);
  const day = fecha.getDate();
  const result = new Date(fecha.getFullYear(), fecha.getMonth() + meses, day);
  if (result.getDate() !== day) {
    return new Date(result.getFullYear(), result.getMonth() + 1, 0);
  }
  return result;
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function previewPaymentDate(fechaCorte: Date, meses: number): Date {
  return addMonthsKeepCutDay(fechaCorte, meses);
}
