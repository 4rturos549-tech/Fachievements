export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface BadgeContext {
  totalSteps: number;
  totalPlatinos: number;
  totalGames: number;
  longestStreak: number;
}

export function computeBadges(ctx: BadgeContext): Badge[] {
  return [
    { id: 'first_step',  title: 'Primer paso',         description: 'Marca tu primer paso.',                          icon: '◯', unlocked: ctx.totalSteps >= 1 },
    { id: 'first_plat',  title: 'Primer platino',      description: 'Consigue tu primer platino.',                    icon: '◆', unlocked: ctx.totalPlatinos >= 1 },
    { id: 'five_games',  title: 'Cinco frentes',       description: 'Empieza guías de 5 juegos distintos.',           icon: '✦', unlocked: ctx.totalGames >= 5 },
    { id: 'ten_plat',    title: 'Cazador veterano',    description: 'Consigue 10 platinos.',                          icon: '◆◆', unlocked: ctx.totalPlatinos >= 10 },
    { id: 'streak_7',    title: 'Racha semanal',       description: '7 días consecutivos marcando pasos.',            icon: '▰', unlocked: ctx.longestStreak >= 7 },
    { id: 'streak_30',   title: 'Racha mensual',       description: '30 días consecutivos marcando pasos.',           icon: '▰▰', unlocked: ctx.longestStreak >= 30 },
    { id: 'hundred',     title: 'Centenario',          description: 'Marca 100 pasos en total.',                      icon: '⌬', unlocked: ctx.totalSteps >= 100 },
    { id: 'thousand',    title: 'Maestro de logros',   description: 'Marca 1000 pasos en total.',                     icon: '⌬⌬', unlocked: ctx.totalSteps >= 1000 },
  ];
}

export function avatarFrame(platinos: number): { color: string; label: string } | null {
  if (platinos >= 25) return { color: '#ffd27a', label: 'Leyenda' };
  if (platinos >= 10) return { color: '#e8d5ff', label: 'Maestro' };
  if (platinos >= 5)  return { color: '#f5a623', label: 'Veterano' };
  if (platinos >= 1)  return { color: '#cd7f32', label: 'Cazador' };
  return null;
}
