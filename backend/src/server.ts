import "dotenv/config";
import express from "express";
import cors from "cors";

import bookingsRoutes from "./routes/bookings.routes";
import complexesRoutes from "./routes/complexes.routes";
import adminRoutes from "./routes/admin.routes";
import { connectDatabase } from "./database";

const app = express();

app.use(cors());
app.use(express.json());

app.use(bookingsRoutes);
app.use(complexesRoutes);
app.use(adminRoutes);
async function startServer() {
  await connectDatabase();

  app.listen(3333, () => {
    console.log("Backend rodando em http://localhost:3333");
  });
}

startServer().catch((error) => {
  console.error("Erro ao iniciar backend:", error);
  process.exit(1);
});
