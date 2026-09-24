import { Router } from "express";
import { prisma } from "../prisma";
import { requireLogin, requireAdmin } from "../middlewares/auth";

const router = Router();





//================================================================================== POST state  ==========================================================================

router.post("/", requireLogin, requireAdmin, async (req, res) => {

  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({ message: "name and code are required" });
  }

  const cleanName = String(name).trim();
  const cleanCode = String(code).trim().toUpperCase(); // exam "tn"   into this   "TN"

  if (!/^[A-Z]{2,5}$/.test(cleanCode)) {
    return res.status(400).json({ message: "code must be 2 to 5 letters, e.g. TN" });
  }

  // name or code already used?
  const existing = await prisma.state.findFirst({
    where: {
      OR: [{ name: { equals: cleanName, mode: "insensitive" } }, { code: cleanCode }],
    },
  });
  if (existing) {
    return res.status(409).json({ message: "state name or code already exists" });
  }

  const state = await prisma.state.create({ data: { name: cleanName, code: cleanCode } });
  res.status(201).json(state);

});




//================================================================================== LIST state  ==========================================================================
// LIST all cities    GET /api/states(only active),    GET /api/states?all=true(active + inactive, for admin)

router.get("/", async (req, res) => {

  const showAll = req.query.all === "true";

  const states = await prisma.state.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json(states);

});





//================================================================================== GET state  ==========================================================================

router.get("/:id", async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const state = await prisma.state.findUnique({ where: { id } });
  if (!state) {
    return res.status(404).json({ message: "state not found" });
  }
  res.json(state);

});





//================================================================================== update state  ==========================================================================

router.put("/:id", requireLogin, requireAdmin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const state = await prisma.state.findUnique({ where: { id } });
  if (!state) {
    return res.status(404).json({ message: "state not found" });
  }

  const { name, code, isActive } = req.body;
  const data: { name?: string; code?: string; isActive?: boolean } = {};

  if (name) data.name = String(name).trim();
  if (code) {
    data.code = String(code).trim().toUpperCase();
    if (!/^[A-Z]{2,5}$/.test(data.code)) {
      return res.status(400).json({ message: "code must be 2 to 5 letters, e.g. TN" });
    }
  }
  if (typeof isActive === "boolean") data.isActive = isActive;

  // another state already using this name or code?
  if (data.name || data.code) {
    const duplicate = await prisma.state.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(data.name ? [{ name: { equals: data.name, mode: "insensitive" as const } }] : []),
          ...(data.code ? [{ code: data.code }] : []),
        ],
      },
    });
    if (duplicate) {
      return res.status(409).json({ message: "state name or code already exists" });
    }
  }

  const updated = await prisma.state.update({ where: { id }, data });
  res.json(updated);

});






//================================================================================== delete state  ==========================================================================
// blocked while any city belongs to this state

router.delete("/:id", requireLogin, requireAdmin, async (req, res) => {

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const state = await prisma.state.findUnique({ where: { id } });
  if (!state) {
    return res.status(404).json({ message: "state not found" });
  }

  const cityCount = await prisma.city.count({ where: { stateId: id } });
  if (cityCount > 0) {
    return res.status(409).json({
      message: `cannot delete: ${cityCount} city(s) belong to this state. Deactivate it instead.`,
    });
  }

  await prisma.state.delete({ where: { id } });
  res.json({ message: "state deleted" });
});





export default router;
