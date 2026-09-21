import "dotenv/config";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import { connectDatabase, getCollections, type AdminUser } from "../database";

function getArgument(name: string) {
  const prefix = `--${name}=`;

  const argument = process.argv.find((item) => item.startsWith(prefix));

  return argument?.slice(prefix.length).trim();
}

async function main() {
  await connectDatabase();

  const name = getArgument("name");
  const email = getArgument("email")?.toLowerCase();
  const phone = getArgument("phone");
  const password = getArgument("password");
  const complexId = getArgument("complexId");

  if (!name || name.length < 2) {
    throw new Error(
      'Informe o nome com o argumento --name="Nome do administrador".',
    );
  }

  if (!email || !email.includes("@")) {
    throw new Error('Informe um e-mail válido com --email="admin@email.com".');
  }

  if (!phone || phone.length < 8) {
    throw new Error('Informe o telefone com --phone="51999999999".');
  }

  if (!password || password.length < 6) {
    throw new Error(
      'Informe uma senha com pelo menos 6 caracteres usando --password="senha".',
    );
  }

  if (!complexId) {
    throw new Error(
      'Informe o ID do complexo usando --complexId="id-do-complexo".',
    );
  }

  const { adminUsers, complexes } = await getCollections();

  const complex = await complexes.findOne({
    id: complexId,
  });

  if (!complex) {
    throw new Error(`Não foi encontrado um complexo com o ID "${complexId}".`);
  }

  const existingAdmin = await adminUsers.findOne({
    email,
  });

  if (existingAdmin) {
    throw new Error(`Já existe um administrador com o e-mail "${email}".`);
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 10);

  const adminUser: AdminUser = {
    id: randomUUID(),
    name,
    phone,
    email,
    passwordHash,

    role: "COMPLEX_ADMIN",
    complexId: complex.id,

    isActive: true,

    createdAt: now,
    updatedAt: now,
  };

  await adminUsers.insertOne(adminUser);

  console.log("");
  console.log("Administrador criado com sucesso.");
  console.log("--------------------------------");
  console.log(`ID: ${adminUser.id}`);
  console.log(`Nome: ${adminUser.name}`);
  console.log(`E-mail: ${adminUser.email}`);
  console.log(`Complexo: ${complex.name}`);
  console.log(`Complex ID: ${adminUser.complexId}`);
  console.log(`Perfil: ${adminUser.role}`);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("Erro ao criar administrador:");
  console.error(error instanceof Error ? error.message : error);
  console.error("");

  process.exit(1);
});
