import { compactRecords, isPlainObject } from "./loadMap.js";

function countBy(items, selector) {
  const counts = new Map();

  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function rankCounts(counts, labels = new Map()) {
  return [...counts.entries()]
    .map(([id, count]) => ({
      id: Number.isNaN(Number(id)) ? id : Number(id),
      name: labels.get(Number(id)) || labels.get(id) || null,
      count,
    }))
    .sort((left, right) => right.count - left.count);
}

function toIdMap(records) {
  return new Map(asObjects(records).map((record) => [record.i, record]));
}

function pick(record, keys) {
  return Object.fromEntries(keys.filter((key) => key in record).map((key) => [key, record[key]]));
}

function asObjects(records) {
  return compactRecords(records).filter(isPlainObject);
}

function euclideanDist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function findNearestOf(origin, candidates, stateNameMap, dScale, limit) {
  return candidates
    .map((c) => ({
      i: c.i,
      name: c.name,
      stateName: stateNameMap.get(c.state) || null,
      dist: Math.round(euclideanDist(origin.x, origin.y, c.x, c.y) * dScale * 10) / 10,
    }))
    .filter((c) => c.dist > 0)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}

function pivotIndex(items, keyFn) {
  const idx = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key == null) continue;
    if (!idx[key]) idx[key] = [];
    idx[key].push(item.i);
  }
  return idx;
}

