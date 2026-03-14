import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {pathToFileURL} from "node:url";
import * as d3 from "d3";
import Alea from "alea";
import Delaunator from "delaunator";
import FlatQueue from "flatqueue";
import {HeadlessDocument, createRegistryEntries} from "./headless-dom.js";
import {normalizeAzgaarOptions} from "./options.js";
import type {AzgaarGenerationOptions} from "./types.js";

const VENDOR_ROOT = path.resolve(process.cwd(), "src/engine/azgaar/vendor");
const headlessDocument = new HeadlessDocument();
let bootstrapPromise: Promise<void> | null = null;

function installGlobalScaffolding() {
  const globalAny = globalThis as any;
  headlessDocument.setRegistry(createRegistryEntries(normalizeAzgaarOptions()));
  globalAny.window = globalThis;
  globalAny.self = globalThis;
  globalAny.document = headlessDocument;
  globalAny.Node = globalAny.Node || class Node {
    addEventListener() {}
    removeEventListener() {}
  };

  if (!globalAny.navigator?.language) {
    Object.defineProperty(globalAny, "navigator", {
      configurable: true,
      value: {language: "en-US", userAgent: "node", userAgentData: {mobile: false}},
    });
  }

  if (!globalAny.location?.href) {
    Object.defineProperty(globalAny, "location", {
      configurable: true,
      value: {href: "http://localhost/"},
    });
  }

  globalAny.alertMessage = globalAny.alertMessage || {innerHTML: ""};
  globalAny.$ = globalAny.$ || (() => ({dialog() { return this; }, is() { return false; }}));
  globalAny.locked = globalAny.locked || (() => false);
  globalAny.unlock = globalAny.unlock || (() => {});
  globalAny.lock = globalAny.lock || (() => {});
  globalAny.tip = globalAny.tip || (() => "");
  globalAny.aleaPRNG = globalAny.aleaPRNG || ((seed: string | number) => Alea(String(seed)));
  globalAny.d3 = d3;
  globalAny.Delaunator = Delaunator;
  globalAny.FlatQueue = FlatQueue;
  globalAny.INFO = true;
  globalAny.TIME = false;
  globalAny.WARN = true;
  globalAny.ERROR = true;
  globalAny.DEBUG = {};
  globalAny.modules = globalAny.modules || {};
  globalAny.notes = globalAny.notes || [];
  globalAny.nameBases = globalAny.nameBases || [];
  globalAny.customization = 0;
  globalAny.getFriendlyHeight = globalAny.getFriendlyHeight || ((point: [number, number]) => {
    if (!point || !globalAny.pack?.cells?.h) return "unknown";
    const [x, y] = point;
    const cellId = globalAny.findCell ? globalAny.findCell(x, y) : null;
    if (cellId === null || cellId === undefined) return "unknown";
    const height = globalAny.pack.cells.h[cellId];
    return `${height}`;
  });

  if (!globalAny.polygonclip) {
    const bitCode = (point: [number, number], bbox: [number, number, number, number]) => {
      let code = 0;
      if (point[0] < bbox[0]) code |= 1;
      else if (point[0] > bbox[2]) code |= 2;
      if (point[1] < bbox[1]) code |= 4;
      else if (point[1] > bbox[3]) code |= 8;
      return code;
    };

    const intersect = (
      a: [number, number],
      b: [number, number],
      edge: number,
      bbox: [number, number, number, number]
    ) => {
      if (edge & 8) return [a[0] + ((b[0] - a[0]) * (bbox[3] - a[1])) / (b[1] - a[1]), bbox[3]];
      if (edge & 4) return [a[0] + ((b[0] - a[0]) * (bbox[1] - a[1])) / (b[1] - a[1]), bbox[1]];
      if (edge & 2) return [bbox[2], a[1] + ((b[1] - a[1]) * (bbox[2] - a[0])) / (b[0] - a[0])];
      if (edge & 1) return [bbox[0], a[1] + ((b[1] - a[1]) * (bbox[0] - a[0])) / (b[0] - a[0])];
      return null;
    };

    globalAny.polygonclip = (points: [number, number][], bbox: [number, number, number, number], secure = 0) => {
      let polygon = points;
      for (let edge = 1; edge <= 8; edge *= 2) {
        const result: [number, number][] = [];
        let previous = polygon[polygon.length - 1];
        let previousInside = !(bitCode(previous, bbox) & edge);
        for (const current of polygon) {
          const currentInside = !(bitCode(current, bbox) & edge);
          const crosses = currentInside !== previousInside;
          const crossing = intersect(previous, current, edge, bbox);
          if (crosses && crossing) {
            result.push(crossing as [number, number]);
            if (secure) result.push(crossing as [number, number], crossing as [number, number]);
          }
          if (currentInside) result.push(current);
          previous = current;
          previousInside = currentInside;
        }
        polygon = result;
        if (!polygon.length) break;
      }
      return polygon;
    };
  }
}

