// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import routes from "./routes"; 

// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use("/api", routes);
// app.use("/auth", routes);

// // 404 handler (optional but good practice)
// app.use((req, res, next) => {
//   res.status(404).json({ message: "Route not found" });
// });

// // Global error handler (optional)
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error(err.stack);
//   res.status(500).json({ message: "Something went wrong", error: err.message });
// });

// // Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import routes from "./routes";
import { apiHttpLogger } from "./middleware/apiHttpLogger";

dotenv.config();

const app = express();

// Middleware — permissive CORS for browser + mobile clients (Bearer auth; not cookie sessions)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Branch-Id',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86_400,
  })
);
// Large enough for base64 image uploads on `/api/upload/image-json` (~8MB file → ~11MB JSON).
app.use(express.json({ limit: "12mb" }));
app.use(apiHttpLogger);

// Serve static files from "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use("/api", routes);
app.use("/auth", routes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});

// Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
