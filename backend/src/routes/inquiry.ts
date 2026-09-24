import { Router } from "express";
import { prisma } from "../prisma";
import { requireLogin } from "../middlewares/auth";
import { inquiryLimiter } from "../middlewares/rateLimit";

const router = Router();

const MAX_PER_HOUR = 5; // spam limit: one user can send max 5 enquiries in 1 hour



//================================================================================== POST inquiry ==========================================================================

// POST /api/inquiries     LOGIN REQUIRED     body: { "propertyId": 10, "message": "Is this still available?" }

router.post("/", inquiryLimiter, requireLogin, async (req, res) => {

  const { propertyId, message } = req.body;

  // the person asking = the logged-in user (from the token)
  const userId = req.user.userId;

  if (!propertyId || !message) {
    return res.status(400).json({ message: "propertyId and message are required" });
  }

  // 2. message length
  const text = String(message).trim();
  if (text.length < 10 || text.length > 500) {
    return res.status(400).json({ message: "message must be 10 to 500 characters" });
  }

  // 3. the user of the token must still exist
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(401).json({ message: "user not found, please login again" });
  }

  // 4. property must exist and be visible
  const property = await prisma.property.findUnique({ where: { id: Number(propertyId) } });
  if (!property) {
    return res.status(404).json({ message: "property not found" });
  }
  if (property.status !== "ACTIVE") {
    return res.status(400).json({ message: "this property is not available" });
  }

  // 5. cannot enquire your own property
  if (property.ownerId === user.id) {
    return res.status(400).json({ message: "you cannot enquire your own property" });
  }

  // 6. DUPLICATE: already enquired this property?
  const existing = await prisma.inquiry.findUnique({
    where: { propertyId_userId: { propertyId: property.id, userId: user.id } },
  });
  if (existing) {
    return res.status(409).json({ message: "you already sent an enquiry for this property" });
  }

  // 7. SPAM: too many enquiries in the last 1 hour?
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sentLastHour = await prisma.inquiry.count({
    where: { userId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (sentLastHour >= MAX_PER_HOUR) {
    return res.status(429).json({ message: `too many enquiries. max ${MAX_PER_HOUR} per hour, try again later` });
  }

  // 8. save
  const inquiry = await prisma.inquiry.create({
    data: { propertyId: property.id, userId: user.id, message: text },
  });

  res.status(201).json(inquiry);
});




//================================================================================== LIST received (owner) ==========================================================================

// GET /api/inquiries/received     LOGIN REQUIRED  -> enquiries on MY properties

router.get("/received", requireLogin, async (req, res) => {

  // 1. find the ids of my properties
  const myProperties = await prisma.property.findMany({
    where: { ownerId: req.user.userId },
    select: { id: true },
  });

  const myPropertyIds = [];
  for (const p of myProperties) {
    myPropertyIds.push(p.id);
  }

  // 2. find the enquiries on those properties
  const inquiries = await prisma.inquiry.findMany({
    where: { propertyId: { in: myPropertyIds } },
    include: {
      property: { select: { id: true, title: true, slug: true } },
      user: { select: { id: true, name: true, email: true, phone: true } }, // who asked -> owner can call back
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(inquiries);
});




//================================================================================== LIST sent (buyer) ==========================================================================
// GET /api/inquiries/sent     LOGIN REQUIRED  -> enquiries I sent

router.get("/sent", requireLogin, async (req, res) => {

  const inquiries = await prisma.inquiry.findMany({
    where: { userId: req.user.userId },
    include: {
      property: { select: { id: true, title: true, slug: true, price: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(inquiries);
});



export default router;
