import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_DIR = "/tmp/musik-catalog";
const TARGETS = {
  pre1975: 350,
  genx: 350,
  millennial: 250,
  gen9x: 350,
  genz: 350,
  diaspora: 350,
};

const ARTISTS = {
  pre1975: [
    "Thái Thanh",
    "Khánh Ly",
    "Thanh Tuyền",
    "Chế Linh",
    "Duy Khánh",
    "Hoàng Oanh",
    "Lệ Thu",
    "Mai Hương",
    "Hà Thanh",
    "Anh Ngọc",
    "Bạch Yến",
    "Thanh Thúy",
    "Phương Dung",
    "Mỹ Bình",
    "Hồng Trúc",
    "Ngọc Cẩm",
    "Quỳnh Giao",
    "Kim Tước",
    "Tâm Vấn",
    "Thái Hằng",
    "Elvis Phương",
    "Duy Quang",
    "Tuấn Ngọc",
    "Thái Hiền",
    "Trịnh Công Sơn",
    "Lam Phương",
    "Ngô Thụy Miên",
    "Từ Công Phụng",
    "Phạm Duy",
    "Cung Tiến",
    "Văn Cao",
    "Đoàn Chuẩn",
    "Hoàng Thi Thơ",
    "Trần Thiện Thanh",
    "Song Ngọc",
    "Nhật Trường",
    "Hùng Cường",
    "Mai Lệ Quyên",
    "Thanh Lan",
    "Họa Mi",
    "Duy Trác",
    "Quốc Dũng",
    "Lê Uyên",
    "Lê Uyên Phương",
    "Phương Hồng Quế",
    "Thanh Vũ",
  ],
  genx: [
    "Hồng Nhung",
    "Thanh Lam",
    "Mỹ Linh",
    "Trần Thu Hà",
    "Quang Linh",
    "Quang Dũng",
    "Trọng Tấn",
    "Đăng Dương",
    "Việt Hoàn",
    "Anh Thơ",
    "Ngọc Anh",
    "Hồng Ngọc",
    "Duy Mạnh",
    "Lâm Chấn Huy",
    "Quách Tuấn Du",
    "Nguyễn Phi Hùng",
    "Hồ Quang Hiếu",
    "Quách Thành Danh",
    "Tấn Minh",
    "Khánh Linh",
    "Đức Tuấn",
    "Nguyên Thảo",
    "Hà Trần",
    "Phương Anh",
    "Ngọc Khuê",
    "Lệ Quyên",
    "Quang Lê",
    "Mạnh Quỳnh",
    "Trường Vũ",
    "Phi Nhung",
  ],
  millennial: [
    "Mỹ Tâm",
    "Lam Trường",
    "Đan Trường",
    "Cẩm Ly",
    "Phương Thanh",
    "Đàm Vĩnh Hưng",
    "Hồ Ngọc Hà",
    "Bảo Thy",
    "Đông Nhi",
    "Noo Phước Thịnh",
    "Khắc Việt",
    "Quang Vinh",
    "Ưng Hoàng Phúc",
    "Thanh Thảo",
    "Nguyễn Hưng",
    "Bảo Anh",
    "Văn Mai Hương",
    "Hương Tràm",
    "Phạm Trưởng",
    "Tiên Tiên",
    "Khổng Tú Quỳnh",
    "Wanbi Tuấn Anh",
    "Nam Cường",
    "Cao Thái Sơn",
    "Đăng Khôi",
    "Hoàng Hải",
    "Lương Bích Hữu",
    "Khánh Phương",
    "Hoàng Thùy Linh",
    "Tuấn Hưng",
    "Quang Hà",
    "Lý Hải",
    "Chí Thiện",
    "Nguyên Vũ",
  ],
  gen9x: [
    "Sơn Tùng M-TP",
    "Bích Phương",
    "Vũ Cát Tường",
    "Tóc Tiên",
    "Châu Khải Phong",
    "Trịnh Thăng Bình",
    "Only C",
    "Lou Hoàng",
    "Đức Phúc",
    "Phương Ly",
    "Min",
    "Erik",
    "Soobin Hoàng Sơn",
    "Isaac",
    "Vũ",
    "Lê Bảo Bình",
    "Quân A.P",
    "Bùi Anh Tuấn",
    "Hà Anh Tuấn",
    "Trung Quân Idol",
    "Uyên Linh",
    "Tăng Duy Tân",
    "Trúc Nhân",
    "Hòa Minzy",
    "Chi Pu",
    "Đông Nhi",
    "Noo Phước Thịnh",
    "Bảo Anh",
    "Hương Tràm",
    "Văn Mai Hương",
  ],
  genz: [
    "HIEUTHUHAI",
    "tlinh",
    "MCK",
    "Low G",
    "JGKiD",
    "Đen Vâu",
    "JustaTee",
    "Binz",
    "Suboi",
    "Karik",
    "Wowy",
    "Rhymastic",
    "Touliver",
    "Amee",
    "Hoàng Dũng",
    "Mỹ Anh",
    "Obito",
    "Shiki",
    "Grey D",
    "Wren Evans",
    "Quang Hùng MasterD",
    "Pháo",
    "Wean",
    "Ricky Star",
    "B Ray",
    "Dế Choắt",
    "Lil Wuyn",
    "16 Typh",
    "Yanbi",
    "Andree",
    "Right",
    "Bình Gold",
    "K-ICM",
    "Jack",
    "Phúc Du",
    "Dew",
    "Minh Tốc",
    "VSTRA",
    "MAYDAY",
  ],
  diaspora: [
    "Ngọc Lan",
    "Bằng Kiều",
    "Minh Tuyết",
    "Như Quỳnh",
    "Lưu Bích",
    "Thế Sơn",
    "Don Hồ",
    "Lynda Trang Đài",
    "Ý Lan",
    "Thanh Hà",
    "Hồ Lệ Thu",
    "Mai Thiên Vân",
    "Hương Thủy",
    "Tâm Đoan",
    "Hà Phương",
    "Duy Trường",
    "Thùy Dương",
    "Nguyên Khang",
    "Vũ Quốc Việt",
    "Lâm Thúy Vân",
    "Diễm Liên",
    "Anh Minh",
    "Khánh Hà",
    "Ngọc Hạ",
    "Trịnh Lam",
    "Quỳnh Vi",
    "Hà Thanh Xuân",
    "Lâm Bảo Ngọc",
    "Nguyễn Hưng",
    "Quang Lê",
  ],
};

