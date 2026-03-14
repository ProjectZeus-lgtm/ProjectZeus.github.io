import type {AzgaarGenerationOptions, GeneratedWorldData} from "./types.js";
import {ensureAzgaarRuntime, prepareAzgaarGlobals} from "./legacy-runtime.js";

function defineMapSize() {
  const globalAny = globalThis as any;
  const template = globalAny.byId("templateInput").value;

  const presets: Record<string, [number, number, number]> = {
    "africa-centric": [45, 53, 38],
    arabia: [20, 35, 35],
    atlantics: [42, 23, 65],
    britain: [7, 20, 51.3],
    caribbean: [15, 40, 74.8],
    "east-asia": [11, 28, 9.4],
    eurasia: [38, 19, 27],
    europe: [20, 16, 44.8],
    "europe-accented": [14, 22, 44.8],
    "europe-and-central-asia": [25, 10, 39.5],
    "europe-central": [11, 22, 46.4],
    "europe-north": [7, 18, 48.9],
    greenland: [22, 7, 55.8],
    hellenica: [8, 27, 43.5],
    iceland: [2, 15, 55.3],
    "indian-ocean": [45, 55, 14],
    "mediterranean-sea": [10, 29, 45.8],
    "middle-east": [8, 31, 34.4],
    "north-america": [37, 17, 87],
    "us-centric": [66, 27, 100],
    "us-mainland": [16, 30, 77.5],
    world: [78, 27, 40],
    "world-from-pacific": [75, 32, 30],
  };

  let size = globalAny.byId("mapSizeInput").valueAsNumber || 30;
  let latitude = globalAny.byId("latitudeInput").valueAsNumber || 50;
  let longitude = globalAny.byId("longitudeInput").valueAsNumber || 50;

  if (presets[template]) {
    [size, latitude, longitude] = presets[template];
  }

  globalAny.mapSizeInput.value = globalAny.mapSizeOutput.value = String(size);
  globalAny.mapSizeInput.valueAsNumber = globalAny.mapSizeOutput.valueAsNumber = size;
  globalAny.latitudeInput.value = globalAny.latitudeOutput.value = String(latitude);
  globalAny.latitudeInput.valueAsNumber = globalAny.latitudeOutput.valueAsNumber = latitude;
  globalAny.longitudeInput.value = globalAny.longitudeOutput.value = String(longitude);
  globalAny.longitudeInput.valueAsNumber = globalAny.longitudeOutput.valueAsNumber = longitude;
}

function calculateMapCoordinates() {
  const globalAny = globalThis as any;
  const sizeFraction = globalAny.byId("mapSizeOutput").valueAsNumber / 100;
  const latShift = globalAny.byId("latitudeOutput").valueAsNumber / 100;
  const lonShift = globalAny.byId("longitudeOutput").valueAsNumber / 100;

  const latT = globalAny.rn(sizeFraction * 180, 1);
  const latN = globalAny.rn(90 - (180 - latT) * latShift, 1);
  const latS = globalAny.rn(latN - latT, 1);

  const lonT = globalAny.rn(Math.min((globalAny.graphWidth / globalAny.graphHeight) * latT, 360), 1);
  const lonE = globalAny.rn(180 - (360 - lonT) * lonShift, 1);
  const lonW = globalAny.rn(lonE - lonT, 1);
  globalAny.mapCoordinates = {latT, latN, latS, lonT, lonW, lonE};
}

function calculateTemperatures() {
  const globalAny = globalThis as any;
  const cells = globalAny.grid.cells;
  cells.temp = new Int8Array(cells.i.length);

  const {temperatureEquator, temperatureNorthPole, temperatureSouthPole} = globalAny.options;
  const tropics = [16, -20];
  const tropicalGradient = 0.15;
  const tempNorthTropic = temperatureEquator - tropics[0] * tropicalGradient;
  const northernGradient = (tempNorthTropic - temperatureNorthPole) / (90 - tropics[0]);
  const tempSouthTropic = temperatureEquator + tropics[1] * tropicalGradient;
  const southernGradient = (tempSouthTropic - temperatureSouthPole) / (90 + tropics[1]);
  const exponent = globalAny.heightExponentInput.valueAsNumber;

  for (let rowCellId = 0; rowCellId < cells.i.length; rowCellId += globalAny.grid.cellsX) {
    const [, y] = globalAny.grid.points[rowCellId];
    const rowLatitude = globalAny.mapCoordinates.latN - (y / globalAny.graphHeight) * globalAny.mapCoordinates.latT;
    const tempSeaLevel = rowLatitude <= 16 && rowLatitude >= -20
      ? temperatureEquator - Math.abs(rowLatitude) * tropicalGradient
      : rowLatitude > 0
      ? tempNorthTropic - (rowLatitude - tropics[0]) * northernGradient
      : tempSouthTropic + (rowLatitude - tropics[1]) * southernGradient;

    for (let cellId = rowCellId; cellId < rowCellId + globalAny.grid.cellsX; cellId++) {
      const h = cells.h[cellId];
      const height = h < 20 ? 0 : Math.pow(h - 18, exponent);
      const drop = globalAny.rn((height / 1000) * 6.5);
      cells.temp[cellId] = globalAny.minmax(tempSeaLevel - drop, -128, 127);
    }
  }
}

