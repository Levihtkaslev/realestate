import { Router } from "express";
import { prisma } from "../prisma";
import { makeSlug } from "../utils/slug";

const router = Router();

// with every locality, also send its city's id, name and slug
const withCity = { city: { select: { id: true, name: true, slug: true } } };



//================================================================================== POST locality  ==========================================================================

router.post("/", async (req, res) => {

  const { name, cityId } = req.body;

  if (!name || !cityId) {
    return res.status(400).json({ message: "name and cityId are required" });
  }

  const city = await prisma.city.findUnique({ where: { id: Number(cityId) } });
  if (!city || !city.isActive) {
    return res.status(400).json({ message: "invalid cityId" });
  }

  // same locality name is allowed in another city, but not twice in this city
  const slug = makeSlug(name);
  const existing = await prisma.locality.findUnique({
    where: { cityId_slug: { cityId: city.id, slug } },
  });
  if (existing) {
    return res.status(409).json({ message: "locality already exists in this city" });
  }

  const locality = await prisma.locality.create({
    data: { name: name.trim(), slug, cityId: city.id },
    include: withCity,
  });

  res.status(201).json(locality);
});





//================================================================================== LIST state  ==========================================================================
// LIST all localities    GET /api/localities(only active),    GET /api/localities?all=true(active + inactive, for admin)

router.get("/", async (req, res) => {

  const showAll = req.query.all === "true";

  const localities = await prisma.locality.findMany({
    where: showAll ? {} : { isActive: true },
    include: withCity,
    orderBy: { name: "asc" },
  });
  res.json(localities);

});




// LIST localities of one city  ->  GET /api/localities/by-city/5   (for the locality dropdown)


router.get("/by-city/:cityId", async (req, res) => {

  const cityId = Number(req.params.cityId);
  if (Number.isNaN(cityId)) {
    return res.status(400).json({ message: "invalid cityId" });
  }

  const localities = await prisma.locality.findMany({
    where: { cityId: cityId, isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(localities);

});




//================================================================================== get locality  ==========================================================================

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const locality = await prisma.locality.findUnique({ where: { id }, include: withCity });
  if (!locality) {
    return res.status(404).json({ message: "locality not found" });
  }
  res.json(locality);
});




//================================================================================== update locality  ==========================================================================

router.put("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const locality = await prisma.locality.findUnique({ where: { id } });
  if (!locality) {
    return res.status(404).json({ message: "locality not found" });
  }

  const { name, cityId, isActive } = req.body;
  const data: { name?: string; slug?: string; cityId?: number; isActive?: boolean } = {};

  if (cityId) {
    const city = await prisma.city.findUnique({ where: { id: Number(cityId) } });
    if (!city || !city.isActive) {
      return res.status(400).json({ message: "invalid cityId" });
    }
    data.cityId = city.id;
  }
  if (name) {
    data.name = name.trim();
    data.slug = makeSlug(name);
  }
  if (typeof isActive === "boolean") data.isActive = isActive;

  // after the change, would the same name exist twice in one city?
  if (data.slug || data.cityId) {
    const duplicate = await prisma.locality.findUnique({
      where: {
        cityId_slug: {
          cityId: data.cityId ?? locality.cityId,
          slug: data.slug ?? locality.slug,
        },
      },
    });
    if (duplicate && duplicate.id !== id) {
      return res.status(409).json({ message: "locality already exists in this city" });
    }
  }

  const updated = await prisma.locality.update({ where: { id }, data, include: withCity });
  res.json(updated);

});






//================================================================================== delete locality  ==========================================================================

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const locality = await prisma.locality.findUnique({ where: { id } });
  if (!locality) {
    return res.status(404).json({ message: "locality not found" });
  }

  const propertyCount = await prisma.property.count({ where: { localityId: id } });
  if (propertyCount > 0) {
    return res.status(409).json({
      message: `cannot delete: ${propertyCount} property(s) are in this locality. Deactivate it instead.`,
    });
  }

  await prisma.locality.delete({ where: { id } });
  res.json({ message: "locality deleted" });
});



export default router;
