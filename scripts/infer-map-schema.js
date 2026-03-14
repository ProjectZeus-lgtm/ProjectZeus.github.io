import { loadMap, writeJson } from "../src/world/loadMap.js";
import { buildMapSchema } from "../src/world/schema.js";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "generated/world-schema.json";

const { data } = loadMap(inputPath);
const schema = buildMapSchema(data);
const written = writeJson(outputPath, schema);

console.log(`Schema written to ${written}`);
