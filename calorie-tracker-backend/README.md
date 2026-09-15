# Calorie Tracker stack

The Compose project runs PostgreSQL, RabbitMQ, four Spring Boot services, and
the Next.js frontend as one isolated stack. PostgreSQL, RabbitMQ, identity,
core, and AI have no host-published ports. Only these loopback endpoints are
published:

- Frontend: `http://127.0.0.1:3010`
- API gateway: `http://127.0.0.1:9080`

AI has a separate egress network for Gemini. Core and AI share the persistent
`pdf-import-data` volume for queued PDF files. Application containers run as a
non-root user with a read-only root filesystem.

## Configuration

Copy the sanitized template and replace every `change-me` value:

```bash
cp .env.example .env
```

Use independent, high-entropy values for `JWT_SECRET` and `INTERNAL_API_KEY`.
`JWT_SECRET` must contain at least 32 bytes. The `.env` file and service-local
`.env` files are ignored by Git and excluded from Docker build contexts.

For an existing PostgreSQL volume, keep the database username, password, and
database name that initialized that volume. Changing the Compose variables does
not retroactively change credentials stored inside PostgreSQL or RabbitMQ.

## Run the complete application

```bash
docker compose up --build -d
docker compose ps
```

Stop containers without deleting data:

```bash
docker compose down
```

PostgreSQL, RabbitMQ, and PDF import state live in named Docker volumes and
survive container restarts, recreation, and `docker compose down`. Do not run
`docker compose down -v` unless you intentionally want to delete that data.

Create a PostgreSQL backup before infrastructure changes:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > calorie-tracker.sql
```

## Local JVM development

The downstream services use their `dev` profiles and bind to `127.0.0.1`.
Because the production Compose topology intentionally does not publish database
or broker ports, host-launched Java services need separately reachable local
infrastructure plus explicit `DB_*`, `RABBITMQ_*`, service URL, and secret
environment variables. Do not point a container at `localhost` for another
container; Compose uses `postgres`, `rabbitmq`, `identity-service`,
`core-service`, and `ai-service` DNS names internally.

## Delivery guarantees

PDF imports create a database job and an outbox event in one transaction. The
scheduled outbox publisher sends with RabbitMQ publisher confirms. Failed PDF
messages route to the durable dead-letter queue, and AI reports completed or
failed status back to core. The shared PDF and auxiliary files are cleaned after
processing.

## Build verification

The container build compiles all production Java sources without modifying or
running the test suite, and performs a Next.js production build:

```bash
docker compose build
```

Run project tests separately when desired with Java 21:

```bash
mvn test
```

## Assumptions

- Only the frontend (`127.0.0.1:3010`) and API gateway (`127.0.0.1:9080`) are
  published. Postgres, RabbitMQ, identity, core, and AI stay on internal Docker
  networks.
- A real `GEMINI_API_KEY` is required for chat, photo extraction, and PDF text
  extraction. Image-only PDF scans are not supported.
- Weekly analytics cover the last 7 days, including today. Chat weekly recaps
  use that report plus meals in the same UTC window.
- The nutrition assistant can log a meal, recap today or the last 7 days, check
  or update daily goals (after confirming the values), and answer general
  nutrition questions. PDF import, photo extract, and weight logging stay in
  the dashboard UI.
- Meal logging through chat reuses the same idempotency key on retry so a
  double-submit does not create a second entry.
