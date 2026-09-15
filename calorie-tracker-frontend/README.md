# NutriMetric frontend

Next.js 14 UI for the calorie tracker. In the Compose stack the browser talks to
this app on loopback port 3010. Same-origin `/api/*` calls are rewritten to the
API gateway.

## Run with the rest of the stack

The frontend image is built and published by the backend Compose file, which is
the supported way to run the app:

```bash
cd ../calorie-tracker-backend
cp .env.example .env   # replace every change-me value
docker compose up --build -d
```

Then open:

- App: [http://127.0.0.1:3010](http://127.0.0.1:3010)
- API gateway: [http://127.0.0.1:9080](http://127.0.0.1:9080)

Compose sets `API_GATEWAY_URL=http://api-gateway:9080` so the Next.js rewrite
reaches the gateway on the Docker `edge` network. Only those two loopback ports
are published; Postgres, RabbitMQ, and the Java services are not.

## `/api` rewrite

`next.config.mjs` rewrites `/api/:path*` to `${API_GATEWAY_URL}/api/:path*`.
The browser never calls the gateway origin directly. Auth uses the JWT stored
after login; chat meal logging sends an `Idempotency-Key` header.

## Host `next dev` against a running gateway

If the gateway is already published at `127.0.0.1:9080`:

```bash
cp .env.example .env
npm ci
npm run dev
```

`.env.example` sets `API_GATEWAY_URL=http://localhost:9080`. Next.js then
listens on port 3000 on the host. That is optional local UI work; the Compose
frontend stays on **3010**.

## Assumptions

Stack topology, secrets, volumes, and assignment assumptions are documented in
[`../calorie-tracker-backend/README.md`](../calorie-tracker-backend/README.md).
