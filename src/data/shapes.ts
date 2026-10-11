export interface LeaderEntryShape {
  id?: string;
  name: string;
  team?: string;
  season?: number;
  value: number;
  detail?: string;
}

export interface ComputedRecordsShape {
  coverage: string;
  seasonLeaders: Record<string, LeaderEntryShape[]>;
  careerLeaders: Record<string, LeaderEntryShape[]>;
  postseasonCareer: Record<string, LeaderEntryShape[]>;
  teamSeason: Record<string, LeaderEntryShape[]>;
  games: Record<string, LeaderEntryShape[]>;
}
