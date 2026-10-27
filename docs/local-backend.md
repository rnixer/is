# Backend on Windows without Docker

PostgreSQL runs directly on Windows from `.local/pgsql`. Its database is in
`.local/postgres-data`; both are private and ignored by Git. Do not delete this
directory: it contains your working database, including accounts and orders.
Public uploads remain in `apps/cms/public/uploads`.

Start the backend from the repository root:

```powershell
npm.cmd run backend
```

This starts local PostgreSQL if needed, then Strapi. Admin:
http://127.0.0.1:1337/admin

Stop Strapi with Ctrl+C. Stop PostgreSQL separately when needed:

```powershell
npm.cmd run db:down
```

For the Vercel frontend to access this computer, keep ngrok running too:

```powershell
ngrok http http://127.0.0.1:1337 --url casual-probably-dingo.ngrok-free.app
```

Strapi still needs `PORT=1337` and PostgreSQL `DATABASE_PORT=5432` in
`apps/cms/.env`. Empty PORT values are invalid. Docker is no longer needed for
normal local startup. The old Docker volume is retained as a migration fallback;
do not start its database while native PostgreSQL uses port 5432.

On another computer, install PostgreSQL 17 using the official Windows downloads
and restore a database backup; `.local` is deliberately not distributed via Git.
Back up the database with pg_dump and back up uploads separately. A copy of the
live database folder alone is not a reliable database backup.
