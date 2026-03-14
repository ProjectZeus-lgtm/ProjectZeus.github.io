type RegistryValue = any;

class HeadlessElement {
  id: string;
  value: any;
  valueAsNumber: number;
  checked: boolean;
  dataset: Record<string, any>;
  selectedOptions: any[];
  style: Record<string, any>;
  innerHTML: string;
  textContent: string;

  constructor(id: string, initial: RegistryValue = {}) {
    this.id = id;
    this.value = initial.value ?? "";
    this.valueAsNumber = initial.valueAsNumber ?? Number(initial.value ?? 0);
    this.checked = initial.checked ?? false;
    this.dataset = {...(initial.dataset || {})};
    this.selectedOptions = initial.selectedOptions || [];
    this.style = {};
    this.innerHTML = initial.innerHTML || "";
    this.textContent = initial.textContent || "";
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  addEventListener() {}

  removeEventListener() {}

  remove() {}

  appendChild() {
    return null;
  }

  setAttribute(name: string, value: any) {
    (this as any)[name] = value;
  }

  getAttribute(name: string) {
    return (this as any)[name];
  }
}

export class HeadlessDocument {
  readyState = "complete";
  private registry = new Map<string, HeadlessElement>();
  body = new HeadlessElement("body");
  head = new HeadlessElement("head");
  documentElement = {style: {setProperty() {}}};

  setRegistry(entries: Record<string, RegistryValue>) {
    this.registry.clear();
    for (const [id, initial] of Object.entries(entries)) {
      this.registry.set(id, new HeadlessElement(id, initial));
    }
  }

  getElementById(id: string) {
    return this.registry.get(id) || null;
  }

  createElement(tag: string) {
    return new HeadlessElement(tag);
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  addEventListener() {}

  removeEventListener() {}
}

export function createRegistryEntries(options: Record<string, any>) {
  return {
    optionsSeed: {value: String(options.seed), valueAsNumber: Number(options.seed)},
    mapWidthInput: {value: String(options.width), valueAsNumber: options.width},
    mapHeightInput: {value: String(options.height), valueAsNumber: options.height},
    pointsInput: {value: "4", valueAsNumber: 4, dataset: {cells: String(options.pointsCells)}},
    templateInput: {value: options.template},
    culturesInput: {value: String(options.cultures), valueAsNumber: options.cultures},
    culturesOutput: {value: String(options.cultures), valueAsNumber: options.cultures},
    culturesSet: {value: options.culturesSet, selectedOptions: [{dataset: {max: "100"}}]},
    statesNumber: {value: String(options.statesNumber), valueAsNumber: options.statesNumber},
    provincesRatio: {value: String(options.provincesRatio), valueAsNumber: options.provincesRatio},
    sizeVariety: {value: String(options.sizeVariety), valueAsNumber: options.sizeVariety},
    growthRate: {value: String(options.growthRate), valueAsNumber: options.growthRate},
    statesGrowthRate: {value: String(options.statesGrowthRate), valueAsNumber: options.statesGrowthRate},
    neutralRate: {value: String(options.neutralRate), valueAsNumber: options.neutralRate},
    manorsInput: {value: String(options.manors), valueAsNumber: options.manors},
    religionsNumber: {value: String(options.religionsNumber), valueAsNumber: options.religionsNumber},
    emblemShape: {value: options.emblemShape},
    precInput: {value: String(options.prec), valueAsNumber: options.prec},
    precOutput: {value: String(options.prec), valueAsNumber: options.prec},
    heightExponentInput: {value: String(options.heightExponent), valueAsNumber: options.heightExponent},
    resolveDepressionsStepsOutput: {value: String(options.resolveDepressionsSteps), valueAsNumber: options.resolveDepressionsSteps},
    lakeElevationLimitOutput: {value: String(options.lakeElevationLimit), valueAsNumber: options.lakeElevationLimit},
    mapSizeInput: {value: String(options.mapSize), valueAsNumber: options.mapSize},
    mapSizeOutput: {value: String(options.mapSize), valueAsNumber: options.mapSize},
    latitudeInput: {value: String(options.latitude), valueAsNumber: options.latitude},
    latitudeOutput: {value: String(options.latitude), valueAsNumber: options.latitude},
    longitudeInput: {value: String(options.longitude), valueAsNumber: options.longitude},
    longitudeOutput: {value: String(options.longitude), valueAsNumber: options.longitude},
    yearInput: {value: String(options.year), valueAsNumber: options.year},
    eraInput: {value: options.era},
    mapName: {value: ""},
    heightUnit: {value: "ft"},
    distanceUnitInput: {value: "mi"},
    temperatureScale: {value: "°F"},
    areaUnit: {value: "square"},
    distanceScaleInput: {value: "3", valueAsNumber: 3},
    prompt: {},
  };
}
