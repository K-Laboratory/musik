import { readFile, writeFile } from "node:fs/promises";

const POOLS = "/tmp/musik-catalog/pools.json";
const TARGETS = {
  pre1975: 350,
  genx: 350,
  millennial: 350,
  gen9x: 350,
  genz: 350,
  diaspora: 350,
};
const WINDOWS = {
  pre1975: [1900, 1975],
  genx: [1975, 2005],
  millennial: [1995, 2015],
  gen9x: [2005, 2020],
  genz: [2015, 2026],
  diaspora: [1980, 2026],
};

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.BULK_ADMIN_EMAIL,
      password: process.env.BULK_ADMIN_PASSWORD,
    }),
  }).then((response) => response.json());
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
  };

  const existing = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await fetch(
      `${base}/rest/v1/catalog_songs?select=title,artist,generation_id&limit=1000&offset=${offset}`,
      { headers },
    ).then((response) => response.json());
    existing.push(...page);
    if (page.length < 1000) break;
  }
  const counts = {};
  const seen = new Set();
  for (const row of existing) {
    counts[row.generation_id] = (counts[row.generation_id] ?? 0) + 1;
    seen.add(`${norm(row.title)}|${norm(row.artist)}`);
  }

  const pools = JSON.parse(await readFile(POOLS, "utf8"));
  const additions = [];
  for (const [generation, target] of Object.entries(TARGETS)) {
    const need = target - (counts[generation] ?? 0);
    if (need <= 0) continue;
    const [min, max] = WINDOWS[generation];
    const rows = Object.values(pools[generation] ?? {})
      .filter(
        (row) =>
          Number.isInteger(row.year) &&
          row.year >= min &&
          row.year <= max,
      )
      .sort((a, b) => b.score - a.score || (a.year ?? 9999) - (b.year ?? 9999));
    let taken = 0;
    for (const row of rows) {
      if (taken >= need) break;
      const key = `${norm(row.title)}|${norm(row.artist)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      additions.push({
        title: row.title,
        artist: row.artist,
        year: row.year,
        generation_id: generation,
        source: "itunes",
      });
      taken += 1;
    }
    console.log(generation, "need", need, "added", taken);
  }

  let inserted = 0;
  for (let index = 0; index < additions.length; index += 50) {
    const chunk = additions.slice(index, index + 50);
    const response = await fetch(`${base}/rest/v1/catalog_songs`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(chunk),
    });
    if (response.ok) {
      inserted += (await response.json()).length;
      continue;
    }
    const detail = await response.text();
    console.log("chunk failed", response.status, detail.slice(0, 200));
    for (const row of chunk) {
      const single = await fetch(`${base}/rest/v1/catalog_songs`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=ignore-duplicates,return=representation",
        },
        body: JSON.stringify([row]),
      });
      if (single.ok) inserted += (await single.json()).length;
    }
  }
  console.log("inserted", inserted, "of", additions.length);
  await writeFile(
    "/tmp/musik-catalog/fill.json",
    JSON.stringify(additions, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
