import "dotenv/config";

import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";

const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017";
const databaseName = process.env.MONGODB_DATABASE || "jogajunto";

const courts = [
  {
    slug: "campo-society-premium",
    name: "Campo Society Premium",
    type: "Futebol 7",
    surface: "Grama sintética",
    location: "Zona Norte, Porto Alegre",
    priceInCents: 32000,
    players: 14,
    highlight: "Mais reservado",
    description: "Campo society coberto, iluminação profissional e vestiários.",
    imageUrl:
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=80",
    times: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    isActive: true,
  },
  {
    slug: "volei-areia-arena-zona-norte",
    name: "Quadra de Vôlei de Areia",
    type: "Vôlei de areia",
    surface: "Areia",
    location: "Zona Norte, Porto Alegre",
    priceInCents: 18000,
    players: 8,
    highlight: "Nova",
    description: "Quadra de areia para vôlei e beach tennis.",
    imageUrl:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80",
    times: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
    isActive: true,
  },
];

async function main() {
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();

    const database = client.db(databaseName);
    const collection = database.collection("courts");

    for (const court of courts) {
      const now = new Date();

      await collection.updateOne(
        { slug: court.slug },
        {
          $set: {
            ...court,
            updatedAt: now,
          },
          $setOnInsert: {
            id: randomUUID(),
            createdAt: now,
          },
          $unset: {
            timesJson: "",
          },
        },
        { upsert: true },
      );
    }

    console.log(`${courts.length} quadras cadastradas com sucesso.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Erro ao cadastrar quadras:", error);
  process.exit(1);
});
