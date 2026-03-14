import fs from "node:fs";
import path from "node:path";

export const DEFAULT_MAP_FILE = "Vigia Full 2026-03-13-19-01.json";

export function resolveMapPath(inputPath = DEFAULT_MAP_FILE) {
  const candidate = inputPath || DEFAULT_MAP_FILE;
  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(process.cwd(), candidate);
}

export function loadMap(inputPath = DEFAULT_MAP_FILE) {
  const filePath = resolveMapPath(inputPath);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  return { filePath, data };
}

export function writeJson(outputPath, value) {
  const filePath = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");

  return filePath;
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * If `data` is already an array, return it as-is.
 * If it looks like Azgaar's columnar format (an object whose values are
 * parallel arrays), pivot it into an array of row-objects so the rest of
 * the pipeline works identically for both the GUI-exported JSON and the
 * headless engine output.
 */
export function normalizeToArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const keys = Object.keys(data);
  const arrayKey = keys.find((k) => Array.isArray(data[k]));
  if (!arrayKey) return [];

  const len = data[arrayKey].length;
  const result = [];
  for (let i = 0; i < len; i++) {
    const obj = {};
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        obj[key] = data[key][i];
      } else if (typeof data[key] === "object" && data[key] !== null) {
        // Sub-objects like cell.routes are keyed by string index
        const val = data[key][String(i)];
        if (val !== undefined) obj[key] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

export function compactRecords(items) {
  return normalizeToArray(items).filter((item) => {
    if (item === null || item === undefined) {
      return false;
    }

    if (Array.isArray(item)) {
      return item.length > 0;
    }

    if (isPlainObject(item)) {
      return Object.keys(item).length > 0;
    }

    return true;
  });
}
