import { Router } from "express";
import { prisma } from "../prisma";
import { makeSlug } from "../utils/slug";

const router = Router();

const withState = { 
  state: { select: { id: true, name: true, code: true } } 
};



//========================================================================= City Post ===============================================================================
router.post("/", async (req, res) => {

  const { name, stateId } = req.body;

  if (!name || !stateId) {
    return res.status(400).json({ 
      message: "name and stateId are required" 
    });
  }

  // State really exist
  const state = await prisma.state.findUnique({ where: { id: Number(stateId) } });
  if (!state || !state.isActive) {
    return res.status(400).json({ 
      message: "invalid stateId" 
    });
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






//========================================================================= City GET ===============================================================================
// LIST all cities    GET /api/cities(only active),    GET /api/cities?all=true(active + inactive, for admin)

router.get("/", async (req, res) => {

  const showAll = req.query.all === "true";

  const cities = await prisma.city.findMany({
    where: showAll ? {} : { isActive: true },
    include: withState,
    orderBy: { name: "asc" },
  });

  res.json(cities);

});





//========================================================================= City of particular state ===============================================================================

router.get("/by-state/:stateId", async (req, res) => {

  const stateId = Number(req.params.stateId);
  if (Number.isNaN(stateId)) {
    return res.status(400).json({ message: "invalid stateId" });
  }

  const cities = await prisma.city.findMany({
    where: { stateId: stateId, isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(cities);

});




//================================================================================ One city get  ==========================================================================

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



//================================================================================ PUT city  ==========================================================================

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

  // another state already using this name?
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





//================================================================================ Delete city  ==========================================================================

router.delete("/:id", async (req, res) => {
  
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    return res.status(404).json({ message: "city not found" });
  }

  const localityCount = await prisma.locality.count({ where: { cityId: id } });
  if (localityCount > 0) {
    return res.status(409).json({
      message: `cannot delete: ${localityCount} locality(s) belong to this city. Deactivate it instead.`,
    });
  }

  const propertyCount = await prisma.property.count({ where: { cityId: id } });
  if (propertyCount > 0) {
    return res.status(409).json({
      message: `cannot delete: ${propertyCount} property(s) are in this city. Deactivate it instead.`,
    });
  }

  await prisma.city.delete({ where: { id } });
  res.json({ message: "city deleted" });
});




export default router;
