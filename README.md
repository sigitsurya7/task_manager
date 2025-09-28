# Next.js & HeroUI Template

This is a template for creating applications using Next.js 14 (app directory) and HeroUI (v2).

[Try it on CodeSandbox](https://githubbox.com/heroui-inc/heroui/next-app-template)

## Technologies Used

- [Next.js 14](https://nextjs.org/docs/getting-started)
- [HeroUI v2](https://heroui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Tailwind Variants](https://tailwind-variants.org)
- [TypeScript](https://www.typescriptlang.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [next-themes](https://github.com/pacocoursey/next-themes)

## How to Use

### Backend setup (Prisma + MySQL)

1) Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.

2) Install packages:
```bash
npm install
```

3) Generate client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4) Seed admin user and sample workspace:
```bash
npm run prisma:seed
```

The default admin is `username: lysca`, `password: juni1996!`.

### Run the development server

```bash
npm run dev
```

## License

Licensed under the [MIT license](https://github.com/heroui-inc/next-app-template/blob/main/LICENSE).