const BAD = /\b(karaoke|instrumental|tribute|cover|in the style of|made famous|originally performed|backing track|sing along|live at|live in|remix)\b/i;
const COMPILATION = /\b(tuyển tập|tuyển chọn|best of|greatest hits|collection|compilation|karaoke|live)\b/i;
const MEDLEY = /\b(lk|liên khúc|medley)\b/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function cleanTitle(value) {
  return String(value ?? "")
    .replace(/\s*[\[(].*?[\])]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function artistMatches(target, got) {
  const a = norm(target);
  const b = norm(got);
  return a === b || b.includes(a) || a.includes(b);
}

async function itunes(artist) {
  const url =
    "https://itunes.apple.com/search?term=" +
    encodeURIComponent(artist) +
    "&entity=song&country=VN&limit=200";
  const response = await fetch(url, {
    headers: { "User-Agent": "MusikCatalog/1.0 (local catalog build)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`iTunes ${response.status}`);
  return response.json();
}

function scoreTrack({ target, track, index }) {
  const title = cleanTitle(track.trackName);
  const year = Number(String(track.releaseDate ?? "").slice(0, 4)) || null;
  let score = 1000 - index * 2;
  if (norm(track.artistName) === norm(target)) score += 250;
  if (COMPILATION.test(track.collectionName ?? "")) score -= 120;
  if (/[()[\]]/.test(track.trackName ?? "")) score -= 25;
  if ((track.trackTimeMillis ?? 0) > 8 * 60 * 1000) score -= 100;
  if ((track.trackTimeMillis ?? 0) < 60 * 1000) score -= 100;
  if (year) score += Math.max(0, 30 - Math.abs(year - 2000) / 4);
  return { title, year, score };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const auth = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: process.env.BULK_ADMIN_EMAIL,
        password: process.env.BULK_ADMIN_PASSWORD,
      }),
    },
  ).then((response) => response.json());
  if (!auth.access_token) {
    throw new Error(auth.error_description ?? auth.msg ?? "Admin sign-in failed");
  }

  const existing = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/catalog_songs?select=title,artist`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${auth.access_token}`,
      },
    },
  ).then((response) => response.json());
  const existingKeys = new Set(
    (Array.isArray(existing) ? existing : []).map(
      (row) => `${norm(row.title)}|${norm(row.artist)}`,
    ),
  );

  const pools = Object.fromEntries(
    Object.keys(TARGETS).map((gen) => [gen, new Map()]),
  );
  try {
    const saved = JSON.parse(await readFile(`${OUT_DIR}/pools.json`, "utf8"));
    for (const [generation, savedPool] of Object.entries(saved)) {
      if (!pools[generation]) continue;
      for (const [key, value] of Object.entries(savedPool)) {
        pools[generation].set(key, value);
      }
    }
  } catch {
    // First run.
  }

  const processed = new Set();
  const report = [];
  try {
    const lines = (await readFile(`${OUT_DIR}/artist-report.jsonl`, "utf8"))
      .split("\n")
      .filter(Boolean);
    for (const line of lines) {
      const item = JSON.parse(line);
      report.push(item);
      processed.add(`${item.generation}|${item.artist}`);
    }
  } catch {
    // First run.
  }

  for (const [generation, artists] of Object.entries(ARTISTS)) {
    for (const artist of artists) {
      if (processed.has(`${generation}|${artist}`)) continue;
      let payload;
      try {
        payload = await itunes(artist);
      } catch (error) {
        const item = { generation, artist, error: String(error) };
        report.push(item);
        await appendFile(
          `${OUT_DIR}/artist-report.jsonl`,
          JSON.stringify(item) + "\n",
        );
        console.log(generation, artist, "ERROR", String(error));
        await sleep(2500);
        continue;
      }
      let accepted = 0;
      const results = Array.isArray(payload.results) ? payload.results : [];
      results.forEach((track, index) => {
        if (track.kind !== "song" || !track.trackName) return;
        if (!artistMatches(artist, track.artistName)) return;
        if (BAD.test(track.trackName) || BAD.test(track.collectionName ?? "")) {
          return;
        }
        if (MEDLEY.test(track.trackName)) return;
        const key = `${norm(cleanTitle(track.trackName))}|${norm(artist)}`;
        if (!key.split("|")[0] || existingKeys.has(key)) return;
        const scored = scoreTrack({ target: artist, track, index });
        const current = pools[generation].get(key);
        if (!current) {
          pools[generation].set(key, {
            title: scored.title,
            artist,
            year: scored.year,
            generation_id: generation,
            source: "itunes",
            score: scored.score,
            album: track.collectionName ?? null,
          });
          accepted += 1;
        } else {
          current.score = Math.max(current.score, scored.score);
          if (scored.year && (!current.year || scored.year < current.year)) {
            current.year = scored.year;
          }
          if (scored.title.length < current.title.length) {
            current.title = scored.title;
          }
        }
      });
      const item = {
        generation,
        artist,
        results: results.length,
        accepted,
      };
      report.push(item);
      await appendFile(
        `${OUT_DIR}/artist-report.jsonl`,
        JSON.stringify(item) + "\n",
      );
      await writeFile(
        `${OUT_DIR}/pools.json`,
        JSON.stringify(
          Object.fromEntries(
            Object.entries(pools).map(([gen, pool]) => [
              gen,
              Object.fromEntries(pool),
            ]),
          ),
        ),
      );
      console.log(
        generation,
        artist,
        `results=${results.length}`,
        `accepted=${accepted}`,
        `pool=${pools[generation].size}`,
      );
      await sleep(2500);
    }
  }

  const selected = [];
  const summary = {};
  for (const [generation, pool] of Object.entries(pools)) {
    const target = TARGETS[generation];
    const rows = [...pool.values()]
      .sort((a, b) => b.score - a.score || (a.year ?? 9999) - (b.year ?? 9999))
      .slice(0, target);
    selected.push(...rows);
    summary[generation] = {
      candidates: pool.size,
      selected: rows.length,
      target,
    };
  }

  await writeFile(
    `${OUT_DIR}/catalog-2000.json`,
    JSON.stringify(selected, null, 2),
  );
  await writeFile(
    `${OUT_DIR}/build-report.json`,
    JSON.stringify({ summary, report }, null, 2),
  );

  console.log(JSON.stringify(summary, null, 2));
  console.log(`selected ${selected.length} songs`);
  const short = Object.entries(summary).filter(
    ([, value]) => value.selected < value.target,
  );
  if (short.length) {
    console.log("SHORT", JSON.stringify(short));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
