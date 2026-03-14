export interface AzgaarGenerationOptions {
  seed?: string;
  width?: number;
  height?: number;
  pointsCells?: number;
  template?: string;
  cultures?: number;
  culturesSet?: string;
  statesNumber?: number;
  provincesRatio?: number;
  sizeVariety?: number;
  growthRate?: number;
  statesGrowthRate?: number;
  neutralRate?: number;
  manors?: number;
  religionsNumber?: number;
  emblemShape?: string;
  prec?: number;
  heightExponent?: number;
  resolveDepressionsSteps?: number;
  lakeElevationLimit?: number;
  temperatureEquator?: number;
  temperatureNorthPole?: number;
  temperatureSouthPole?: number;
  mapSize?: number;
  latitude?: number;
  longitude?: number;
  winds?: number[];
  year?: number;
  era?: string;
  eraShort?: string;
  urbanization?: number;
  populationRate?: number;
}

export interface GeneratedWorldData {
  info: {
    version: string;
    description: string;
    exportedAt: string;
    mapName: string;
    width: number;
    height: number;
    seed: string;
    mapId: number;
  };
  settings: Record<string, unknown>;
  mapCoordinates: Record<string, number>;
  pack: Record<string, unknown>;
  grid: Record<string, unknown>;
  biomesData: Record<string, unknown>;
  notes: unknown[];
  nameBases: unknown[];
}
