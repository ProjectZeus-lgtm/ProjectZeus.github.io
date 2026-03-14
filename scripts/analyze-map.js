import { loadMap } from "../src/world/loadMap.js";
import { buildWorldContext } from "../src/world/generator.js";

const inputPath = process.argv[2];
const { filePath, data } = loadMap(inputPath);
const context = buildWorldContext(data);

const topBiomes = context.geography.biomeDistribution.slice(0, 5);
const majorStates = [...context.politics.states]
  .filter((state) => state.i !== 0)
  .sort((left, right) => (right.area || 0) - (left.area || 0))
  .slice(0, 5);

console.log(`Map file: ${filePath}`);
console.log(`Map name: ${context.metadata.info.mapName}`);
console.log(`Export version: ${context.metadata.info.version}`);
console.log(`Canvas: ${context.metadata.info.width} x ${context.metadata.info.height}`);
console.log(`Seed: ${context.metadata.info.seed}`);
console.log("");
console.log("Top-level summary:");
for (const [key, value] of Object.entries(context.summary)) {
  console.log(` - ${key}: ${value}`);
}

console.log("\nTop biomes by cell count:");
for (const biome of topBiomes) {
  console.log(` - ${biome.name || `Biome ${biome.id}`}: ${biome.count}`);
}

console.log("\nLargest states:");
for (const state of majorStates) {
  console.log(
    ` - ${state.name}: area=${state.area}, burgs=${state.burgs}, provinces=${state.provinceIds.length}, capital=${state.capitalName || "n/a"}`
  );
}

console.log("\nWorld-generator uses:");
for (const hint of context.generatorHints) {
  console.log(` - ${hint.layer}:`);
  console.log(`   source: ${hint.source.join(", ")}`);
  for (const useCase of hint.useCases) {
    console.log(`   • ${useCase}`);
  }
}
