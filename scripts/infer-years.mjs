import { readFile, writeFile } from "node:fs/promises";

const FILE = "/tmp/musik-catalog/catalog-2000.json";
const LIMIT = Number(process.argv[2] ?? "0");
const BATCH = 20;

const apiKey =
  process.env.CLASSIFIER_API_KEY ||
  process.env.DEEPSEEK_API_KEY ||
  process.env.OPENAI_API_KEY;
const base = (
  process.env.CLASSIFIER_API_BASE?.trim() || "https://api.deepseek.com/v1"
).replace(/\/$/, "");
const model = process.env.CLASSIFIER_MODEL?.trim() || "deepseek-chat";

function needsYear(row) {
  if (!row.year) return row.generation_id === "pre1975";
  if (row.generation_id === "pre1975") return row.year > 1975;
  if (row.generation_id === "genx") return row.year < 1970 || row.year > 2015;
  return false;
}

function allowed(row, year) {
  if (!Number.isInteger(year) || year < 1900 || year > 2026) return false;
  if (row.generation_id === "pre1975") return year <= 1975;
  if (row.generation_id === "genx") return year >= 1970 && year <= 2015;
  return true;
}

async function ask(rows) {
  const list = rows
    .map(
      (row, index) =>
        `${index + 1}. Title: ${row.title} | Artist: ${row.artist} | Current source year: ${row.year ?? "unknown"} | Generation: ${row.generation_id}`,
    )
    .join("\n");
  const system = [
    "You are correcting Vietnamese music metadata.",
    "For each song, return the year of its ORIGINAL first release or composition, not a later reissue or compilation.",
    "Pre-1975 songs must receive a year no later than 1975.",
    "Gen X songs are associated with listeners born in the 1970s; their original release year should normally be 1970-2015.",
    "If you are not reasonably confident, return null rather than guessing.",
    "Return strictly JSON with this shape:",
    '{"years":[{"index":1,"year":1972,"confidence":0.8}]}',
    "Use the same index numbers as the input. Do not include prose.",
  ].join("\n");
  const response = await fetch(`${base}/chat/completions`, {
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
        { role: "system", content: system },
        { role: "user", content: list },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`model ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const parsed = JSON.parse(String(content ?? "{}"));
  return Array.isArray(parsed.years) ? parsed.years : [];
}

async function main() {
  if (!apiKey) throw new Error("No model API key");
  const rows = JSON.parse(await readFile(FILE, "utf8"));
  const targets = rows.filter(needsYear);
  const work = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
  console.log(`need years: ${targets.length}; processing ${work.length}`);

  let resolved = 0;
  let unresolved = 0;
  for (let index = 0; index < work.length; index += BATCH) {
    const chunk = work.slice(index, index + BATCH);
    let answers = [];
    try {
      answers = await ask(chunk);
    } catch (error) {
      console.log("batch error", String(error));
      unresolved += chunk.length;
      continue;
    }
    const byIndex = new Map(
      answers
        .filter((answer) => Number.isInteger(answer.index))
        .map((answer) => [answer.index, answer]),
    );
    chunk.forEach((row, offset) => {
      const answer = byIndex.get(offset + 1);
      const year = Number(answer?.year);
      if (
        answer &&
        allowed(row, year) &&
        Number(answer.confidence ?? 0) >= 0.45
      ) {
        row.year = year;
        row.year_source = "model";
        resolved += 1;
      } else {
        unresolved += 1;
      }
    });
    console.log(
      `batch ${index + chunk.length}/${work.length} resolved=${resolved} unresolved=${unresolved}`,
    );
  }

  await writeFile(FILE, JSON.stringify(rows, null, 2));
  console.log({ resolved, unresolved });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
