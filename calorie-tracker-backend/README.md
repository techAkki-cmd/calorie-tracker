# Backend configuration

Build and test with Java 21: `mvn clean test`.

Gateway and identity require `JWT_SECRET` (at least 32 bytes for HMAC).
Gateway, core, and AI require the same nonblank `INTERNAL_API_KEY`.
AI additionally requires `GEMINI_API_KEY`. Supply secrets through your
deployment secret store or process environment; never commit them.

Downstream services default to the `dev` profile, which binds to 127.0.0.1.
Use an explicit production profile for deployments. Core and AI authenticate
`X-Internal-Secret` before accepting forwarded user IDs. The gateway replaces
that header, including on public authentication routes. AI also supplies it
when calling core. Keep internal services on private networks and use encrypted
transport if traffic crosses hosts; this shared key is a bearer credential.

## Docker networking

Compose publishes no PostgreSQL, RabbitMQ, or management-console ports.
Both services join the internal `backend` network. This deliberately removes
host access through the old 9432/9672 ports. Application containers must join
that Compose network (normally `calorie-tracker-backend_backend`) and use:

- `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/calorie_tracker`
- `SPRING_RABBITMQ_HOST=rabbitmq`
- `SPRING_RABBITMQ_PORT=5672`
- An explicit deployment profile and `SERVER_ADDRESS=0.0.0.0` inside containers.

The current Compose file provisions infrastructure only; it does not launch
application containers. For host JVM development, provide separately reachable
local PostgreSQL/RabbitMQ instances and override the connection settings.
Configure container gateway routes and `CORE_SERVICE_BASE_URL` to service DNS
names rather than localhost. AI needs an additional egress-capable network to
reach Gemini.

## PDF delivery and replay

Core and AI must share a persistent `PDF_IMPORT_DIR` supporting file locks and
atomic renames. A per-upload lock serializes snapshot creation. Failed processing
throws to RabbitMQ; `default-requeue-rejected=false` routes rejects through
`pdf.upload.dlx` (routing key `pdf.upload.failed`) to durable `pdf.upload.dlq`.
Both services declare identical topology.

Existing queues cannot have declaration arguments changed in place. Before
rollout, stop publishers/consumers, drain or export the old queue, then recreate
it with the new DLX arguments and restore any saved messages. Do not delete a
nonempty queue. This change does not migrate your running broker automatically.

Core removes unpublished files on failure. AI retains failed PDFs and writes
an immutable validated extraction snapshot before posting meals. Successful
processing removes the PDF but retains the snapshot and lock file. Redelivery
reuses the snapshot and the same meal keys, including after a database commit
followed by a consumer crash. Fix the underlying failure, then republish the
original DLQ body to the main queue; never construct a new upload ID for replay.
Retain snapshots/failed PDFs for your supported replay window and purge them
only after associated jobs are resolved. Broker publisher confirms and an
outbox remain separate delivery guarantees not introduced by this change.

## Idempotency and timestamps

AI-generated meal keys are SHA-256 hashes scoped to the user and source:
PDF upload reference plus row position, or chat request ID. This deliberately
avoids wall-clock processing time and model-generated names, which can change
on retries. Duplicate keys are ignored atomically by PostgreSQL, scoped to
`(user_id, idempotency_key)`; the first committed values win. Ordinary manual
meals can omit the key. Two identical meals in different uploads remain separate.

Chat callers must send a UUID `Idempotency-Key` header and reuse it for retries
of the same operation; use a new UUID for a new meal. A chat validation error is
returned as HTTP 502, since HTTP chat has no RabbitMQ message to dead-letter.
Invalid PDF extraction throws and reaches the DLQ. All diary rows must be valid;
invalid rows are never silently dropped.

`consumedAt` is now an ISO instant/offset timestamp, e.g.
`2025-01-01T19:00:00Z`. Offset-free legacy API timestamps are no longer accepted.
Gemini must return `consumedAtISO` with historical times preserved; date-only
entries use midnight UTC and absent timezone context defaults to UTC. Undated
PDF entries fail validation instead of being assigned today's date. Relative
chat dates use the UTC reference time supplied to the model.

Daily listing and weekly summaries use UTC calendar days, not the host timezone.
User-local calendar summaries would require an explicit timezone parameter.
Before starting this version against existing data, stop writers, back up the
database, and apply `migrations/001_food_entry_utc_idempotency.sql` with the
**actual legacy timezone**. Hibernate cannot infer that timezone. Do not apply
this legacy migration to a freshly generated or already migrated schema.

## Verification

Run `mvn test` under Java 21. The PostgreSQL persistence test is opt-in via
`TEST_POSTGRES_URL` and requires a disposable database with username `postgres`
and password `test-only`; it recreates the schema. It checks concurrent retries,
user-scoped keys, persistence, and UTC aggregation. Never point it at user data.
The opt-in broker test uses `TEST_RABBIT_PORT` on localhost against a disposable
RabbitMQ instance with default guest credentials to verify actual DLQ routing.

Gemini and AI-to-core calls retain their 15-second per-call limits and chat its
500-character limit. Rebuild/restart services after the migration and broker
rollout; existing processes are not changed by editing this repository.