async function importUtilities() {
  const numberUtils = await import("./vendor/src/utils/numberUtils.ts");
  const languageUtils = await import("./vendor/src/utils/languageUtils.ts");
  const arrayUtils = await import("./vendor/src/utils/arrayUtils.ts");
  const probabilityUtils = await import("./vendor/src/utils/probabilityUtils.ts");
  const unitUtils = await import("./vendor/src/utils/unitUtils.ts");
  const colorUtils = await import("./vendor/src/utils/colorUtils.ts");
  const nodeUtils = await import("./vendor/src/utils/nodeUtils.ts");
  const functionUtils = await import("./vendor/src/utils/functionUtils.ts");
  const pathUtils = await import("./vendor/src/utils/pathUtils.ts");
  const stringUtils = await import("./vendor/src/utils/stringUtils.ts");
  const shorthands = await import("./vendor/src/utils/shorthands.ts");
  const graphUtils = await import("./vendor/src/utils/graphUtils.ts");
  const commonUtils = await import("./vendor/src/utils/commonUtils.ts");
  await import("./vendor/src/modules/heightmap-generator.ts");

  const globalAny = globalThis as any;
  Object.assign(globalAny, {
    rn: numberUtils.rn,
    lim: numberUtils.lim,
    minmax: numberUtils.minmax,
    normalize: numberUtils.normalize,
    lerp: numberUtils.lerp,
    vowel: languageUtils.isVowel,
    trimVowels: languageUtils.trimVowels,
    getAdjective: languageUtils.getAdjective,
    nth: languageUtils.nth,
    abbreviate: languageUtils.abbreviate,
    list: languageUtils.list,
    last: arrayUtils.last,
    unique: arrayUtils.unique,
    deepCopy: arrayUtils.deepCopy,
    getTypedArray: arrayUtils.getTypedArray,
    createTypedArray: arrayUtils.createTypedArray,
    INT8_MAX: arrayUtils.TYPED_ARRAY_MAX_VALUES.INT8_MAX,
    UINT8_MAX: arrayUtils.TYPED_ARRAY_MAX_VALUES.UINT8_MAX,
    UINT16_MAX: arrayUtils.TYPED_ARRAY_MAX_VALUES.UINT16_MAX,
    UINT32_MAX: arrayUtils.TYPED_ARRAY_MAX_VALUES.UINT32_MAX,
    rand: probabilityUtils.rand,
    P: probabilityUtils.P,
    each: probabilityUtils.each,
    gauss: probabilityUtils.gauss,
    Pint: probabilityUtils.Pint,
    ra: probabilityUtils.ra,
    rw: probabilityUtils.rw,
    biased: probabilityUtils.biased,
    getNumberInRange: probabilityUtils.getNumberInRange,
    generateSeed: probabilityUtils.generateSeed,
    convertTemperature: (temp: number, scale: any = "°C") => unitUtils.convertTemperature(temp, scale),
    si: unitUtils.si,
    getInteger: unitUtils.getIntegerFromSI,
    toHEX: colorUtils.toHEX,
    getColors: colorUtils.getColors,
    getRandomColor: colorUtils.getRandomColor,
    getMixedColor: colorUtils.getMixedColor,
    C_12: colorUtils.C_12,
    getComposedPath: nodeUtils.getComposedPath,
    getNextId: nodeUtils.getNextId,
    rollups: functionUtils.rollups,
    dist2: functionUtils.distanceSquared,
    getIsolines: pathUtils.getIsolines,
    getPolesOfInaccessibility: pathUtils.getPolesOfInaccessibility,
    connectVertices: pathUtils.connectVertices,
    findPath: (start: number, end: any, getCost: any) => pathUtils.findPath(start, end, getCost, globalAny.pack),
    getVertexPath: (cellsArray: number[]) => pathUtils.getVertexPath(cellsArray, globalAny.pack),
    round: stringUtils.round,
    capitalize: stringUtils.capitalize,
    splitInTwo: stringUtils.splitInTwo,
    parseTransform: stringUtils.parseTransform,
    sanitizeId: stringUtils.sanitizeId,
    byId: shorthands.byId,
    shouldRegenerateGrid: (grid: any, expectedSeed: number) => graphUtils.shouldRegenerateGrid(grid, expectedSeed, globalAny.graphWidth, globalAny.graphHeight),
    generateGrid: () => graphUtils.generateGrid(globalAny.seed, globalAny.graphWidth, globalAny.graphHeight),
    findGridAll: (x: number, y: number, radius: number) => graphUtils.findGridAll(x, y, radius, globalAny.grid),
    findGridCell: (x: number, y: number) => graphUtils.findGridCell(x, y, globalAny.grid),
    findCell: (x: number, y: number, radius?: number) => graphUtils.findClosestCell(x, y, radius, globalAny.pack),
    findAll: (x: number, y: number, radius: number) => graphUtils.findAllCellsInRadius(x, y, radius, globalAny.pack),
    getPackPolygon: (cellIndex: number) => graphUtils.getPackPolygon(cellIndex, globalAny.pack),
    getGridPolygon: (cellIndex: number) => graphUtils.getGridPolygon(cellIndex, globalAny.grid),
    calculateVoronoi: graphUtils.calculateVoronoi,
    poissonDiscSampler: graphUtils.poissonDiscSampler,
    findAllInQuadtree: graphUtils.findAllInQuadtree,
    drawHeights: graphUtils.drawHeights,
    isLand: (i: number) => graphUtils.isLand(i, globalAny.pack),
    isWater: (i: number) => graphUtils.isWater(i, globalAny.pack),
    clipPoly: (points: [number, number][], secure?: number) => commonUtils.clipPoly(points, globalAny.graphWidth, globalAny.graphHeight, secure),
    getSegmentId: commonUtils.getSegmentId,
    debounce: commonUtils.debounce,
    throttle: commonUtils.throttle,
    parseError: commonUtils.parseError,
    getBase64: commonUtils.getBase64,
    openURL: commonUtils.openURL,
    wiki: commonUtils.wiki,
    link: commonUtils.link,
    isCtrlClick: commonUtils.isCtrlClick,
    generateDate: commonUtils.generateDate,
    getLongitude: (x: number, decimals?: number) => commonUtils.getLongitude(x, globalAny.mapCoordinates, globalAny.graphWidth, decimals),
    getLatitude: (y: number, decimals?: number) => commonUtils.getLatitude(y, globalAny.mapCoordinates, globalAny.graphHeight, decimals),
    getCoordinates: (x: number, y: number, decimals?: number) => commonUtils.getCoordinates(x, y, globalAny.mapCoordinates, globalAny.graphWidth, globalAny.graphHeight, decimals),
  });
}

