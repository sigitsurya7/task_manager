/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = "lysca";
  const email = "lysca@example.com";
  const password = "juni1996!";

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = existing ?? (await prisma.user.create({ data: { username, email, passwordHash, name: "Admin" } }));
  if (!existing) console.log("Created admin user 'lysca'");

  const ws = await prisma.workspace.upsert({
    where: { slug: "webdesign" },
    create: {
      name: "Web Design",
      slug: "webdesign",
      iconKey: "FiZap",
      createdById: user.id,
      members: { create: { userId: user.id, role: "ADMIN" } },
      projects: {
        create: {
          name: "Mobile App",
          boards: {
            create: {
              name: "Web Design Board",
              isDefault: true,
              columns: {
                create: [
                  { title: "To Do", accent: "bg-danger", position: 1 },
                  { title: "In Progress", accent: "bg-warning", position: 2 },
                  { title: "On Review", accent: "bg-secondary", position: 3 },
                  { title: "Revision", accent: "bg-warning-300", position: 4 },
                  { title: "Complete", accent: "bg-success", position: 5 },
                  { title: "Pending", accent: "bg-default-400", position: 6 },
                ],
              },
            },
          },
        },
      },
    },
    update: {},
  });

  // ensure password hash in case existing user had placeholder
  if (existing && existing.passwordHash !== passwordHash) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

