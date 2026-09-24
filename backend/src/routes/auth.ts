import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../prisma";
import { requireLogin } from "../middlewares/auth";
import { authLimiter } from "../middlewares/rateLimit";

const router = Router();

const ACCESS_TOKEN_LIFE = "15m";  // access token (key card): 15 minutes
const REFRESH_TOKEN_DAYS = 7;     // refresh token (booking slip): 7 days



//================================================================================== REGISTER ==========================================================================

router.post("/register", authLimiter, async (req, res) => {

  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: "password must be at least 6 characters" });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return res.status(409).json({ message: "email already registered" });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = await prisma.user.create({
    data: { name: String(name).trim(), email: cleanEmail, phone: phone, passwordHash: passwordHash },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
});




//================================================================================== LOGIN ==========================================================================

router.post("/login", authLimiter, async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (!user) {
    return res.status(401).json({ message: "invalid email or password" });
  }
  const passwordOk = await bcrypt.compare(String(password), user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ message: "invalid email or password" });
  }

  // access token: signed with our secret, carries userId + role, expires in 15 min
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: ACCESS_TOKEN_LIFE }
  );

  // refresh token : just a long random text. save only its hash (sha256) in the DB
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  //send
  res.json({
    accessToken: accessToken,
    refreshToken: refreshToken,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
});




//================================================================================== REFRESH ==========================================================================

router.post("/refresh", async (req, res) => {

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  //  hash it the same way as at login, then look for it in the DB
  const tokenHash = crypto.createHash("sha256").update(String(refreshToken)).digest("hex");
  const saved = await prisma.refreshToken.findUnique({ where: { tokenHash: tokenHash } });

  if (!saved) {
    return res.status(401).json({ message: "invalid refresh token, please login again" });
  }

  //  expired? remove it and ask to login again
  if (saved.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: saved.id } });
    return res.status(401).json({ message: "refresh token expired, please login again" });
  }

  //  read the user again (role may have changed, user may be deleted)
  const user = await prisma.user.findUnique({ where: { id: saved.userId } });
  if (!user) {
    return res.status(401).json({ message: "user not found, please login again" });
  }

  //  delete the old refresh token (it can be used only once)
  await prisma.refreshToken.delete({ where: { id: saved.id } });

  //  new access token
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: ACCESS_TOKEN_LIFE }
  );

  //  new refresh token (save its hash)
  const newRefreshToken = crypto.randomBytes(40).toString("hex");
  const newTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  res.json({
    accessToken: accessToken,
    refreshToken: newRefreshToken,
  });
});




//================================================================================== LOGOUT ==========================================================================

router.post("/logout", async (req, res) => {

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  const tokenHash = crypto.createHash("sha256").update(String(refreshToken)).digest("hex");

  // deleteMany: no error if it was already deleted (logout twice is fine)
  await prisma.refreshToken.deleteMany({ where: { tokenHash: tokenHash } });

  res.json({ message: "logged out" });
});




//================================================================================== ME ==========================================================================
// GET /api/auth/me      LOGIN REQUIRED  -> who am I? (frontend uses it after page reload)

router.get("/me", requireLogin, async (req, res) => {

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });

  if (!user) {
    return res.status(401).json({ message: "user not found, please login again" });
  }

  res.json(user);
});



export default router;
