import { readFile, writeFile } from "node:fs/promises";

const POOLS = "/tmp/musik-catalog/pools.json";
const OUT = "/tmp/musik-catalog/catalog-2900.json";
const TARGETS = {
  pre1975: 833,
  genx: 833,
  millennial: 834,
  gen9x: 833,
  genz: 834,
  diaspora: 833,
};
const WINDOWS = {
  pre1975: [1900, 1975],
  genx: [1975, 2005],
  millennial: [1995, 2015],
  gen9x: [2005, 2020],
  genz: [2015, 2026],
  diaspora: [1980, 2026],
};
const CAPS = {
  pre1975: 30,
  genx: 22,
  millennial: 20,
  gen9x: 20,
  genz: 20,
  diaspora: 20,
};

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function dbFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30_000),
  });
}

async function main() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = await dbFetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.BULK_ADMIN_EMAIL,
      password: process.env.BULK_ADMIN_PASSWORD,
    }),
  }).then((response) => response.json());
  if (!auth.access_token) {
    throw new Error(auth.error_description ?? auth.msg ?? "Admin sign-in failed");
  }
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
  };

  const existing = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await dbFetch(
      `${base}/rest/v1/catalog_songs?select=title,artist,generation_id&order=id&limit=1000&offset=${offset}`,
      { headers },
    ).then((response) => response.json());
    existing.push(...page);
    if (page.length < 1000) break;
  }
  const seen = new Set();
  const counts = {};
  const artistCounts = {};
  for (const row of existing) {
    counts[row.generation_id] = (counts[row.generation_id] ?? 0) + 1;
    seen.add(`${norm(row.title)}|${norm(row.artist)}`);
    artistCounts[row.artist] = (artistCounts[row.artist] ?? 0) + 1;
  }

  const pools = JSON.parse(await readFile(POOLS, "utf8"));
  const additions = [];
  const report = {};

  for (const [generation, target] of Object.entries(TARGETS)) {
    const need = target - (counts[generation] ?? 0);
    if (need <= 0) {
      report[generation] = { need: 0, added: 0 };
      continue;
    }
    const [min, max] = WINDOWS[generation];
    const rows = Object.values(pools[generation] ?? {});
    const inWindow = rows
      .filter(
        (row) =>
          Number.isInteger(row.year) && row.year >= min && row.year <= max,
      )
      .sort((a, b) => b.score - a.score || (a.year ?? 9999) - (b.year ?? 9999));
    const outside = rows
      .filter(
        (row) =>
          !Number.isInteger(row.year) || row.year < min || row.year > max,
      )
      .sort((a, b) => b.score - a.score || (a.year ?? 9999) - (b.year ?? 9999));
    const ordered = [...inWindow, ...outside];
    const picked = [];
    const cap = CAPS[generation];
    const localArtist = new Map(Object.entries(artistCounts));

    for (const row of ordered) {
      if (picked.length >= need) break;
      const key = `${norm(row.title)}|${norm(row.artist)}`;
      if (seen.has(key)) continue;
      const artistCount = localArtist.get(row.artist) ?? 0;
      if (artistCount >= cap) continue;
      seen.add(key);
      localArtist.set(row.artist, artistCount + 1);
      picked.push({
        title: row.title,
        artist: row.artist,
        year: row.year ?? null,
        generation_id: generation,
        source: "itunes",
      });
    }
    if (picked.length < need) {
      for (const row of ordered) {
        if (picked.length >= need) break;
        const key = `${norm(row.title)}|${norm(row.artist)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picked.push({
          title: row.title,
          artist: row.artist,
          year: row.year ?? null,
          generation_id: generation,
          source: "itunes",
        });
      }
    }
    additions.push(...picked);
    report[generation] = {
      need,
      added: picked.length,
      in_window: inWindow.length,
      outside_window: outside.length,
    };
  }

  await writeFile(OUT, JSON.stringify(additions, null, 2));
  console.log(JSON.stringify({ report, additions: additions.length }, null, 2));

  let inserted = 0;
  for (let index = 0; index < additions.length; index += 100) {
    const chunk = additions.slice(index, index + 100);
    const response = await dbFetch(`${base}/rest/v1/catalog_songs`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(chunk),
    });
    if (response.ok) {
      inserted += (await response.json()).length;
      console.log(
        `inserted ${Math.min(index + 100, additions.length)}/${additions.length}`,
      );
      continue;
    }
    console.log("chunk failed", response.status, (await response.text()).slice(0, 300));
    for (const row of chunk) {
      let single;
      try {
        single = await dbFetch(`${base}/rest/v1/catalog_songs`, {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "resolution=ignore-duplicates,return=representation",
          },
          body: JSON.stringify([row]),
        });
      } catch {
        continue;
      }
      if (single.ok) inserted += (await single.json()).length;
    }
  }
  console.log("inserted", inserted);

  const finalCounts = {};
  for (const generation of Object.keys(TARGETS)) {
    const response = await dbFetch(
      `${base}/rest/v1/catalog_songs?select=id&generation_id=eq.${generation}`,
      { headers: { ...headers, Prefer: "count=exact", Range: "0-0" } },
    );
    finalCounts[generation] = Number(
      response.headers.get("content-range")?.split("/")[1] ?? 0,
    );
  }
  console.log("final counts", finalCounts);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
