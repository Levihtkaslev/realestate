// Creates 50,000 FAKE properties to test search speed.
// Run: npm run seed:properties      (run "npx prisma db seed" first - it needs states, types)
//
// All fake data belongs to 20 fake owners (owner1@seed.local ... owner20@seed.local).
// Running again deletes ONLY those fake properties first, your own data is never touched.

import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";
import { Prisma } from "../src/generated/prisma/client";
import { makeSlug } from "../src/utils/slug";

const TOTAL_PROPERTIES = 50000;
const BATCH_SIZE = 1000; // insert 1000 rows per query (fast, and not too big)

// 5 cities with their localities
const CITIES = [
  { name: "Chennai", stateCode: "TN", localities: ["Anna Nagar", "Velachery", "T Nagar", "Adyar", "Porur", "Tambaram", "OMR", "Mylapore"] },
  { name: "Coimbatore", stateCode: "TN", localities: ["RS Puram", "Gandhipuram", "Peelamedu", "Saravanampatti", "Singanallur", "Vadavalli", "Kovaipudur", "Race Course"] },
  { name: "Bangalore", stateCode: "KA", localities: ["Whitefield", "Koramangala", "Indiranagar", "HSR Layout", "Electronic City", "Hebbal", "Jayanagar", "Marathahalli"] },
  { name: "Mumbai", stateCode: "MH", localities: ["Andheri", "Bandra", "Powai", "Thane West", "Borivali", "Chembur", "Goregaon", "Malad"] },
  { name: "Hyderabad", stateCode: "TS", localities: ["Gachibowli", "Madhapur", "Kondapur", "Banjara Hills", "Kukatpally", "Miyapur", "Uppal", "Manikonda"] },
];

// property types that have bedrooms (others: plot, shop, office ... have no bedrooms)
const HOME_TYPES = ["apartment", "independent-house", "villa", "builder-floor"];

const FURNISHINGS: ("FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED")[] = ["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"];

// random whole number between min and max (both included)
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// random item from a list
function pick<T>(list: T[]): T {
  return list[randomInt(0, list.length - 1)];
}

async function main() {

  // ---------- 1. masters must exist ----------
  const propertyTypes = await prisma.propertyType.findMany();
  if (propertyTypes.length === 0) {
    console.log("No property types found. Run: npx prisma db seed");
    return;
  }

  // ---------- 2. cities + localities (create if missing) ----------
  const localityList: { id: number; name: string; cityId: number; cityName: string }[] = [];

  for (const c of CITIES) {
    const state = await prisma.state.findUnique({ where: { code: c.stateCode } });
    if (!state) {
      console.log("State " + c.stateCode + " not found. Run: npx prisma db seed");
      return;
    }

    const city = await prisma.city.upsert({
      where: { slug: makeSlug(c.name) },
      update: {},
      create: { name: c.name, slug: makeSlug(c.name), stateId: state.id },
    });

    for (const localityName of c.localities) {
      const locality = await prisma.locality.upsert({
        where: { cityId_slug: { cityId: city.id, slug: makeSlug(localityName) } },
        update: {},
        create: { name: localityName, slug: makeSlug(localityName), cityId: city.id },
      });
      localityList.push({ id: locality.id, name: locality.name, cityId: city.id, cityName: city.name });
    }
  }
  console.log("Cities: " + CITIES.length + ", localities: " + localityList.length);

  // ---------- 3. 20 fake owners ----------
  const passwordHash = await bcrypt.hash("seed12345", 10); // same password for all fake owners
  const ownerIds: number[] = [];

  for (let i = 1; i <= 20; i++) {
    const owner = await prisma.user.upsert({
      where: { email: "owner" + i + "@seed.local" },
      update: {},
      create: { name: "Seed Owner " + i, email: "owner" + i + "@seed.local", passwordHash: passwordHash },
    });
    ownerIds.push(owner.id);
  }
  console.log("Fake owners: " + ownerIds.length);

  // ---------- 4. remove old fake properties (from a previous run) ----------
  const deleted = await prisma.property.deleteMany({ where: { ownerId: { in: ownerIds } } });
  console.log("Deleted old fake properties: " + deleted.count);

  // ---------- 5. create 50,000 properties in batches ----------
  const startTime = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  for (let batchStart = 0; batchStart < TOTAL_PROPERTIES; batchStart += BATCH_SIZE) {

    const rows: Prisma.PropertyCreateManyInput[] = [];

    for (let i = batchStart; i < batchStart + BATCH_SIZE; i++) {
      const type = pick(propertyTypes);
      const locality = pick(localityList);
      const isHome = HOME_TYPES.includes(type.slug);
      const listingType = Math.random() < 0.7 ? "SALE" : "RENT"; // 70% sale, 30% rent

      // homes get bedrooms, others do not
      let bedrooms = null;
      let bathrooms = null;
      let furnishing = null;
      let areaSqft = randomInt(300, 5000);
      let title = type.name + " in " + locality.name;

      if (isHome) {
        bedrooms = randomInt(1, 5);
        bathrooms = randomInt(1, bedrooms);
        furnishing = pick(FURNISHINGS);
        areaSqft = bedrooms * randomInt(400, 600) + randomInt(0, 300);
        title = bedrooms + " BHK " + type.name + " in " + locality.name;
      }

      // price from area: sale 3,000-15,000 per sqft, rent 10-50 per sqft per month
      let price = 0;
      if (listingType === "SALE") {
        price = Math.round((areaSqft * randomInt(3000, 15000)) / 100000) * 100000; // round to lakh
      } else {
        price = Math.round((areaSqft * randomInt(10, 50)) / 1000) * 1000; // round to thousand
      }

      rows.push({
        title: title,
        slug: makeSlug(title) + "-seed-" + i,
        description: "Nice " + title.toLowerCase() + ", " + locality.cityName + ". Close to schools, hospitals and bus stop.",
        listingType: listingType,
        price: price,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        areaSqft: areaSqft,
        furnishing: furnishing,
        status: Math.random() < 0.9 ? "ACTIVE" : "INACTIVE", // 90% active
        ownerId: pick(ownerIds),
        propertyTypeId: type.id,
        cityId: locality.cityId,
        localityId: locality.id,
        createdAt: new Date(Date.now() - randomInt(0, oneYearMs)), // spread over the last year
      });
    }

    // one INSERT query for 1000 rows
    await prisma.property.createMany({ data: rows });

    console.log("Inserted " + (batchStart + BATCH_SIZE) + " / " + TOTAL_PROPERTIES);
  }

  // ---------- 6. update PostgreSQL statistics (helps it choose the best plan) ----------
  await prisma.$executeRaw`ANALYZE properties`;

  const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("Done: " + TOTAL_PROPERTIES + " properties in " + seconds + " seconds");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
