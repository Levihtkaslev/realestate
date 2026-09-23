import "dotenv/config"; // loads values from .env into process.env
import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import userRoutes from "./routes/user";
import stateRoutes from "./routes/state";
import cityRoutes from "./routes/city";
import localityRoutes from "./routes/locality";
import propertyTypeRoutes from "./routes/propertyType";
import amenityRoutes from "./routes/amenity";
import propertyRoutes from "./routes/property";
import propertyImageRoutes from "./routes/propertyImage";
import { INVALID_TYPE_MESSAGE } from "./utils/upload";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// images are open in the browser: http://localhost:5000/uploads/properties/<file>.jpg
app.use("/uploads", express.static("uploads"));

// every URL starting with /api/users goes to routes/user.ts
app.use("/api/users", userRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/localities", localityRoutes);
app.use("/api/property-types", propertyTypeRoutes);
app.use("/api/amenities", amenityRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/property-images", propertyImageRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Real estate API is running" });
});

// error handler: must be AFTER all routes. Express sends any thrown error here.
// (a bigger version comes in step 9)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {

  // upload errors: file too big, too many files ...
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  // wrong file type (from our fileFilter)
  if (err.message === INVALID_TYPE_MESSAGE) {
    return res.status(400).json({ message: err.message });
  }

  // anything else = bug on our side
  console.error(err);
  res.status(500).json({ message: "something went wrong" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
