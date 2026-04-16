This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Git remoto

Origen configurado: `https://github.com/rodrigopozodev/gravelinas-sport.git`.

Si el remoto ya tiene commits (por ejemplo rama `desarrollo`), el primer push puede ser:

- `git fetch origin` y luego `git pull origin desarrollo --allow-unrelated-histories` para fusionar historiales distintos, resolver conflictos y subir; o
- sustituir el historial del remoto con cuidado (`git push --force-with-lease`), solo si es intencionado.

Copia variables desde `.env.example`; la base SQLite local va en `data/` (ignorada por git).

## API Riot

Configura `RIOT_API_KEY`. Equipo: edita `config/team.json` (5 miembros, slots 1–5).

- `GET /api/team` — lectura con caché (TTL vía env).
- `POST /api/team/sync` — fuerza refresco; si existe `SYNC_SECRET`, envía header `x-sync-secret`.
