import {
  generateGameCatalogs,
  round1Categories,
  round2Categories as defaultRound2Categories,
} from "@shared/data/clueCatalog";

export const createBoardCatalogs = (seed: string, categoryCount = 6) =>
  generateGameCatalogs({ seed, categoryCount });

export const createBoardCatalogsWithExcludes = (
  seed: string,
  categoryCount = 6,
  round1ExcludeClueIds: string[] = [],
  round2ExcludeClueIds: string[] = []
) =>
  generateGameCatalogs({
    seed,
    categoryCount,
    round1ExcludeClueIds,
    round2ExcludeClueIds,
  });

export const sampleCategories = round1Categories;
export const round2Categories = defaultRound2Categories;
