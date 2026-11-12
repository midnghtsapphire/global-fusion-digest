import test from 'node:test';
import assert from 'node:assert/strict';
import { collectIntelligence, classifyKEV, validateCatalog, buildReport, buildSocialDrafts, buildPlatformLedger } from '../src/index.mjs';
import { discoverAdvisories, parseAdvisory, parseDate } from '../src/parsers.mjs';
import { fetchOfficial, assertOfficialUrl, SOURCES } from '../src/network.mjs';
import { catalog, record, fixtureFetch, icsIndex, icsDetail, urls } from './fixtures.mjs';

test('operational classification is deterministic, not CVE overrides or CVSS', () => {
  assert.equal(classifyKEV(record()).operational_priority, 'Critical');
  assert.equal(classifyKEV(record({ cveID: 'CVE-2025-123456', vulnerabilityName: 'Privilege escalation', shortDescription: 'A local user can elevate privileges.' })).operational_priority, 'High');
  assert.equal(classifyKEV(record({ vulnerabilityName: 'Read a file', shortDescription: 'An authenticated user can read a local file.', requiredAction: 'Remote arbitrary code execution: unrelated required action boilerplate' })).operational_priority, 'Medium');
  assert.equal(classifyKEV(record({ vulnerabilityName: 'Read a file', shortDescription: 'An authenticated user can read a local file.', knownRansomwareCampaignUse: 'Known' })).operational_priority, 'High');
  assert.throws(() => classifyKEV({ cveID: 'bad' }), /valid CVE/);
});
test('catalog validation rejects malformed CVEs, dates, duplicates and counts', () => {
  assert.equal(validateCatalog(catalog()).count, 2);
  assert.throws(() => validateCatalog({ ...catalog(), count: 3 }), /count/);
  for (const overrides of [{ cveID: 'CVE-26-12' }, { dateAdded: '2026-02-30' }, { dueDate: '2026-09-01' }]) {
    const c = catalog(); c.vulnerabilities[0] = record(overrides); assert.throws(() => validateCatalog(c), /Invalid KEV/);
  }
  const c = catalog(); c.vulnerabilities[1].cveID = c.vulnerabilities[0].cveID; assert.throws(() => validateCatalog(c), /duplicate/);
});
test('parse official index and detail while excluding chrome and untrusted links', () => {
  const links = discoverAdvisories(icsIndex, SOURCES.ics, 'ics', 3);
  assert.equal(links.length, 1); assert.equal(links[0].date, '2026-10-02');
  const item = parseAdvisory(icsDetail, urls.ics);
  assert.equal(item.title, 'Example Controls Gateway'); assert.equal(item.date, '2026-10-02');
  assert.deepEqual(item.cves, ['CVE-2026-10001']); assert.equal(item.severity, 'Critical');
  assert.equal(item.observed_cvss[0].base_score, 9.8); assert.match(item.summary, /^Example Controls/);
  assert.match(item.priority_rationale, /does not assert/);
  assert.equal(parseDate('Fri, 02 Oct 2026'), '2026-10-02'); assert.equal(parseDate('February 30, 2026'), null);
});
test('collection returns complete stable shape and genuine cited excerpts', async () => {
  const a = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 1 });
  assert.equal(a.catalog_entry_count, 2); assert.equal(a.recent_kev[0].cve, 'CVE-2026-10002');
  assert.equal(a.collection_status, 'ok'); assert.equal(a.ics_advisories.length, 1); assert.equal(a.official_ic3_items[0].severity, 'Anomaly');
  assert.deepEqual(Object.keys(a.severity_counts), ['Critical', 'High', 'Anomaly', 'Medium', 'Low']);
  assert.equal(a.source_items.length, 7); assert.ok(a.source_items.every(i => i.sha256.length === 64));
  const report = buildReport(a, { turn: 5 });
  for (const value of ['🔴Critical', '🟧High', '🔵Anomaly', '🟡Medium', '⚪Low', 'Resilience Tip', 'Ad-Hoc Note', 'Contacts', urls.ics]) assert.ok(report.includes(value));
  const drafts = buildSocialDrafts(a, { turn: 5 }); assert.deepEqual(Object.keys(drafts), ['LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'Lemon8', 'Reddit']);
  assert.ok(Object.values(drafts).every(s => typeof s === 'string' && s.includes(SOURCES.kev)));
  assert.ok(buildPlatformLedger(a).every(p => p.engagement === null && p.publication_state === 'not_published'));
});
test('optional failures degrade visibly while mandatory KEV fails closed', async () => {
  const a = await collectIntelligence({ fetchImpl: fixtureFetch({ fail: [SOURCES.ics, urls.ic3] }), advisoryLimit: 1 });
  assert.equal(a.collection_status, 'degraded'); assert.deepEqual(a.ics_advisories, []); assert.deepEqual(a.official_ic3_items, []);
  assert.equal(a.source_status.filter(s => s.status === 'error').length, 2);
  await assert.rejects(collectIntelligence({ fetchImpl: fixtureFetch({ fail: [SOURCES.kev] }) }), e => e.source_status[0].status === 'error');
  await assert.rejects(collectIntelligence({ fetchImpl: fixtureFetch({ corruptCatalog: true }) }), /Required CISA KEV/);
  const disabled = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 0 });
  assert.equal(disabled.source_status.filter(s => s.status === 'skipped').length, 3);
});
test('request bounds, response size, redirect allowlist and timeout', async () => {
  for (const url of ['http://www.cisa.gov/news-events/ics-advisories', 'https://www.cisa.gov.evil.test/news-events/ics-advisories', 'https://www.ic3.gov/Egress/example', 'https://www.cisa.gov/news-events/ics-advisories?q=1']) assert.throws(() => assertOfficialUrl(url));
  await assert.rejects(fetchOfficial(SOURCES.kev, { maxBytes: 8, fetchImpl: async () => new Response('123456789') }), /cap/);
  await assert.rejects(fetchOfficial(SOURCES.kev, { fetchImpl: async () => new Response('', { status: 302, headers: { location: 'https://evil.test/' } }) }), /allowlist/);
  await assert.rejects(fetchOfficial(SOURCES.kev, { timeoutMs: 30, fetchImpl: fixtureFetch({ delayMs: 100 }) }), /timed out/);
  await assert.rejects(collectIntelligence({ limit: 101 }), /limit/);
  await assert.rejects(collectIntelligence({ advisoryLimit: -1 }), /advisoryLimit/);
});
