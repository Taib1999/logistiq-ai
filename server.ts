import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";

import { seedUsers } from "./src/services/db.service";
import { initSocketIO } from "./src/services/socket.service";

import authRoutes from "./src/routes/auth.routes";
import userRoutes from "./src/routes/user.routes";
import deliveryRoutes from "./src/routes/delivery.routes";
import logisticsRoutes from "./src/routes/logistics.routes";

import { errorHandler } from "./src/middleware/error.middleware";

dotenv.config();

async function main() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Run SQLite auto-seeding (await ensures users exist before server starts)
  await seedUsers();

  // API routes registrations
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/logistics", logisticsRoutes);
  app.use("/api", deliveryRoutes); // handles /plans/active, /deliveries/:id, /geocode, /scanner/ocr

  // Global central error handler middleware
  app.use(errorHandler);

  // Vite middleware configuration for developer setup
  const httpServer = createServer(app);
  
  // Register Socket.io orchestration
  const io = initSocketIO(httpServer);
  app.set("io", io);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve client-side router index
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`LogistiQ AI clean-architecture dev/prod server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
