# UniUnlocker Mobile Solution

A neon-themed portfolio website with an admin dashboard. Projects, services, server statuses and site content are all managed from `/admin` and stored in MongoDB, so changes never need a redeploy.

Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, MongoDB with Mongoose, JWT sessions (`jose`), bcryptjs, Zod, Framer Motion and Lucide icons.

## Run locally

You need Node.js 20.9+ and a MongoDB database, either local or on [MongoDB Atlas](https://www.mongodb.com/atlas).

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run seed                 # creates the admin account and starter content
npm run dev
```

The site runs at http://localhost:3000 and the admin panel at http://localhost:3000/admin.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string, including the database name |
| `JWT_SECRET` | Yes | Signs admin sessions. At least 32 characters |
| `ADMIN_EMAIL` | For seeding | Email for the admin account |
| `ADMIN_PASSWORD` | For seeding | Password for the admin account. At least 12 characters |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Public URL, used for SEO tags and the sitemap |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | For uploads | Storage for images uploaded in the admin panel |
| `PEXELS_API_KEY` | No | Adds a Pexels photo picker to the admin image fields |

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Only `NEXT_PUBLIC_SITE_URL` reaches the browser. Everything else stays on the server.

## MongoDB setup

**Local:** install MongoDB Community and use `mongodb://127.0.0.1:27017/uniunlocker`.

**Atlas:**

1. Create a cluster and a database user.
2. Under Network Access, allow your host's IP addresses. Serverless hosts without fixed IPs need `0.0.0.0/0`, so use a strong database password.
3. Copy the connection string and add the database name, for example `...mongodb.net/uniunlocker`.

## Admin account

There is no public registration. The account comes from the seed script:

```bash
npm run seed                  # creates the admin if it does not exist
npm run seed -- --reset-admin # resets the password to ADMIN_PASSWORD and signs out all sessions
```

Seeding is safe to repeat. It never overwrites an existing admin or content, and only fills collections that are empty. Remove `ADMIN_PASSWORD` from your environment once the account exists.

## Deploy to production

Any host that runs Next.js with a Node server works. For Vercel:

1. Push the repository and import it into Vercel.
2. Add the environment variables above.
3. Deploy. The build does not need database access.
4. Seed once from your own machine, with the production `MONGODB_URI`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in `.env.local` or your shell: `npm run seed`.

To self-host, run `npm run build && npm start` behind an HTTPS reverse proxy. Keep in mind:

- **HTTPS is required.** The session cookie is `Secure` in production, so sign-in fails over plain HTTP.
- **The proxy must set `X-Real-IP` or `X-Forwarded-For`,** because rate limiting uses it to identify visitors. Without either, all visitors share one limit.

## How updates reach the public site

- Public pages read MongoDB on each request and stream each section in behind a skeleton, so admin changes appear on the next page load. Nothing needs revalidating.
- The Server Status section also refreshes itself every 20 seconds, so a page that is already open updates on its own.
- Draft projects, disabled services and disabled servers are filtered out on the server.
- If the database is unreachable, the site stays up, showing default text and empty states rather than an error page.

## Security

- Passwords are hashed with bcrypt. Sessions are signed JWTs in `HttpOnly`, `SameSite=Strict` cookies, and are checked against the database on every admin request.
- Every admin API route verifies the session itself. `src/proxy.ts` only redirects signed-out visitors early.
- Login and the contact form are rate limited through MongoDB, so limits hold across server instances. The contact form also has a spam honeypot.
- All input is validated with Zod. Link fields accept only `http` and `https` URLs. Uploads are identified from the file's contents and limited to 5 MB.

## Theme

All colors are CSS variables at the top of `src/app/globals.css`. Change a value there and the whole site follows. The admin panel has its own set of variables.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and run for production |
| `npm run lint` / `npm run typecheck` | Check code quality and types |
| `npm test` | Run unit tests |
| `npm run seed` | Create the admin account and starter content |

## Project structure

```
scripts/seed.ts            Admin account and starter content
public/brands/             Placeholder brand badges for the default servers
src/
  proxy.ts                 Early redirect for signed-out admin visitors
  app/
    (public)/              Home page, /portfolio/[slug], /privacy, /terms
    admin/login/           Sign-in page
    admin/(panel)/         dashboard, projects, servers, services, about, messages, settings
    api/                   auth, projects, servers, services, about, settings, messages, upload, pexels
    globals.css            Theme variables and shared styles
  components/
    layout/                Navbar, footer, logo
    sections/              Public page sections
    admin/                 Admin screens and form controls
    ui/                    Shared pieces: image with fallback, skeletons, toasts, dialogs
  hooks/use-resource.ts    Admin data loading
  lib/                     Database, auth, validation, rate limiting, Cloudinary, Pexels, data access
  models/                  Mongoose models
  types/                   Shared TypeScript types
  utils/                   Formatting and slugs
```
