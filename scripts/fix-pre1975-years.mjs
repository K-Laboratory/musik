import { writeFile } from "node:fs/promises";

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BATCH = 18;

const apiKey =
  process.env.CLASSIFIER_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  process.env.OPENAI_API_KEY;
const apiBase = (
  process.env.CLASSIFIER_API_BASE?.trim() || "https://api.deepseek.com/v1"
).replace(/\/$/, "");
const model = process.env.CLASSIFIER_MODEL?.trim() || "deepseek-chat";

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function ask(rows) {
  const list = rows
    .map(
      (row, index) =>
        `${index + 1}. ${row.title} | ${row.artist} | source year: ${row.year ?? "unknown"}`,
    )
    .join("\n");
  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are correcting Vietnamese music metadata.",
            "For each song, return the original first release or composition year, not a reissue/compilation year.",
            "These are pre-1975 songs, so every year must be between 1940 and 1975.",
            "If unsure, return null rather than guessing.",
            'Return JSON only: {"years":[{"index":1,"year":1972,"confidence":0.8}]}',
          ].join("\n"),
        },
        { role: "user", content: list },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`model ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return Array.isArray(parsed.years) ? parsed.years : [];
}

async function main() {
  if (!apiKey) throw new Error("No model API key");
  const auth = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.BULK_ADMIN_EMAIL,
      password: process.env.BULK_ADMIN_PASSWORD,
    }),
  }).then((response) => response.json());
  const headers = {
    apikey: ANON,
    Authorization: `Bearer ${auth.access_token}`,
    "Content-Type": "application/json",
  };

  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await fetch(
      `${BASE}/rest/v1/catalog_songs?select=id,title,artist,year&generation_id=eq.pre1975&order=id&limit=1000&offset=${offset}`,
      { headers },
    ).then((response) => response.json());
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const byArtist = new Map();
  for (const row of rows) {
    if (Number.isInteger(row.year) && row.year <= 1975) {
      const list = byArtist.get(row.artist) ?? [];
      list.push(row.year);
      byArtist.set(row.artist, list);
    }
  }
  const targets = rows.filter(
    (row) => !Number.isInteger(row.year) || row.year > 1975,
  );
  console.log(`pre1975 rows ${rows.length}; need year correction ${targets.length}`);

  let resolved = 0;
  let fallback = 0;
  for (let index = 0; index < targets.length; index += BATCH) {
    const chunk = targets.slice(index, index + BATCH);
    let answers = [];
    try {
      answers = await ask(chunk);
    } catch (error) {
      console.log("batch error", String(error));
    }
    const byIndex = new Map(
      answers
        .filter((answer) => Number.isInteger(answer.index))
        .map((answer) => [answer.index, answer]),
    );
    for (let offset = 0; offset < chunk.length; offset += 1) {
      const row = chunk[offset];
      const answer = byIndex.get(offset + 1);
      const year = Number(answer?.year);
      let nextYear = null;
      let source = "fallback";
      if (
        Number.isInteger(year) &&
        year >= 1940 &&
        year <= 1975 &&
        Number(answer?.confidence ?? 0) >= 0.45
      ) {
        nextYear = year;
        source = "model";
        resolved += 1;
      } else {
        nextYear = median(byArtist.get(row.artist) ?? []) ?? 1970;
        fallback += 1;
      }
      await fetch(
        `${BASE}/rest/v1/catalog_songs?id=eq.${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({ year: nextYear }),
        },
      );
      const years = byArtist.get(row.artist) ?? [];
      years.push(nextYear);
      byArtist.set(row.artist, years);
      row.year = nextYear;
      row.year_source = source;
    }
    console.log(
      `corrected ${Math.min(index + BATCH, targets.length)}/${targets.length}`,
    );
  }
  const report = { rows: rows.length, targets: targets.length, resolved, fallback };
  await writeFile(
    "/tmp/musik-catalog/pre1975-year-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
