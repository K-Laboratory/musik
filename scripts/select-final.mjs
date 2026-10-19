import { readFile, writeFile } from "node:fs/promises";

const FILE = "/tmp/musik-catalog/pools.json";
const OUT = "/tmp/musik-catalog/catalog-final.json";
const TARGETS = {
  pre1975: 350,
  genx: 350,
  millennial: 250,
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
const CAPS = {
  pre1975: 20,
  genx: 20,
  millennial: 15,
  gen9x: 15,
  genz: 15,
  diaspora: 15,
};

async function main() {
  const pools = JSON.parse(await readFile(FILE, "utf8"));
  const selected = [];
  const summary = {};
  for (const [generation, target] of Object.entries(TARGETS)) {
    const rows = Object.values(pools[generation] ?? {});
    const [min, max] = WINDOWS[generation];
    const inWindow = rows.filter(
      (row) => Number.isInteger(row.year) && row.year >= min && row.year <= max,
    );
    const source = inWindow.length >= target ? inWindow : rows;
    const sorted = source
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.year ?? 9999) - (b.year ?? 9999) ||
          a.title.localeCompare(b.title),
      );
    const picked = [];
    const byArtist = new Map();
    const cap = CAPS[generation];
    for (const row of sorted) {
      if (picked.length >= target) break;
      const count = byArtist.get(row.artist) ?? 0;
      if (count >= cap) continue;
      byArtist.set(row.artist, count + 1);
      picked.push(row);
    }
    if (picked.length < target) {
      const chosen = new Set(picked.map((row) => `${row.title}|${row.artist}`));
      for (const row of sorted) {
        if (picked.length >= target) break;
        const key = `${row.title}|${row.artist}`;
        if (chosen.has(key)) continue;
        chosen.add(key);
        picked.push(row);
      }
    }
    selected.push(...picked);
    summary[generation] = {
      pool: rows.length,
      in_window: inWindow.length,
      selected: picked.length,
      target,
      used_window: inWindow.length >= target,
    };
  }
  await writeFile(OUT, JSON.stringify(selected, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log("selected", selected.length);
  const short = Object.entries(summary).filter(
    ([, value]) => value.selected < value.target,
  );
  if (short.length) console.log("SHORT", short);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
