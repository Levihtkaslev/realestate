import "dotenv/config"; // loads values from .env into process.env
import express from "express";
import userRoutes from "./routes/user";
import cityRoutes from "./routes/city";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// every URL starting with /api/users goes to routes/user.ts
app.use("/api/users", userRoutes);
app.use("/api/cities", cityRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get("/", (req, res) => {
  res.json({ message: "Real estate API is running" });
});