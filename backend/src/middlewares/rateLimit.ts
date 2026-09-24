import { rateLimit } from "express-rate-limit";

// Rate limit = max number of requests from ONE IP address in a time window.
// Too many -> 429 "Too Many Requests". Counts are kept in memory (reset when the server restarts).



//================================================================================== ALL APIs ==========================================================================
// normal use is far below this; stops bots that hammer the server.
// kept high because the Next.js server (SSR pages) calls the API for many visitors from ONE IP

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000,              // 1000 requests per IP per 15 minutes
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "too many requests, please try again later" },
});



//================================================================================== LOGIN / REGISTER ==========================================================================
// stops password guessing (brute force) and mass fake accounts

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,                // 10 tries per IP per 15 minutes
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "too many login attempts, please try again after 15 minutes" },
});



//================================================================================== SEND ENQUIRY ==========================================================================
// extra layer on top of the "5 per hour per user" check inside the route:
// stops one computer spamming with many accounts

export const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,                // 20 enquiries per IP per hour
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "too many enquiries from this network, please try again later" },
});
