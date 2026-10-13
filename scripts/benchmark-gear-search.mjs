import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync, gunzipSync } from "node:zlib";
import { createServer } from "vite";

// Deliberately synthetic, generated only in memory. No game names, IDs, data,
// assets, network requests, profile writes or shipped catalogue mutations.
const count = 30_000;
const evidence = { kind: "user-supplied", note: "Synthetic benchmark fixture; not Forever content." };
const fixture = {
  version: "synthetic-benchmark-only-v1",
  reviewedAt: "not-game-data",
  items: Array.from({ length: count }, (_, index) => {
    const values = { armor: index % 500 };
    if (index % 11 !== 0) values.intellect = index % 13;
    if (index % 7 !== 0) values.spirit = (index * 7) % 17;
    return {
      id: `fixture:${String(index).padStart(5, "0")}`,
      name: `Synthetic comparison row ${String(index).padStart(5, "0")}`,
      quality: ["common", "uncommon", "rare", "epic"][index % 4],
      slot: "Hands",
      equipmentType: "Cloth",
      ...(index % 19 !== 0 ? { requiredLevel: 1 + (index % 60) } : {}),
      stats: [],
      numericStats: { values, completeness: "partial" },
      classRestrictions: [],
      sourceIds: [],
      evidence,
    };
  }),
  sources: [], quests: [], dungeons: [], npcs: [],
};
const serialized = JSON.stringify(fixture);
const input = Buffer.from(serialized);
const gzip = gzipSync(input);
const compactInput = Buffer.from(JSON.stringify(fixture.items.map((item) => ({
  id: item.id, name: item.name, quality: item.quality, slot: item.slot,
  equipmentType: item.equipmentType, requiredLevel: item.requiredLevel,
  numericStats: item.numericStats,
}))));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const measure = (operation, repeats = 7) => {
  const samplesMs = [];
  let result;
  for (let index = 0; index < repeats; index++) {
    const started = performance.now();
    result = operation();
    samplesMs.push(performance.now() - started);
  }
  return { result, samplesMs: samplesMs.map((value) => Number(value.toFixed(3))), medianMs: Number(median(samplesMs).toFixed(3)) };
};
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: "error",
});
try {
  const { createGearSearchIndex, searchGear } = await server.ssrLoadModule("/companion/src/gearSearch.ts");
  const indexStarted = performance.now();
  const searchIndex = createGearSearchIndex(fixture);
  const indexMs = performance.now() - indexStarted;
  const character = { level: 20, className: "Priest" };
  const base = {
    stats: [{ key: "intellect", minimum: 5 }, { key: "spirit", minimum: 8 }],
    level: { mode: "plus10" },
    sort: "match",
  };
  const routeRanks = new Map(fixture.items.map((item, index) => [item.id, index % 4]));
  const queries = [];
  for (const mode of ["any", "all"]) {
    for (const sort of ["match", "stat", "route"]) {
      const options = { ...base, statMode: mode, sort, sortStat: "intellect" };
      searchGear(searchIndex, character, options, routeRanks); // Warm the same real search engine once.
      const measured = measure(() => searchGear(searchIndex, character, options, routeRanks));
      const expected = fixture.items.filter((item) => {
        if (item.requiredLevel === undefined || item.requiredLevel > 30) return false;
        const { intellect, spirit } = item.numericStats.values;
        const intellectMatch = intellect !== undefined && intellect >= 5;
        const spiritMatch = spirit !== undefined && spirit >= 8;
        return mode === "all" ? intellectMatch && spiritMatch : intellectMatch || spiritMatch;
      });
      assert.deepEqual(new Set(measured.result.map(({ item }) => item.id)), new Set(expected.map(({ id }) => id)));
      assert.deepEqual(measured.result.map(({ item }) => item.id), searchGear(searchIndex, character, options, routeRanks).map(({ item }) => item.id));
      queries.push({ mode, sort, resultCount: measured.result.length, medianMs: measured.medianMs, samplesMs: measured.samplesMs });
    }
  }
  const parse = measure(() => JSON.parse(serialized), 5);
  const decompress = measure(() => gunzipSync(gzip), 5);
  console.log(JSON.stringify({
    fixture: "synthetic-only; no Forever content",
    itemCount: count,
    runtime: process.version,
    platform: `${process.platform}-${process.arch}`,
    sizes: {
      completeFixture: { rawBytes: input.length, gzipBytes: gzip.length, brotliBytes: brotliCompressSync(input).length },
      compactEquipmentRows: { rawBytes: compactInput.length, gzipBytes: gzipSync(compactInput).length, brotliBytes: brotliCompressSync(compactInput).length },
    },
    jsonParseMedianMs: parse.medianMs,
    gzipDecompressMedianMs: decompress.medianMs,
    indexBuildMs: Number(indexMs.toFixed(3)),
    queries,
    limitations: [
      "Node measurement, not mobile/browser input responsiveness.",
      "Route sort consumes synthetic precomputed ranks; graph traversal and card/tooltip rendering are not measured.",
      "Highly repetitive synthetic data compresses better than a varied real export; no provider size or performance promise.",
      "Timing values are observations, never pass/fail thresholds.",
    ],
  }, null, 2));
} finally {
  await server.close();
}