function evaluateLegacyFile(filePath: string, globalName?: string) {
  const code = fs.readFileSync(filePath, "utf8");
  const wrapped = globalName ? `${code}\n;globalThis.${globalName} = ${globalName};` : code;
  vm.runInThisContext(wrapped, {filename: filePath});
}

async function loadLegacyModules() {
  evaluateLegacyFile(path.join(VENDOR_ROOT, "public/config/heightmap-templates.js"), "heightmapTemplates");
  evaluateLegacyFile(path.join(VENDOR_ROOT, "public/config/precreated-heightmaps.js"), "precreatedHeightmaps");

  const modules = [
    "names-generator.js",
    "lakes.js",
    "features.js",
    "biomes.js",
    "coa-generator.js",
    "cultures-generator.js",
    "routes-generator.js",
    "burgs-generator.js",
    "states-generator.js",
    "river-generator.js",
    "religions-generator.js",
    "provinces-generator.js",
    "military-generator.js",
    "markers-generator.js",
    "zones-generator.js",
  ];

  for (const moduleName of modules) {
    await import(pathToFileURL(path.join(VENDOR_ROOT, "public/modules", moduleName)).href);
  }
}

export async function ensureAzgaarRuntime() {
  installGlobalScaffolding();
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await importUtilities();
      await loadLegacyModules();
    })();
  }
  await bootstrapPromise;
}

