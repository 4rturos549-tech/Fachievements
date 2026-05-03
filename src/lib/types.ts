export type StepType = 'missable' | 'collectible' | 'tip' | 'main';
export type TrophyType = 'platinum' | 'gold' | 'silver' | 'bronze';

export interface Step {
  id: string;
  type: StepType;
  description: string;
  unlocks?: string[];
}

export interface Zone {
  name: string;
  steps: Step[];
}

export interface Playthrough {
  title: string;
  summary?: string;
  zones: Zone[];
}

export interface Achievement {
  id: string;
  type: TrophyType;
  title: string;
  description: string;
  missable?: boolean;
}

export interface ManifestInfo {
  difficulty?: string;
  estimated_time?: string;
  min_playthroughs?: string | number;
  total_trophies?: string | number;
  missable_warning?: string;
  tip?: string;
}

export interface Manifest {
  id?: string;
  igdb_id: string | number;
  title: string;
  info?: ManifestInfo;
  achievements: Achievement[];
  playthroughs: Playthrough[];
}

export interface GameMeta {
  name: string;
  summary: string | null;
  coverUrl: string | null;
  rating: number | null;
  releaseDate: number | string;
  platforms: string;
  screenshots: string[];
}

export interface GameSearchResult {
  id: number;
  name: string;
  coverUrl: string | null;
}

export interface FeaturedGame extends GameSearchResult {
  rating: number | null;
}

export type AccentColor = 'orange' | 'blue' | 'purple' | 'green' | 'red' | 'white' | 'gold';

export interface UserProfile {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  accent_color: AccentColor;
  avatar_igdb_id: number | null;
  banner_igdb_id: number | null;
  favorite_step_id: string | null;
  current_game_id: string | null;
  showcase_games: number[];
  created_at: string;
  updated_at: string;
}

export const ACCENTS: Record<AccentColor, { hex: string; soft: string; label: string }> = {
  orange: { hex: '#f5a623', soft: 'rgba(245,166,35,0.12)', label: 'Naranja' },
  blue:   { hex: '#4a9eff', soft: 'rgba(74,158,255,0.12)', label: 'Azul' },
  purple: { hex: '#b58cff', soft: 'rgba(181,140,255,0.12)', label: 'Púrpura' },
  green:  { hex: '#4ade80', soft: 'rgba(74,222,128,0.12)', label: 'Verde' },
  red:    { hex: '#e54545', soft: 'rgba(229,69,69,0.12)',  label: 'Rojo' },
  white:  { hex: '#f0ece4', soft: 'rgba(240,236,228,0.12)', label: 'Blanco' },
  gold:   { hex: '#ffd27a', soft: 'rgba(255,210,122,0.14)', label: 'Dorado' },
};

