import { Router } from "express";
import { prisma } from "../prisma";
import { requireLogin, requireAdmin } from "../middlewares/auth";
import { makeSlug } from "../utils/slug";

const router = Router();



//================================================================================== POST amenity ==========================================================================
// POST /api/amenities     body: { "name": "Parking" }

router.post("/", requireLogin, requireAdmin, async (req, res) => {

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  const slug = makeSlug(name);

  const existing = await prisma.amenity.findUnique({ where: { slug: slug } });
  if (existing) {
    return res.status(409).json({ message: "amenity already exists" });
  }

  const amenity = await prisma.amenity.create({
    data: { name: name.trim(), slug: slug },
  });

  res.status(201).json(amenity);
});




//================================================================================== LIST amenities ==========================================================================
// GET /api/amenities            (only active, for checkboxes)
// GET /api/amenities?all=true   (active + inactive, for admin)

router.get("/", async (req, res) => {

  const showAll = req.query.all === "true";

  const amenities = await prisma.amenity.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });

  res.json(amenities);
});




//================================================================================== GET amenity ==========================================================================
// GET /api/amenities/1

router.get("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const amenity = await prisma.amenity.findUnique({ where: { id: id } });
  if (!amenity) {
    return res.status(404).json({ message: "amenity not found" });
  }

  res.json(amenity);
});




//================================================================================== UPDATE amenity ==========================================================================
// PUT /api/amenities/1     body: { "name"?: "Car Parking", "isActive"?: false }

router.put("/:id", requireLogin, requireAdmin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const amenity = await prisma.amenity.findUnique({ where: { id: id } });
  if (!amenity) {
    return res.status(404).json({ message: "amenity not found" });
  }

  const { name, isActive } = req.body;
  const data: { name?: string; slug?: string; isActive?: boolean } = {};

  if (name) {
    const slug = makeSlug(name);

    // another amenity already has this name?
    const sameName = await prisma.amenity.findUnique({ where: { slug: slug } });
    if (sameName && sameName.id !== id) {
      return res.status(409).json({ message: "amenity already exists" });
    }

    data.name = name.trim();
    data.slug = slug;
  }

  if (isActive === true || isActive === false) {
    data.isActive = isActive;
  }

  const updated = await prisma.amenity.update({ where: { id: id }, data: data });

  res.json(updated);
});




//================================================================================== DELETE amenity ==========================================================================
// DELETE /api/amenities/1

router.delete("/:id", requireLogin, requireAdmin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const amenity = await prisma.amenity.findUnique({ where: { id: id } });
  if (!amenity) {
    return res.status(404).json({ message: "amenity not found" });
  }

  const usedCount = await prisma.propertyAmenity.count({ where: { amenityId: id } });
  if (usedCount > 0) {
    return res.status(409).json({
      message: `cannot delete: ${usedCount} property(s) use this amenity. Deactivate it instead.`,
    });
  }

  await prisma.amenity.delete({ where: { id: id } });

  res.json({ message: "amenity deleted" });
});



export default router;
