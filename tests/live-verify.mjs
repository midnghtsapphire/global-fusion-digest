import { mkdir, writeFile } from 'node:fs/promises';
import { collectIntelligence } from '../src/index.mjs';
import { getRawSnapshots } from '../src/collect.mjs';
import { load } from 'cheerio';
const analysis = await collectIntelligence({ timeoutMs: 35000 });
const dir = new URL(`./live-artifacts/${new Date().toISOString().replace(/[:.]/g, '-')}/`, import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL('analysis.json', dir), JSON.stringify(analysis, null, 2) + '\n');
for (const snapshot of getRawSnapshots(analysis)) {
  const name = snapshot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + snapshot.sha256.slice(0, 8);
  await writeFile(new URL(name + (snapshot.content_type.includes('json') ? '.json' : '.html'), dir), snapshot.bytes);
  if (snapshot.name.startsWith('CISA') && snapshot.name.endsWith('detail')) {
    const $ = load(snapshot.text);
    const text = $.root().text().replace(/\s+/g, ' ');
    console.log(JSON.stringify({ url: snapshot.url, h1: $('h1').text(), time: $('time').map((_, el) => ({ datetime: $(el).attr('datetime'), text: $(el).text() })).get(), release: text.match(/Release Date.{0,80}/)?.[0], body: $('.field--name-body').length, main: $('main').length }));
  }
}
console.log(JSON.stringify({ evidence_directory: dir.pathname }));
console.log(JSON.stringify({ catalog: analysis.catalog_version, count: analysis.catalog_entry_count, collection_status: analysis.collection_status, ics: analysis.ics_advisories.length, ic3: analysis.official_ic3_items.length, cyber: analysis.cisa_cyber_advisories.length, source_status: analysis.source_status }, null, 2));