export function prepareAzgaarGlobals(inputOptions: AzgaarGenerationOptions = {}) {
  const options = normalizeAzgaarOptions(inputOptions);
  const globalAny = globalThis as any;
  headlessDocument.setRegistry(createRegistryEntries(options));
  Object.assign(globalAny, createRegistryEntries(options));

  globalAny.options = {
    pinNotes: false,
    winds: [...options.winds],
    temperatureEquator: options.temperatureEquator,
    temperatureNorthPole: options.temperatureNorthPole,
    temperatureSouthPole: options.temperatureSouthPole,
    year: options.year,
    era: options.era,
    eraShort: options.eraShort,
    military: globalAny.options?.military || null,
    stateLabelsMode: "auto",
    showBurgPreview: true,
    burgs: {
      groups: [
        {name: "capital", active: true, order: 9, features: {capital: true}, preview: "watabou-city"},
        {name: "city", active: true, order: 8, percentile: 90, min: 5, preview: "watabou-city"},
        {name: "fort", active: true, features: {citadel: true, walls: false, plaza: false, port: false}, order: 6, max: 1},
        {name: "monastery", active: true, features: {temple: true, walls: false, plaza: false, port: false}, order: 5, max: 0.8},
        {name: "caravanserai", active: true, features: {port: false, plaza: true}, order: 4, max: 0.8, biomes: [1, 2, 3]},
        {name: "trading_post", active: true, order: 3, features: {plaza: true}, max: 0.8, biomes: [5, 6, 7, 8, 9, 10, 11, 12]},
        {name: "village", active: true, order: 2, min: 0.1, max: 2, preview: "watabou-village"},
        {name: "hamlet", active: true, order: 1, features: {plaza: false}, max: 0.1, preview: "watabou-village"},
        {name: "town", active: true, order: 7, isDefault: true, preview: "watabou-city"},
      ],
    },
  };
  globalAny.graphWidth = options.width;
  globalAny.graphHeight = options.height;
  globalAny.seed = String(options.seed);
  globalAny.populationRate = options.populationRate;
  globalAny.urbanization = options.urbanization;
  globalAny.urbanDensity = 10;
  globalAny.grid = {};
  globalAny.pack = {};
  globalAny.notes = [];
  globalAny.nameBases = globalAny.Names ? globalAny.Names.getNameBases() : [];
  globalAny.mapCoordinates = {latT: 0, latN: 0, latS: 0, lonT: 0, lonW: 0, lonE: 0};
  globalAny.mapId = Date.now();
  globalAny.biomesData = {
    i: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    name: ["Marine", "Hot desert", "Cold desert", "Savanna", "Grassland", "Tropical seasonal forest", "Temperate deciduous forest", "Tropical rainforest", "Temperate rainforest", "Taiga", "Tundra", "Glacier", "Wetland"],
    color: ["#53679f", "#fbe79f", "#b5b887", "#d2d082", "#c8d68f", "#b6d95d", "#29bc56", "#7dcb35", "#409c43", "#4b6b32", "#96784b", "#d5e7eb", "#0b9131"],
    biomesMartix: [[0,0,0,0,0,0,0,0,0,0,0,0],[4,4,4,2,2,2,2,2,2,2,1,1],[4,4,3,3,2,2,2,2,2,1,1,1],[5,5,3,3,3,2,2,2,1,1,1,1],[6,6,6,6,6,3,3,1,1,1,1,1]],
    habitability: [0, 4, 10, 22, 30, 50, 100, 80, 90, 12, 4, 0, 12],
    iconsDensity: [0, 3, 2, 120, 120, 120, 100, 150, 150, 50, 20, 0, 100],
    icons: [[],["dune"],["dune"],["acacia"],["grass"],["deciduous"],["deciduous"],["palm"],["conifer"],["conifer"],["grass"],[],["cattails"]],
    cost: [0, 200, 150, 80, 50, 60, 70, 90, 80, 120, 200, 255, 120],
  };

  return options;
}
