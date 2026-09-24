// Seed = starting data that every setup needs.
// Run: npx prisma db seed   (safe to run many times, it will not duplicate)
import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";

// 28 states + 8 union territories of India
const states = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "CH", name: "Chandigarh" },
  { code: "DH", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "PY", name: "Puducherry" },
];

const propertyTypes = [
  { slug: "apartment", name: "Apartment" },
  { slug: "independent-house", name: "Independent House" },
  { slug: "villa", name: "Villa" },
  { slug: "builder-floor", name: "Builder Floor" },
  { slug: "plot", name: "Plot" },
  { slug: "agricultural-land", name: "Agricultural Land" },
  { slug: "office-space", name: "Office Space" },
  { slug: "shop", name: "Shop" },
  { slug: "warehouse", name: "Warehouse" },
];

const amenities = [
  { slug: "parking", name: "Parking" },
  { slug: "lift", name: "Lift" },
  { slug: "power-backup", name: "Power Backup" },
  { slug: "security", name: "Security" },
  { slug: "gym", name: "Gym" },
  { slug: "swimming-pool", name: "Swimming Pool" },
  { slug: "club-house", name: "Club House" },
  { slug: "park", name: "Park" },
  { slug: "water-supply", name: "24x7 Water Supply" },
  { slug: "gated-community", name: "Gated Community" },
];

async function main() {
  for (const s of states) {
    // upsert = update if code exists, otherwise insert
    await prisma.state.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: s,
    });
  }
  console.log(`Seeded ${states.length} states`);

  for (const p of propertyTypes) {
    await prisma.propertyType.upsert({
      where: { slug: p.slug },
      update: { name: p.name },
      create: p,
    });
  }
  console.log(`Seeded ${propertyTypes.length} property types`);

  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { slug: a.slug },
      update: { name: a.name },
      create: a,
    });
  }
  console.log(`Seeded ${amenities.length} amenities`);

  // one ADMIN account to manage masters (change the password in real use)
  // nobody can become admin by register, only here
  const adminEmail = "admin@realestate.local";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash("admin123", 10),
        role: "ADMIN",
      },
    });
    console.log("Created admin: " + adminEmail + " / admin123");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
