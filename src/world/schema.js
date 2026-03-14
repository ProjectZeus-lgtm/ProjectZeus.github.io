import { compactRecords, isPlainObject } from "./loadMap.js";

function getValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function formatExample(value) {
  if (typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return `[array:${value.length}]`;
  }

  if (isPlainObject(value)) {
    return `{object:${Object.keys(value).slice(0, 6).join(",")}}`;
  }

  return String(value);
}

function sortObject(input) {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right))
  );
}

export function summarizeObjectFields(obj) {
  const summary = {};

  for (const [key, value] of Object.entries(obj || {})) {
    summary[key] = {
      type: getValueType(value),
      keys: isPlainObject(value) ? Object.keys(value).length : undefined,
      length: Array.isArray(value) ? value.length : undefined,
    };
  }

  return sortObject(summary);
}

export function summarizeCollection(records) {
  const items = compactRecords(records);
  const itemTypes = new Set(items.map(getValueType));
  const result = {
    count: items.length,
    itemTypes: [...itemTypes].sort(),
  };

  if (items.every(isPlainObject)) {
    const fieldStats = {};

    for (const record of items) {
      for (const [key, value] of Object.entries(record)) {
        if (!fieldStats[key]) {
          fieldStats[key] = {
            present: 0,
            types: new Set(),
            examples: [],
          };
        }

        fieldStats[key].present += 1;
        fieldStats[key].types.add(getValueType(value));

        if (fieldStats[key].examples.length < 3) {
          fieldStats[key].examples.push(formatExample(value));
        }
      }
    }

    result.fields = sortObject(
      Object.fromEntries(
        Object.entries(fieldStats).map(([key, stat]) => [
          key,
          {
            presence: Number((stat.present / items.length).toFixed(4)),
            types: [...stat.types].sort(),
            examples: stat.examples,
          },
        ])
      )
    );
  } else if (items.every(Array.isArray)) {
    const lengths = items.map((item) => item.length);
    const elementTypes = new Set();

    for (const item of items) {
      for (const inner of item) {
        elementTypes.add(getValueType(inner));
      }
    }

    result.arrayShape = {
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      elementTypes: [...elementTypes].sort(),
    };
  } else {
    result.examples = items.slice(0, 5).map(formatExample);
  }

  return result;
}

export function buildMapSchema(map) {
  return {
    topLevel: summarizeObjectFields(map),
    sections: {
      info: summarizeObjectFields(map.info),
      settings: summarizeObjectFields(map.settings),
      mapCoordinates: summarizeObjectFields(map.mapCoordinates),
      pack: summarizeObjectFields(map.pack),
      grid: summarizeObjectFields(map.grid),
      biomesData: summarizeObjectFields(map.biomesData),
    },
    collections: sortObject({
      notes: summarizeCollection(map.notes),
      nameBases: summarizeCollection(map.nameBases),
      "pack.cells": summarizeCollection(map.pack?.cells),
      "pack.vertices": summarizeCollection(map.pack?.vertices),
      "pack.features": summarizeCollection(map.pack?.features),
      "pack.cultures": summarizeCollection(map.pack?.cultures),
      "pack.burgs": summarizeCollection(map.pack?.burgs),
      "pack.states": summarizeCollection(map.pack?.states),
      "pack.provinces": summarizeCollection(map.pack?.provinces),
      "pack.religions": summarizeCollection(map.pack?.religions),
      "pack.rivers": summarizeCollection(map.pack?.rivers),
      "pack.markers": summarizeCollection(map.pack?.markers),
      "pack.routes": summarizeCollection(map.pack?.routes),
      "pack.zones": summarizeCollection(map.pack?.zones),
      "grid.cells": summarizeCollection(map.grid?.cells),
      "grid.vertices": summarizeCollection(map.grid?.vertices),
      "grid.points": summarizeCollection(map.grid?.points),
      "grid.boundary": summarizeCollection(map.grid?.boundary),
    }),
  };
}
