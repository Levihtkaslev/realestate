import { Router } from "express";
import { prisma } from "../prisma";
import { requireLogin, requireAdmin } from "../middlewares/auth";
import { makeSlug } from "../utils/slug";

const router = Router();



//================================================================================== POST property type ==========================================================================
// POST /api/property-types     body: { "name": "Apartment" }

router.post("/", requireLogin, requireAdmin, async (req, res) => {

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  const slug = makeSlug(name);

  const existing = await prisma.propertyType.findUnique({ where: { slug: slug } });
  if (existing) {
    return res.status(409).json({ message: "property type already exists" });
  }

  const propertyType = await prisma.propertyType.create({
    data: { name: name.trim(), slug: slug },
  });

  res.status(201).json(propertyType);
});




//================================================================================== LIST property types ==========================================================================
// GET /api/property-types            (only active, for dropdown)
// GET /api/property-types?all=true   (active + inactive, for admin)

router.get("/", async (req, res) => {

  const showAll = req.query.all === "true";

  const propertyTypes = await prisma.propertyType.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });

  res.json(propertyTypes);
});




//================================================================================== GET property type ==========================================================================
// GET /api/property-types/1

router.get("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const propertyType = await prisma.propertyType.findUnique({ where: { id: id } });
  if (!propertyType) {
    return res.status(404).json({ message: "property type not found" });
  }

  res.json(propertyType);
});




//================================================================================== UPDATE property type ==========================================================================
// PUT /api/property-types/1     body: { "name"?: "Flat", "isActive"?: false }

router.put("/:id", requireLogin, requireAdmin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const propertyType = await prisma.propertyType.findUnique({ where: { id: id } });
  if (!propertyType) {
    return res.status(404).json({ message: "property type not found" });
  }

  const { name, isActive } = req.body;
  const data: { name?: string; slug?: string; isActive?: boolean } = {};

  if (name) {
    const slug = makeSlug(name);

    // another property type already has this name?
    const sameName = await prisma.propertyType.findUnique({ where: { slug: slug } });
    if (sameName && sameName.id !== id) {
      return res.status(409).json({ message: "property type already exists" });
    }

    data.name = name.trim();
    data.slug = slug;
  }

  if (isActive === true || isActive === false) {
    data.isActive = isActive;
  }

  const updated = await prisma.propertyType.update({ where: { id: id }, data: data });

  res.json(updated);
});




//================================================================================== DELETE property type ==========================================================================
// DELETE /api/property-types/1

router.delete("/:id", requireLogin, requireAdmin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const propertyType = await prisma.propertyType.findUnique({ where: { id: id } });
  if (!propertyType) {
    return res.status(404).json({ message: "property type not found" });
  }

  const propertyCount = await prisma.property.count({ where: { propertyTypeId: id } });
  if (propertyCount > 0) {
    return res.status(409).json({
      message: `cannot delete: ${propertyCount} property(s) use this type. Deactivate it instead.`,
    });
  }

  await prisma.propertyType.delete({ where: { id: id } });

  res.json({ message: "property type deleted" });
});



export default router;
