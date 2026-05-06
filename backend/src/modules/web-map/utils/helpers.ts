export function resolveSphere(index: number, weakAreas: string[]): string {
  return weakAreas[index] ?? weakAreas[weakAreas.length - 1] ?? 'Фокус'
}

export function getMonthLabel(month: number): string {
  return [
    '',
    'Січень','Лютий','Березень','Квітень','Травень','Червень',
    'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
  ][month] ?? `${month}`
}