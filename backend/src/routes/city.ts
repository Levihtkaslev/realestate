import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

// "Navi Mumbai" -> "navi-mumbai"
function makeSlug(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// with every city, also send its state's id, name and code
const withState = { state: { select: { id: true, name: true, code: true } } };

// CREATE city  ->  POST /api/cities   body: { name, stateId }
router.post("/", async (req, res) => {
  const { name, stateId } = req.body;

  if (!name || !stateId) {
    return res.status(400).json({ message: "name and stateId are required" });
  }

  // verify the state really exists and is active
  const state = await prisma.state.findUnique({ where: { id: Number(stateId) } });
  if (!state || !state.isActive) {
    return res.status(400).json({ message: "invalid stateId" });
  }

  const slug = makeSlug(name);
  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) {
    return res.status(409).json({ message: "city already exists" });
  }

  const city = await prisma.city.create({
    data: { name: name.trim(), slug, stateId: state.id },
    include: withState,
  });
  res.status(201).json(city);
});

// LIST cities  ->  GET /api/cities              (only active)
//              ->  GET /api/cities?all=true     (active + inactive, for admin)
//              ->  GET /api/cities?stateId=23   (cities of one state, for dropdown)
router.get("/", async (req, res) => {
  const showAll = req.query.all === "true";
  const stateId = req.query.stateId ? Number(req.query.stateId) : undefined;

  const cities = await prisma.city.findMany({
    where: {
      ...(showAll ? {} : { isActive: true }),
      ...(stateId ? { stateId } : {}),
    },
    include: withState,
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

  const city = await prisma.city.findUnique({ where: { id }, include: withState });
  if (!city) {
    return res.status(404).json({ message: "city not found" });
  }
  res.json(city);
});

// UPDATE city  ->  PUT /api/cities/1   body: { name?, stateId?, isActive? }
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    return res.status(404).json({ message: "city not found" });
  }

  const { name, stateId, isActive } = req.body;
  const data: { name?: string; slug?: string; stateId?: number; isActive?: boolean } = {};

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
  if (stateId) {
    const state = await prisma.state.findUnique({ where: { id: Number(stateId) } });
    if (!state || !state.isActive) {
      return res.status(400).json({ message: "invalid stateId" });
    }
    data.stateId = state.id;
  }
  if (typeof isActive === "boolean") data.isActive = isActive;

  const updated = await prisma.city.update({ where: { id }, data, include: withState });
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
