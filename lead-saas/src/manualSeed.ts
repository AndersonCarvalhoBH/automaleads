// src/manualSeed.ts
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@demo.com";
  const plainPassword = "123456";

  console.log("Iniciando seed de conta + usuário admin...");

  // 1. Criar conta, se não existir
  let account = await prisma.account.findFirst({
    where: { name: "Conta Demo" },
  });

  if (!account) {
    account = await prisma.account.create({
      data: {
        name: "Conta Demo",
      },
    });
    console.log("Conta criada com id:", account.id);
  } else {
    console.log("Conta já existe com id:", account.id);
  }

  // 2. Criar usuário admin, se não existir
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    user = await prisma.user.create({
      data: {
        name: "Admin Demo",
        email,
        password: hashedPassword,
        role: "admin",
        accountId: account.id,
      },
    });

    console.log("Usuário admin criado com id:", user.id);
  } else {
    console.log("Usuário já existe com este e-mail:", email);
  }

  console.log("Seed concluído.");
  console.log("Use estas credenciais para login:");
  console.log("Email:", email);
  console.log("Senha:", plainPassword);
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
