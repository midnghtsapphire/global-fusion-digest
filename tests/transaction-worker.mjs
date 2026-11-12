import { runDigest, collectIntelligence } from '../src/index.mjs';
import { fixtureFetch } from './fixtures.mjs';
const analysis = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 1 });
console.log(JSON.stringify(await runDigest({ outputDir: process.argv[2], analysis, seedLastTurn: Number(process.argv[3] ?? 0) })));