function generatePrecipitation() {
  const globalAny = globalThis as any;
  const {cells, cellsX, cellsY} = globalAny.grid;
  cells.prec = new Uint8Array(cells.i.length);

  const cellsNumberModifier = (Number(globalAny.pointsInput.dataset.cells) / 10000) ** 0.25;
  const precInputModifier = globalAny.precInput.valueAsNumber / 100;
  const modifier = cellsNumberModifier * precInputModifier;
  const westerly: any[] = [];
  const easterly: any[] = [];
  let southerly = 0;
  let northerly = 0;
  const latitudeModifier = [4, 2, 2, 2, 1, 1, 2, 2, 2, 2, 3, 3, 2, 2, 1, 1, 1, 0.5];
  const MAX_PASSABLE_ELEVATION = 85;

  globalAny.d3.range(0, cells.i.length, cellsX).forEach((c: number, i: number) => {
    const lat = globalAny.mapCoordinates.latN - (i / cellsY) * globalAny.mapCoordinates.latT;
    const latBand = ((Math.abs(lat) - 1) / 5) | 0;
    const latMod = latitudeModifier[latBand];
    const windTier = (Math.abs(lat - 89) / 30) | 0;
    const angle = globalAny.options.winds[windTier];

    if (angle > 40 && angle < 140) westerly.push([c, latMod, windTier]);
    if (angle > 220 && angle < 320) easterly.push([c + cellsX - 1, latMod, windTier]);
    if (angle > 100 && angle < 260) northerly++;
    if (angle > 280 || angle < 80) southerly++;
  });

  if (westerly.length) passWind(westerly, 120 * modifier, 1, cellsX);
  if (easterly.length) passWind(easterly, 120 * modifier, -1, cellsX);

  const verticalTotal = southerly + northerly;
  if (northerly) {
    const bandN = ((Math.abs(globalAny.mapCoordinates.latN) - 1) / 5) | 0;
    const latModN = globalAny.mapCoordinates.latT > 60 ? globalAny.d3.mean(latitudeModifier) : latitudeModifier[bandN];
    passWind(globalAny.d3.range(0, cellsX, 1), (northerly / verticalTotal) * 60 * modifier * latModN, cellsX, cellsY);
  }

  if (southerly) {
    const bandS = ((Math.abs(globalAny.mapCoordinates.latS) - 1) / 5) | 0;
    const latModS = globalAny.mapCoordinates.latT > 60 ? globalAny.d3.mean(latitudeModifier) : latitudeModifier[bandS];
    passWind(globalAny.d3.range(cells.i.length - cellsX, cells.i.length, 1), (southerly / verticalTotal) * 60 * modifier * latModS, -cellsX, cellsY);
  }

  function passWind(source: any[], maxPrec: number, next: number, steps: number) {
    const maxPrecInit = maxPrec;
    for (let first of source) {
      if (first[0] !== undefined) {
        maxPrec = Math.min(maxPrecInit * first[1], 255);
        first = first[0];
      }

      let humidity = maxPrec - cells.h[first];
      if (humidity <= 0) continue;

      for (let s = 0, current = first; s < steps; s++, current += next) {
        if (cells.temp[current] < -5) continue;
        if (cells.h[current] < 20) {
          if (cells.h[current + next] >= 20) {
            cells.prec[current + next] += Math.max(humidity / globalAny.rand(10, 20), 1);
          } else {
            humidity = Math.min(humidity + 5 * modifier, maxPrec);
            cells.prec[current] += 5 * modifier;
          }
          continue;
        }

        const isPassable = cells.h[current + next] <= MAX_PASSABLE_ELEVATION;
        const normalLoss = Math.max(humidity / (10 * modifier), 1);
        const diff = Math.max(cells.h[current + next] - cells.h[current], 0);
        const mod = (cells.h[current + next] / 70) ** 2;
        const precipitation = isPassable ? globalAny.minmax(normalLoss + diff * mod, 1, humidity) : humidity;
        cells.prec[current] += precipitation;
        const evaporation = precipitation > 1.5 ? 1 : 0;
        humidity = isPassable ? globalAny.minmax(humidity - precipitation + evaporation, 0, maxPrec) : 0;
      }
    }
  }
}

