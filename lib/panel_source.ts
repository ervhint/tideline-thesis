// Reads the newest rolling panel. Server only. Never cached to disk, never published: the BFF holds it for one request.
// In production it comes from the GitHub Actions artifact; PANEL_FILE points at a file outside the repo, for a local run of `npm run panel -- --out`.
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import type { PanelDoc } from './panel_view';

const API = 'https://api.github.com';
const NAME = 'panel.json';

// The one file in a small zip, read from the central directory, so it works whether or not the entry has a data descriptor.
export function unzipOne(zip: Buffer, name: string): Buffer | null {
  let end = -1;
  for (let i = zip.length - 22; i >= 0; i--) if (zip.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) return null;
  let at = zip.readUInt32LE(end + 16);
  for (let n = zip.readUInt16LE(end + 10); n > 0; n--) {
    const method = zip.readUInt16LE(at + 10), size = zip.readUInt32LE(at + 20);
    const nameLen = zip.readUInt16LE(at + 28), extra = zip.readUInt16LE(at + 30), note = zip.readUInt16LE(at + 32), local = zip.readUInt32LE(at + 42);
    if (zip.toString('utf8', at + 46, at + 46 + nameLen) === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const body = zip.subarray(start, start + size);
      return method === 8 ? inflateRawSync(body) : method === 0 ? Buffer.from(body) : null;
    }
    at += 46 + nameLen + extra + note;
  }
  return null;
}

export async function readArtifactPanel({ token, repo = 'ervhint/tideline-thesis', fetchFn = fetch }: { token: string; repo?: string; fetchFn?: typeof fetch }): Promise<PanelDoc | null> {
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  const list = await fetchFn(`${API}/repos/${repo}/actions/artifacts?name=panel&per_page=5`, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!list.ok) return null;
  const { artifacts = [] } = (await list.json()) as { artifacts?: { expired: boolean; created_at: string; archive_download_url: string }[] };
  const newest = artifacts.filter((a) => !a.expired).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  if (!newest) return null;
  const zip = await fetchFn(newest.archive_download_url, { headers, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!zip.ok) return null;
  const bytes = unzipOne(Buffer.from(await zip.arrayBuffer()), NAME);
  return bytes ? (JSON.parse(bytes.toString('utf8')) as PanelDoc) : null;
}

export async function readPanel(): Promise<PanelDoc | null> {
  try {
    if (process.env.PANEL_FILE) return JSON.parse(await readFile(process.env.PANEL_FILE, 'utf8')) as PanelDoc;
    const token = process.env.GITHUB_DATA_TOKEN;
    return token ? await readArtifactPanel({ token }) : null;
  } catch {
    return null; // the page says Not Available; the reason is never logged, because a response body is API data
  }
}
