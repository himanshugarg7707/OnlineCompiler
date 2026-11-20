# Separate backend and persistent workspace database

The frontend can stay on Vercel. Run the Express API as a separate service and
attach a managed PostgreSQL database to it. Workspace snapshots are stored in
PostgreSQL; large local workspaces are also persisted in the browser with
IndexedDB so refreshes do not need to reload a large JSON value from
`localStorage`.

## Run locally

1. Copy `.env.example` to `.env` and set a private `POSTGRES_PASSWORD` in the
   shell or `.env` file.
2. Start the API and database with `docker compose -f docker-compose.backend.yml up --build`.
3. Set `VITE_API_BASE_URL=http://localhost:5001` in the frontend environment if
   using a production build. Vite development already proxies `/api` to port
   5001.

The database uses a named Docker volume and survives container restarts.

## Deploy separately

Deploy `Dockerfile.backend` as a Node 22 container service and provision a
managed PostgreSQL database. Configure these backend environment variables:

- `DATABASE_URL`: the private connection URL supplied by the database host.
- `CORS_ORIGIN`: the exact Vercel site origin, such as
  `https://fullcode.example.com` (comma-separated if there are multiple sites).
- `PORT`: use the port provided by the hosting platform, or `5001` locally.
- `PGSSL=true` only if the database provider requires TLS and its connection URL
  does not configure TLS itself.

Set `VITE_API_BASE_URL` in Vercel to the public HTTPS URL of the backend, then
redeploy the frontend. Vite embeds this value at build time. Keep database
credentials on the backend; never put them in a `VITE_*` variable.

Check `https://<backend-host>/api/health`; `workspaceDatabase.connected` should
be `true`. When the frontend points at this backend, workspaces sync to
PostgreSQL automatically. Each browser profile gets its own client workspace
identity. The local IndexedDB copy remains available if the network is down.

The Vercel `/api` rewrite remains as a compatibility fallback for existing
compiler endpoints. Set `VITE_API_BASE_URL` to bypass Vercel Functions for API
requests, including large workspace snapshots.
