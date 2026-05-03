/**
 * Calcula la racha actual y la racha más larga (en días) a partir de una lista
 * de timestamps (created_at) de pasos completados, ordenados desc o sin orden.
 */
export function computeStreaks(timestamps: string[]): { current: number; longest: number; lastDay: string | null } {
  if (timestamps.length === 0) return { current: 0, longest: 0, lastDay: null };

  // Set de días YYYY-MM-DD donde hubo actividad
  const days = new Set<string>();
  for (const ts of timestamps) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    days.add(d.toISOString().slice(0, 10));
  }

  const sorted = Array.from(days).sort();
  if (sorted.length === 0) return { current: 0, longest: 0, lastDay: null };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diff === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Racha actual: cuenta hacia atrás desde hoy o ayer
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const last = sorted[sorted.length - 1];
  let current = 0;
  if (last === today || last === yesterday) {
    current = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const prev = new Date(sorted[i]);
      const curr = new Date(sorted[i + 1]);
      const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
      if (diff === 1) current += 1;
      else break;
    }
  }

  return { current, longest, lastDay: last };
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = 60_000;
  const hr = 3_600_000;
  const day = 86_400_000;
  if (diff < min) return 'ahora';
  if (diff < hr) return `hace ${Math.floor(diff / min)} min`;
  if (diff < day) return `hace ${Math.floor(diff / hr)} h`;
  if (diff < 7 * day) return `hace ${Math.floor(diff / day)} d`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
