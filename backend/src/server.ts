import "dotenv/config";
import express from "express";
import cors from "cors";

import bookingsRoutes from "./routes/bookings.routes";
import complexesRoutes from "./routes/complexes.routes";
import adminRoutes from "./routes/admin.routes";
import adminLeisureAreasRoutes from "./routes/admin-leisure-areas.routes";
import adminFinanceRoutes from "./routes/admin-finance.routes";
import { connectDatabase } from "./database";

const app = express();

/*
 * FRONTEND_URL pode conter uma ou mais origens autorizadas,
 * separadas por vírgula (landing, player e admin rodam em
 * origens diferentes). Sem a variável, libera qualquer
 * origem (comportamento atual em desenvolvimento).
 */
const allowedOrigins = process.env.FRONTEND_URL?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins && allowedOrigins.length > 0
      ? {
          origin: allowedOrigins,
        }
      : undefined,
  ),
);
app.use(express.json());

app.use(bookingsRoutes);
app.use(complexesRoutes);
app.use(adminRoutes);
app.use(adminLeisureAreasRoutes);
app.use(adminFinanceRoutes);

/*
 * A porta precisa vir de process.env.PORT: é assim que
 * plataformas como Railway, Render, Fly.io e Heroku
 * atribuem a porta em produção.
 */
const PORT = Number(process.env.PORT) || 3333;

async function startServer() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Erro ao iniciar backend:", error);
  process.exit(1);
});
