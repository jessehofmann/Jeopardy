import { generateGameCatalogs } from "@shared/data/clueCatalog";

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
