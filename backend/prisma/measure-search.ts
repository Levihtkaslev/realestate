// Measures how fast typical searches run on the properties table.
// Run: npm run measure:search      (needs data: npm run seed:properties)
//
// It uses PostgreSQL "EXPLAIN ANALYZE": the database runs the query and tells us
//   - HOW it found the rows  (Seq Scan = read the whole table, Index Scan = used an index)
//   - HOW LONG it took       (Execution Time in milliseconds)

import { prisma } from "../src/prisma";

const RUNS = 5; // run each query 5 times and take the middle value (more stable)

async function measure(label: string, sql: string) {
  const times: number[] = [];
  let plan = "";

  for (let i = 0; i < RUNS; i++) {
    const rows: { "QUERY PLAN": string }[] = await prisma.$queryRawUnsafe("EXPLAIN ANALYZE " + sql);
    const lines = rows.map((r) => r["QUERY PLAN"]);

    // last line looks like: "Execution Time: 12.345 ms"
    const timeLine = lines.find((l) => l.startsWith("Execution Time"));
    if (timeLine) {
      times.push(Number(timeLine.replace(/[^0-9.]/g, "")));
    }

    // which scan was used? (Seq Scan / Index Scan / Bitmap Index Scan ...)
    const scanLine = lines.find((l) => l.includes("Scan"));
    if (scanLine) {
      plan = scanLine.trim().replace(/^->\s*/, "").split("  (")[0];
    }
  }

  times.sort((a, b) => a - b);
  const middle = times[Math.floor(times.length / 2)];

  console.log("\n" + label);
  console.log("   time : " + middle.toFixed(2) + " ms");
  console.log("   plan : " + plan);
}

async function main() {

  const total = await prisma.property.count();
  const chennai = await prisma.city.findUnique({ where: { slug: "chennai" } });
  if (!chennai || total < 1000) {
    console.log("Not enough data. Run: npm run seed:properties");
    return;
  }
  const locality = await prisma.locality.findFirst({ where: { cityId: chennai.id } });
  if (!locality) {
    console.log("No locality in Chennai. Run: npm run seed:properties");
    return;
  }

  const indexes: { indexname: string }[] = await prisma.$queryRawUnsafe(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'properties' ORDER BY indexname"
  );
  console.log("Rows in properties: " + total);
  console.log("Indexes on properties: " + indexes.map((i) => i.indexname).join(", "));

  // the same kind of queries our search API runs (LIMIT 21 = limit 20 + 1 extra)
  await measure(
    "1. SALE + Chennai + budget 30L-80L, sort price low->high",
    `SELECT * FROM properties
     WHERE status = 'ACTIVE' AND listing_type = 'SALE' AND city_id = ${chennai.id}
       AND price >= 3000000 AND price <= 8000000
     ORDER BY price ASC, id ASC LIMIT 21`
  );

  await measure(
    "2. SALE + Chennai + 2 BHK, sort newest",
    `SELECT * FROM properties
     WHERE status = 'ACTIVE' AND listing_type = 'SALE' AND city_id = ${chennai.id} AND bedrooms = 2
     ORDER BY created_at DESC, id DESC LIMIT 21`
  );

  await measure(
    "3. SALE, all cities, sort newest (home page)",
    `SELECT * FROM properties
     WHERE status = 'ACTIVE' AND listing_type = 'SALE'
     ORDER BY created_at DESC, id DESC LIMIT 21`
  );

  await measure(
    "4. RENT, all cities, sort price high->low",
    `SELECT * FROM properties
     WHERE status = 'ACTIVE' AND listing_type = 'RENT'
     ORDER BY price DESC, id DESC LIMIT 21`
  );

  await measure(
    "5. RENT + one locality (" + locality.name + "), sort price low->high",
    `SELECT * FROM properties
     WHERE status = 'ACTIVE' AND listing_type = 'RENT' AND locality_id = ${locality.id}
     ORDER BY price ASC, id ASC LIMIT 21`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
