/** Vista previa local de la nueva fecha de corte (misma lógica que el backend). */
export function addMonthsKeepCutDay(isoDate: string, meses: number): string {
  const base = isoDate.split('T')[0];
  const [y, m, d] = base.split('-').map(Number);
  const day = d;
  const result = new Date(y, m - 1 + meses, day);
  if (result.getDate() !== day) {
    const last = new Date(result.getFullYear(), result.getMonth() + 1, 0);
    return last.toISOString().split('T')[0];
  }
  const yy = result.getFullYear();
  const mm = String(result.getMonth() + 1).padStart(2, '0');
  const dd = String(result.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function cutDayFromIso(isoDate: string): number {
  return parseInt(isoDate.split('T')[0].split('-')[2], 10);
}
