import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

// "Navi Mumbai" -> "navi-mumbai"
function makeSlug(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// CREATE city  ->  POST /api/cities
router.post("/", async (req, res) => {
  const { name, state } = req.body;

  if (!name || !state) {
    return res.status(400).json({ message: "name and state are required" });
  }

  const slug = makeSlug(name);
  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) {
    return res.status(409).json({ message: "city already exists" });
  }

  const city = await prisma.city.create({
    data: { name: name.trim(), state: state.trim(), slug },
  });
  res.status(201).json(city);
});

// LIST cities  ->  GET /api/cities   (only active)
//              ->  GET /api/cities?all=true   (active + inactive, for admin)
router.get("/", async (req, res) => {
  const showAll = req.query.all === "true";

  const cities = await prisma.city.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(cities);
});

// GET one city  ->  GET /api/cities/1
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    return res.status(404).json({ message: "city not found" });
  }
  res.json(city);
});

// UPDATE city  ->  PUT /api/cities/1
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    return res.status(404).json({ message: "city not found" });
  }

  const { name, state, isActive } = req.body;
  const data: { name?: string; state?: string; slug?: string; isActive?: boolean } = {};

  if (name) {
    const slug = makeSlug(name);
    // another city already using this name?
    const sameSlug = await prisma.city.findUnique({ where: { slug } });
    if (sameSlug && sameSlug.id !== id) {
      return res.status(409).json({ message: "city already exists" });
    }
    data.name = name.trim();
    data.slug = slug;
  }
  if (state) data.state = state.trim();
  if (typeof isActive === "boolean") data.isActive = isActive;

  const updated = await prisma.city.update({ where: { id }, data });
  res.json(updated);
});

// DELETE city  ->  DELETE /api/cities/1
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    return res.status(404).json({ message: "city not found" });
  }

  await prisma.city.delete({ where: { id } });
  res.json({ message: "city deleted" });
});

export default router;