export function buildWorldContext(map) {
  const cells = asObjects(map.pack?.cells);
  const features = asObjects(map.pack?.features);
  const cultures = asObjects(map.pack?.cultures);
  const burgs = asObjects(map.pack?.burgs);
  const states = asObjects(map.pack?.states);
  const provinces = asObjects(map.pack?.provinces);
  const religions = asObjects(map.pack?.religions);
  const rivers = asObjects(map.pack?.rivers);
  const markers = asObjects(map.pack?.markers);
  const routes = asObjects(map.pack?.routes);
  const zones = asObjects(map.pack?.zones);
  const notes = asObjects(map.notes);
  const nameBases = asObjects(map.nameBases);

  const biomeNames = new Map((map.biomesData?.i || []).map((id, index) => [id, map.biomesData.name[index]]));
  const stateById = toIdMap(states);
  const provinceById = toIdMap(provinces);
  const burgById = toIdMap(burgs);

  const biomeDistribution = rankCounts(countBy(cells, (cell) => cell.biome), biomeNames);
  const provincesByState = new Map();
  const burgsByState = new Map();

  for (const province of provinces) {
    if (!provincesByState.has(province.state)) {
      provincesByState.set(province.state, []);
    }
    provincesByState.get(province.state).push(province.i);
  }

  for (const burg of burgs) {
    if (!burgsByState.has(burg.state)) {
      burgsByState.set(burg.state, []);
    }
    burgsByState.get(burg.state).push(burg.i);
  }

  // ---------- storytelling enrichment ----------

  const distScale = map.settings?.distanceScale || 1;
  const distUnit = map.settings?.distanceUnit || "mi";
  const stateNameMap = new Map(states.map((s) => [s.i, s.name]));
  const cellById = new Map(cells.map((c) => [c.i, c]));
  const routeById = toIdMap(routes);
  const burgByCell = new Map();
  for (const burg of burgs) {
    if (burg.cell != null) burgByCell.set(burg.cell, burg.i);
  }

  const validBurgs = burgs.filter((b) => b.x != null && b.y != null);
  const capitalBurgs = validBurgs.filter((b) => b.capital);
  const cityBurgs = validBurgs.filter((b) => b.group === "city" || b.capital);
  const portBurgs = validBurgs.filter((b) => b.port);

  // ── 1. pivot indices ──

  const indices = {
    settlementsByState: pivotIndex(validBurgs, (b) => b.state),
    settlementsByCulture: pivotIndex(validBurgs, (b) => b.culture),
    settlementsByFeature: pivotIndex(validBurgs, (b) => b.feature),
    settlementsByProvince: {},
    settlementsByBiome: {},
    markersByType: pivotIndex(markers, (m) => m.type),
    capitalsByState: Object.fromEntries(capitalBurgs.map((b) => [b.state, b.i])),
    portSettlements: portBurgs.map((b) => b.i),
    citySettlements: cityBurgs.map((b) => b.i),
    capitalSettlements: capitalBurgs.map((b) => b.i),
  };

  for (const burg of validBurgs) {
    const cell = cellById.get(burg.cell);
    if (!cell) continue;
    if (cell.province != null) {
      if (!indices.settlementsByProvince[cell.province]) indices.settlementsByProvince[cell.province] = [];
      indices.settlementsByProvince[cell.province].push(burg.i);
    }
    if (cell.biome != null) {
      if (!indices.settlementsByBiome[cell.biome]) indices.settlementsByBiome[cell.biome] = [];
      indices.settlementsByBiome[cell.biome].push(burg.i);
    }
  }

  // ── 2. political relations ──

  const politicalRelations = [];
  const wars = [];

  for (const state of states) {
    if (!Array.isArray(state.diplomacy)) continue;
    const isPairwise = state.diplomacy.length > 0 && typeof state.diplomacy[0] === "string";
    if (!isPairwise) {
      for (const event of state.diplomacy) {
        if (Array.isArray(event) && event.length > 0) {
          wars.push({ name: event[0], events: event.slice(1) });
        }
      }
      continue;
    }
    for (let j = 0; j < state.diplomacy.length; j++) {
      const rel = state.diplomacy[j];
      if (rel === "x" || j === state.i || j < state.i) continue;
      const target = stateById.get(j);
      if (!target) continue;
      politicalRelations.push({
        from: state.i,
        fromName: state.name,
        to: j,
        toName: target.name,
        status: rel,
        bordering: (state.neighbors || []).includes(j),
      });
    }
  }

  for (const state of states) {
    if (!Array.isArray(state.campaigns)) continue;
    for (const campaign of state.campaigns) {
      if (Array.isArray(campaign) && campaign.length > 0 && !wars.some((w) => w.name === campaign[0])) {
        wars.push({ name: campaign[0], events: campaign.slice(1) });
      }
    }
  }

  // ── 3. settlement travel graph (BFS through cell-level route connections) ──

  const travelEdges = [];
  const edgeSeen = new Set();

  for (const burg of validBurgs) {
    const startCell = cellById.get(burg.cell);
    if (!startCell) continue;
    const queue = [{ cellId: burg.cell, hops: 0, modes: new Set(), crossed: false }];
    const visited = new Set([burg.cell]);

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.hops >= 30) continue;
      const cell = cellById.get(cur.cellId);
      if (!cell?.routes || typeof cell.routes !== "object") continue;

      for (const [nStr, rId] of Object.entries(cell.routes)) {
        const nId = Number(nStr);
        if (Number.isNaN(nId) || visited.has(nId)) continue;
        visited.add(nId);

        const route = routeById.get(rId);
        const nextModes = new Set(cur.modes);
        if (route?.group) nextModes.add(route.group);

        const nCell = cellById.get(nId);
        const borderCross = cur.crossed || (nCell != null && nCell.state !== startCell.state);

        const nBurgId = nCell?.burg;
        if (nBurgId && nBurgId !== burg.i && burgById.get(nBurgId)) {
          const lo = Math.min(burg.i, nBurgId);
          const hi = Math.max(burg.i, nBurgId);
          const key = `${lo}-${hi}`;
          if (!edgeSeen.has(key)) {
            edgeSeen.add(key);
            const target = burgById.get(nBurgId);
            travelEdges.push({
              from: lo,
              fromName: burgById.get(lo)?.name,
              to: hi,
              toName: burgById.get(hi)?.name,
              hops: cur.hops + 1,
              distance: Math.round(euclideanDist(burg.x, burg.y, target.x, target.y) * distScale * 10) / 10,
              modes: [...nextModes].sort(),
              crossesBorder: borderCross,
            });
          }
          continue;
        }

        queue.push({ cellId: nId, hops: cur.hops + 1, modes: nextModes, crossed: borderCross });
      }
    }
  }

  const travelAdjacency = {};
  for (const edge of travelEdges) {
    if (!travelAdjacency[edge.from]) travelAdjacency[edge.from] = [];
    travelAdjacency[edge.from].push({ to: edge.to, name: edge.toName, hops: edge.hops, distance: edge.distance, modes: edge.modes, crossesBorder: edge.crossesBorder });
    if (!travelAdjacency[edge.to]) travelAdjacency[edge.to] = [];
    travelAdjacency[edge.to].push({ to: edge.from, name: edge.fromName, hops: edge.hops, distance: edge.distance, modes: edge.modes, crossesBorder: edge.crossesBorder });
  }

  // ── settlement enrichments (nearest-X, biome, province, etc.) ──

  const settlementEnrichments = new Map();
  for (const burg of validBurgs) {
    const cell = cellById.get(burg.cell);
    settlementEnrichments.set(burg.i, {
      provinceName: provinceById.get(cell?.province)?.fullName || provinceById.get(cell?.province)?.name || null,
      provinceId: cell?.province ?? null,
      biome: biomeNames.get(cell?.biome) || null,
      biomeId: cell?.biome ?? null,
      isPort: Boolean(burg.port),
      isCoastal: (cell?.harbor || 0) > 0,
      hasRiver: (cell?.r || 0) > 0,
      riverId: cell?.r || null,
      elevation: cell?.h ?? null,
      nearestCapital: findNearestOf(burg, capitalBurgs.filter((b) => b.i !== burg.i), stateNameMap, distScale, 1)[0] || null,
      nearestCity: findNearestOf(burg, cityBurgs.filter((b) => b.i !== burg.i), stateNameMap, distScale, 1)[0] || null,
      nearestPort: findNearestOf(burg, portBurgs.filter((b) => b.i !== burg.i), stateNameMap, distScale, 1)[0] || null,
      nearbySettlements: findNearestOf(burg, validBurgs.filter((b) => b.i !== burg.i), stateNameMap, distScale, 5),
    });
  }

  return {
    metadata: {
      info: map.info,
      coordinates: map.mapCoordinates,
      units: pick(map.settings || {}, [
        "distanceUnit",
        "distanceScale",
        "areaUnit",
        "heightUnit",
        "temperatureScale",
        "populationRate",
        "urbanization",
      ]),
      chronology: pick(map.settings?.options || {}, ["year", "era", "eraShort"]),
    },
    summary: {
      packCells: cells.length,
      gridCells: asObjects(map.grid?.cells).length,
      features: features.length,
      cultures: cultures.length,
      burgs: burgs.length,
      states: states.length,
      provinces: provinces.length,
      religions: religions.length,
      rivers: rivers.length,
      markers: markers.length,
      routes: routes.length,
      zones: zones.length,
      notes: notes.length,
      nameBases: nameBases.length,
      landFeatures: features.filter((feature) => feature.land).length,
      waterFeatures: features.filter((feature) => feature.land === false).length,
    },
    geography: {
      biomeDistribution,
      majorFeatures: features.map((feature) => pick(feature, [
        "i",
        "type",
        "land",
        "border",
        "cells",
        "area",
        "height",
      ])),
      rivers: rivers
        .map((river) => pick(river, ["i", "name", "type", "length", "discharge", "basin", "source", "mouth", "parent"]))
        .sort((left, right) => (right.length || 0) - (left.length || 0)),
      markers: markers.map((marker) => pick(marker, ["i", "type", "icon", "cell", "x", "y"])),
      routes: routes.map((route) => ({
        ...pick(route, ["i", "group", "feature"]),
        pointCount: route.points?.length || 0,
      })),
      zones: zones.map((zone) => ({
        ...pick(zone, ["i", "name", "type", "color"]),
        cellCount: zone.cells?.length || 0,
      })),
    },
    societies: {
      cultures: cultures.map((culture) => pick(culture, ["i", "name", "base", "origins", "shield"])),
      religions: religions.map((religion) => pick(religion, ["i", "name", "origins", "type", "form", "culture", "center"])),
      nameBases: nameBases.map((base) => ({
        ...pick(base, ["i", "name", "min", "max", "d", "m"]),
        sampleNames: String(base.b || "")
          .split(",")
          .filter(Boolean)
          .slice(0, 12),
      })),
    },
    politics: {
      states: states.map((state) => ({
        ...pick(state, ["i", "name", "form", "fullName", "type", "area", "cells", "burgs", "provinces", "capital", "culture", "religion", "pole"]),
        neighbors: state.neighbors || [],
        diplomacy: state.diplomacy || [],
        capitalName: burgById.get(state.capital)?.name || null,
        provinceIds: provincesByState.get(state.i) || [],
        burgIds: burgsByState.get(state.i) || [],
      })),
      provinces: provinces.map((province) => ({
        ...pick(province, ["i", "state", "center", "burg", "name", "formName", "fullName", "color", "pole"]),
        stateName: stateById.get(province.state)?.name || null,
        burgName: burgById.get(province.burg)?.name || null,
      })),
      settlements: burgs.map((burg) => {
        const enr = settlementEnrichments.get(burg.i) || {};
        return {
          ...pick(burg, ["i", "name", "cell", "state", "culture", "feature", "capital", "population", "type", "group", "x", "y"]),
          stateName: stateById.get(burg.state)?.name || null,
          ...enr,
          connectedViaRoutes: travelAdjacency[burg.i] || [],
        };
      }),
      relations: politicalRelations,
      wars,
      lookup: {
        statesById: Object.fromEntries(states.map((state) => [state.i, state.name])),
        provincesById: Object.fromEntries(provinces.map((province) => [province.i, province.fullName || province.name])),
        burgsById: Object.fromEntries(burgs.map((burg) => [burg.i, burg.name])),
      },
    },
    indices,
    travelGraph: {
      distanceUnit: distUnit,
      distanceScale: distScale,
      edges: travelEdges,
      adjacency: travelAdjacency,
      summary: {
        totalEdges: travelEdges.length,
        connectedSettlements: Object.keys(travelAdjacency).length,
        isolatedSettlements: validBurgs.filter((b) => !travelAdjacency[b.i]).map((b) => ({ i: b.i, name: b.name })),
      },
    },
    lore: {
      notes,
      militaryProfiles: map.settings?.options?.military || [],
    },
    generatorHints: [
      {
        layer: "terrain-and-climate",
        source: ["pack.cells", "pack.features", "pack.rivers", "biomesData", "grid.cells"],
        useCases: [
          "Generate terrain descriptions, climate bands, travel difficulty, and regional resources",
          "Drive biome-aware encounter tables and survival systems",
        ],
      },
      {
        layer: "politics-and-factions",
        source: ["pack.states", "pack.provinces", "pack.burgs", "pack.routes", "pack.zones"],
        useCases: [
          "Build kingdoms, frontier conflicts, trade corridors, and province-level quest arcs",
          "Seed diplomacy simulators and war-state story generation",
        ],
      },
      {
        layer: "culture-and-lore",
        source: ["pack.cultures", "pack.religions", "notes", "nameBases"],
        useCases: [
          "Generate culturally consistent NPCs, settlements, myths, and naming conventions",
          "Use notes as canonical lore anchors for campaigns or game codices",
        ],
      },
      {
        layer: "settlement-synthesis",
        source: ["pack.burgs", "pack.markers", "pack.routes", "pack.features"],
        useCases: [
          "Create city profiles, landmark placement, ports, capitals, and regional travel networks",
          "Promote important settlements into procedural hub towns or mission nodes",
        ],
      },
    ],
    sourceReadiness: {
      status: "ready-for-reverse-engineering",
      notes: [
        "The export already contains enough structured data to build a downstream world model without the original generator source",
        "If the source becomes available later, align these normalized entities with generator internals to reproduce deterministic regeneration from seed + settings",
      ],
      likelyDeterministicInputs: pick(map.info || {}, ["seed", "width", "height", "mapId"]),
      generatorSettings: pick(map.settings || {}, ["mapName", "mapSize", "latitude", "longitude", "prec", "urbanDensity"]),
    },
  };
}
