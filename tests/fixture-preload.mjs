import { fixtureFetch } from './fixtures.mjs';
// Only test subprocesses preload this module. Production CLI has no fixture,
// source URL override, or environment switch that could silently fake success.
globalThis.fetch = fixtureFetch();
