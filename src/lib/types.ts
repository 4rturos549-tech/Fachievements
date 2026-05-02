export type StepType = 'missable' | 'collectible' | 'tip' | 'main';
export type TrophyType = 'platinum' | 'gold' | 'silver' | 'bronze';

export interface Step {
  id: string;
  type: StepType;
  description: string;
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
