import type {AzgaarGenerationOptions} from "./types.js";

export const DEFAULT_AZGAAR_OPTIONS: Required<AzgaarGenerationOptions> = {
  seed: "1",
  width: 960,
  height: 540,
  pointsCells: 10000,
  template: "continents",
  cultures: 12,
  culturesSet: "world",
  statesNumber: 18,
  provincesRatio: 20,
  sizeVariety: 4,
  growthRate: 1,
  statesGrowthRate: 1,
  neutralRate: 1,
  manors: 1000,
  religionsNumber: 6,
  emblemShape: "culture",
  prec: 100,
  heightExponent: 2,
  resolveDepressionsSteps: 250,
  lakeElevationLimit: 20,
  temperatureEquator: 25,
  temperatureNorthPole: -25,
  temperatureSouthPole: -15,
  mapSize: 30,
  latitude: 50,
  longitude: 50,
  winds: [225, 45, 225, 315, 135, 315],
  year: 1000,
  era: "Era",
  eraShort: "E",
  urbanization: 1,
  populationRate: 1000,
};

export function normalizeAzgaarOptions(overrides: AzgaarGenerationOptions = {}): Required<AzgaarGenerationOptions> {
  const merged = {
    ...DEFAULT_AZGAAR_OPTIONS,
    ...overrides,
    winds: overrides.winds ? [...overrides.winds] : [...DEFAULT_AZGAAR_OPTIONS.winds],
  };

  merged.seed = String(merged.seed || DEFAULT_AZGAAR_OPTIONS.seed);
  merged.eraShort = overrides.eraShort || String(merged.era)
    .split(" ")
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "E";

  return merged;
}
