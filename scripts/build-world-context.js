import { loadMap, writeJson } from "../src/world/loadMap.js";
import { buildWorldContext } from "../src/world/generator.js";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "generated/world-context.json";

const { data } = loadMap(inputPath);
const context = buildWorldContext(data);
const written = writeJson(outputPath, context);

console.log(`World context written to ${written}`);