function addLakesInDeepDepressions() {
  const globalAny = globalThis as any;
  const elevationLimit = globalAny.lakeElevationLimitOutput.valueAsNumber;
  if (elevationLimit === 80) return;
  const {cells, features} = globalAny.grid;
  const {c, h, b} = cells;
  for (const i of cells.i) {
    if (b[i] || h[i] < 20) continue;
    const minHeight = globalAny.d3.min(c[i].map((cellId: number) => h[cellId]));
    if (h[i] > minHeight) continue;
    if (h[i] > elevationLimit) continue;
    const lakeCells = [i];
    const queue = [i];
    while (queue.length) {
      const cellId = queue.pop();
      c[cellId].forEach((neighborId: number) => {
        if (h[neighborId] !== h[i]) return;
        if (lakeCells.includes(neighborId)) return;
        lakeCells.push(neighborId);
        queue.push(neighborId);
      });
    }
    const feature = features.length;
    lakeCells.forEach((cellId: number) => {
      h[cellId] = 19;
      cells.f[cellId] = feature;
      cells.t[cellId] = -1;
    });
    features.push({i: feature, type: "lake", land: false, border: false, cells: lakeCells.length, firstCell: i});
  }
}

function openNearSeaLakes() {
  const globalAny = globalThis as any;
  const {cells} = globalAny.grid;
  for (const i of cells.i) {
    if (cells.h[i] >= 20) continue;
    if (cells.b[i]) continue;
    if (cells.c[i].some((cellId: number) => cells.t[cellId] === -2)) {
      cells.h[i] = 18;
    }
  }
}

function reGraph() {
  const globalAny = globalThis as any;
  const {cells: gridCells, points, features} = globalAny.grid;
  const newCells: {p: [number, number][], g: number[], h: number[]} = {p: [], g: [], h: []};
  const spacing2 = globalAny.grid.spacing ** 2;

  for (const i of gridCells.i) {
    const height = gridCells.h[i];
    const type = gridCells.t[i];
    if (height < 20 && type !== -1 && type !== -2) continue;
    if (type === -2 && (i % 4 === 0 || features[gridCells.f[i]].type === "lake")) continue;
    const [x, y] = points[i];
    addNewPoint(i, x, y, height);

    if (type === 1 || type === -1) {
      if (gridCells.b[i]) continue;
      gridCells.c[i].forEach((neighborId: number) => {
        if (i > neighborId) return;
        if (gridCells.t[neighborId] === type) {
          const dist2 = (y - points[neighborId][1]) ** 2 + (x - points[neighborId][0]) ** 2;
          if (dist2 < spacing2) return;
          addNewPoint(i, globalAny.rn((x + points[neighborId][0]) / 2, 1), globalAny.rn((y + points[neighborId][1]) / 2, 1), height);
        }
      });
    }
  }

  function addNewPoint(i: number, x: number, y: number, height: number) {
    newCells.p.push([x, y]);
    newCells.g.push(i);
    newCells.h.push(height);
  }

  const {cells: packCells, vertices} = globalAny.calculateVoronoi(newCells.p, globalAny.grid.boundary);
  globalAny.pack.vertices = vertices;
  globalAny.pack.cells = packCells;
  globalAny.pack.cells.p = newCells.p;
  globalAny.pack.cells.g = globalAny.createTypedArray({maxValue: globalAny.grid.points.length, from: newCells.g});
  globalAny.pack.cells.q = globalAny.d3.quadtree(newCells.p.map(([x, y], i) => [x, y, i]));
  globalAny.pack.cells.h = globalAny.createTypedArray({maxValue: 100, from: newCells.h});
  globalAny.pack.cells.area = globalAny.createTypedArray({maxValue: globalAny.UINT16_MAX, length: packCells.i.length}).map((_: unknown, cellId: number) => {
    const area = Math.abs(globalAny.d3.polygonArea(globalAny.getPackPolygon(cellId)));
    return Math.min(area, globalAny.UINT16_MAX);
  });
}

