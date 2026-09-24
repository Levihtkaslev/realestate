import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./docs/swagger";
import userRoutes from "./routes/user";
import stateRoutes from "./routes/state";
import cityRoutes from "./routes/city";
import localityRoutes from "./routes/locality";
import propertyTypeRoutes from "./routes/propertyType";
import amenityRoutes from "./routes/amenity";
import propertyRoutes from "./routes/property";
import propertyImageRoutes from "./routes/propertyImage";
import inquiryRoutes from "./routes/inquiry";
import authRoutes from "./routes/auth";
import { generalLimiter } from "./middlewares/rateLimit";
import { notFound, errorHandler } from "./middlewares/error";

// check first secret
if (!process.env.JWT_ACCESS_SECRET) {
  console.error("JWT_ACCESS_SECRET is missing in .env (see .env.example)");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// API documentation page: http://localhost:5000/api-docs   (raw JSON: /api-docs.json)
// placed BEFORE helmet: helmet's strict browser rules would block the page's own scripts on http
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerDocument);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// cors: allow ONLY our frontend website to call this API from the browser
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));

app.use(express.json());

// rate limit for every /api call (login and enquiry have stricter limits in their routes)
app.use("/api", generalLimiter);


// =============================================================every URL starting with /api/users goes to routes/user.ts==========================================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/localities", localityRoutes);
app.use("/api/property-types", propertyTypeRoutes);
app.use("/api/amenities", amenityRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/property-images", propertyImageRoutes);
app.use("/api/inquiries", inquiryRoutes);

app.use("/uploads", express.static("uploads")); // images are open template : http://localhost:5000/uploads/properties/<..file...>.jpg

app.get("/", (req, res) => {
  res.json({ message: "Real estate API is running" });
});


//===================================================== 404 + error handler: must be AFTER all routes =============================================

app.use(notFound);       // no route matched -> 404
app.use(errorHandler);   // any thrown error  -> clean { message } answer

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
