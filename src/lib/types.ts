// Shared frontend types
import type { ITitle } from "@/server/models/title.model";

// Title shape exposed to the frontend
export type Title = {
  id: string;
  _id?: string;
  slug: string;
  title: string;
  synopsis: string;
  genre: string;
  year: number;
  rating: number;
  durationSec: number;
  maturity: string;
  backdropUrl: string;
  streamSlug: string;
  trendingScore: number;
  featured: boolean;
  createdAt: string | Date;
};

// DTO used by the frontend: a title decorated with per-user state.
export type TitleWithState = Title & {
  inMyList?: boolean;
  progressRatio?: number; // 0..1, used by the Continue Watching row
  progressSec?: number;
};

export type { ITitle };
