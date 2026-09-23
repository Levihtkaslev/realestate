import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";

const router = Router();

// columns we send back to the client (never send passwordHash)
const userSelect = {
  id: true, name: true, email: true, phone: true, role: true, createdAt: true, updatedAt: true,
};

// CREATE user  
router.post("/", async (req, res) => {
  const { name, email, phone, password } = req.body;

  // basic validation (we will replace this with Zod later)
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "password must be at least 6 characters" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "email already registered" });
  }

  // turn "mypassword" into a one-way hash like "$2b$10$Xk..."
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash },
    select: userSelect,
  });

  res.status(201).json(user);
});

// LIST users  
router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { id: "asc" },
  });
  res.json(users);
});

// GET one user  
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  res.json(user);
});

// UPDATE user  ->  PUT /api/users/5
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  const { name, phone, password } = req.body;

  // only change the fields that were sent; email is not editable
  const data: { name?: string; phone?: string; passwordHash?: string } = {};
  if (name) data.name = name;
  if (phone) data.phone = phone;
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" });
    }
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const updated = await prisma.user.update({ where: { id }, data, select: userSelect });
  res.json(updated);
});

// DELETE user  ->  DELETE /api/users/5
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  await prisma.user.delete({ where: { id } });
  res.json({ message: "user deleted" });
});

export default router;