function rankCells() {
  const globalAny = globalThis as any;
  const {cells, features} = globalAny.pack;
  cells.s = new Int16Array(cells.i.length);
  cells.pop = new Float32Array(cells.i.length);

  const meanFlux = globalAny.d3.median(cells.fl.filter((f: number) => f)) || 0;
  const maxFlux = globalAny.d3.max(cells.fl) + globalAny.d3.max(cells.conf);
  const meanArea = globalAny.d3.mean(cells.area);
  const scoreMap = {estuary: 15, ocean_coast: 5, save_harbor: 20, freshwater: 30, salt: 10, frozen: 1, dry: -5, sinkhole: -5, lava: -30};

  for (const i of cells.i) {
    if (cells.h[i] < 20) continue;
    let score = globalAny.biomesData.habitability[cells.biome[i]];
    if (!score) continue;
    if (meanFlux) score += globalAny.normalize(cells.fl[i] + cells.conf[i], meanFlux, maxFlux) * 250;
    score -= (cells.h[i] - 50) / 5;
    if (cells.t[i] === 1) {
      if (cells.r[i]) score += scoreMap.estuary;
      const feature = features[cells.f[cells.haven[i]]];
      if (feature.type === "lake") score += scoreMap[feature.group] || 0;
      else {
        score += scoreMap.ocean_coast;
        if (cells.harbor[i] === 1) score += scoreMap.save_harbor;
      }
    }
    cells.s[i] = score / 5;
    cells.pop[i] = cells.s[i] > 0 ? (cells.s[i] * cells.area[i]) / meanArea : 0;
  }
}

function buildSettings(options: Required<AzgaarGenerationOptions>) {
  return {
    distanceUnit: "mi",
    distanceScale: 3,
    areaUnit: "square",
    heightUnit: "ft",
    heightExponent: String(options.heightExponent),
    temperatureScale: "°F",
    populationRate: options.populationRate,
    urbanization: options.urbanization,
    mapSize: String((globalThis as any).mapSizeOutput.value),
    latitude: String((globalThis as any).latitudeOutput.value),
    longitude: String((globalThis as any).longitudeOutput.value),
    prec: String(options.prec),
    options: {...(globalThis as any).options},
    mapName: (globalThis as any).mapName.value,
    hideLabels: true,
    stylePreset: "default",
    rescaleLabels: true,
    urbanDensity: 10,
  };
}

export async function generateAzgaarWorld(inputOptions: AzgaarGenerationOptions = {}): Promise<GeneratedWorldData> {
  await ensureAzgaarRuntime();
  const options = prepareAzgaarGlobals(inputOptions);
  const globalAny = globalThis as any;
  Math.random = globalAny.aleaPRNG(globalAny.seed);

  globalAny.grid = globalAny.generateGrid();
  globalAny.grid.cells.h = await globalAny.HeightmapGenerator.generate(globalAny.grid);
  globalAny.pack = {};

  globalAny.Features.markupGrid();
  addLakesInDeepDepressions();
  openNearSeaLakes();
  defineMapSize();
  calculateMapCoordinates();
  calculateTemperatures();
  generatePrecipitation();

  reGraph();
  globalAny.Features.markupPack();
  globalAny.Rivers.generate();
  globalAny.Biomes.define();
  globalAny.Features.defineGroups();

  rankCells();
  globalAny.Cultures.generate();
  globalAny.Cultures.expand();

  globalAny.Burgs.generate();
  globalAny.States.generate();
  globalAny.Routes.generate();
  globalAny.Religions.generate();

  globalAny.Burgs.specify();
  globalAny.States.collectStatistics();
  globalAny.States.defineStateForms();
  globalAny.Provinces.generate();
  globalAny.Provinces.getPoles();

  globalAny.Rivers.specify();
  globalAny.Lakes.defineNames();
  globalAny.Military.generate();
  globalAny.Markers.generate();
  globalAny.Zones.generate();
  globalAny.Names.getMapName(true);
  if (!globalAny.options.era || globalAny.options.era === "Era") {
    globalAny.options.era = globalAny.eraInput.value = globalAny.Names.getBaseShort(globalAny.P(0.7) ? 1 : globalAny.rand(globalAny.nameBases.length)) + " Era";
    globalAny.options.eraShort = globalAny.options.era.split(" ").map((w: string) => w[0].toUpperCase()).join("");
  }

  return {
    info: {
      version: "1.110.0-headless",
      description: "Azgaar headless extraction output",
      exportedAt: new Date().toISOString(),
      mapName: globalAny.mapName.value || "Generated Map",
      width: globalAny.graphWidth,
      height: globalAny.graphHeight,
      seed: String(globalAny.seed),
      mapId: globalAny.mapId,
    },
    settings: buildSettings(options),
    mapCoordinates: globalAny.mapCoordinates,
    pack: globalAny.pack,
    grid: globalAny.grid,
    biomesData: globalAny.biomesData,
    notes: globalAny.notes,
    nameBases: globalAny.nameBases,
  };
}
