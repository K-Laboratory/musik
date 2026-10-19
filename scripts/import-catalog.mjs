import { readFile, writeFile } from "node:fs/promises";

const FILE = "/tmp/musik-catalog/catalog-final.json";
const CHUNK = 100;
const GENERATIONS = [
  "pre1975",
  "genx",
  "millennial",
  "gen9x",
  "genz",
  "diaspora",
];

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  const rows = JSON.parse(await readFile(FILE, "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No rows to import.");
  }

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
  if (!auth.access_token) {
    throw new Error(auth.error_description ?? auth.msg ?? "Admin sign-in failed");
  }
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
  };

  const existing = await fetch(
    `${base}/rest/v1/catalog_songs?select=title,artist`,
    { headers },
  ).then((response) => response.json());
  const seen = new Set(
    (Array.isArray(existing) ? existing : []).map(
      (row) => `${norm(row.title)}|${norm(row.artist)}`,
    ),
  );

  const clean = [];
  let skipped = 0;
  for (const row of rows) {
    const title = String(row.title ?? "").trim();
    const artist = String(row.artist ?? "").trim();
    const generation = String(row.generation_id ?? "");
    if (!title || !artist || !GENERATIONS.includes(generation)) {
      skipped += 1;
      continue;
    }
    const key = `${norm(title)}|${norm(artist)}`;
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    clean.push({
      title: title.slice(0, 300),
      artist: artist.slice(0, 300),
      year: Number.isInteger(row.year) ? row.year : null,
      generation_id: generation,
      source: String(row.source ?? "itunes").slice(0, 40),
    });
  }

  const inserted = [];
  const failures = [];
  for (let index = 0; index < clean.length; index += CHUNK) {
    const chunk = clean.slice(index, index + CHUNK);
    const response = await fetch(`${base}/rest/v1/catalog_songs`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      failures.push({
        from: index,
        status: response.status,
        detail: (await response.text()).slice(0, 500),
      });
      continue;
    }
    inserted.push(...(await response.json()));
  }

  const counts = {};
  for (const generation of GENERATIONS) {
    const response = await fetch(
      `${base}/rest/v1/catalog_songs?select=id&generation_id=eq.${generation}`,
      {
        headers: {
          ...headers,
          Prefer: "count=exact",
          Range: "0-0",
        },
      },
    );
    counts[generation] = Number(
      response.headers.get("content-range")?.split("/")[1] ?? 0,
    );
  }

  const report = {
    requested: rows.length,
    clean: clean.length,
    skipped,
    inserted: inserted.length,
    failures,
    counts,
  };
  await writeFile(
    "/tmp/musik-catalog/import-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
