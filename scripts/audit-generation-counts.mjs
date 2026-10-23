const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const loginResponse = await fetch(`${base}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anonKey, "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.BULK_ADMIN_EMAIL,
    password: process.env.BULK_ADMIN_PASSWORD,
  }),
});
const login = await loginResponse.json();
if (!login.access_token) throw new Error("Could not sign in to audit catalog.");

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${login.access_token}`,
};
const queryCount = async (query) => {
  const response = await fetch(`${base}/rest/v1/catalog_songs?select=id&${query}`, {
    headers: { ...headers, Range: "0-0", Prefer: "count=exact" },
  });
  if (!response.ok) throw new Error(`Catalog count failed: ${response.status}`);
  return Number(response.headers.get("content-range")?.split("/")[1] ?? 0);
};

const taxonomyResponse = await fetch(`${base}/rest/v1/generations?select=id,label_en&order=position`, { headers });
if (!taxonomyResponse.ok) throw new Error(`Generation lookup failed: ${taxonomyResponse.status}`);
const generations = await taxonomyResponse.json();
const [total, unassigned, counts] = await Promise.all([
  queryCount(""),
  queryCount("generation_id=is.null"),
  Promise.all(generations.map(async ({ id, label_en }) => ({
    id,
    label: label_en,
    count: await queryCount(`generation_id=eq.${encodeURIComponent(id)}`),
  }))),
]);

console.log(JSON.stringify({ total, unassigned, assigned: total - unassigned, generations: counts }, null, 2));
