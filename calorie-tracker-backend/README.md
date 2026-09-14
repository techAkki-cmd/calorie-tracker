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

## PDF file ownership

Core and AI must share `PDF_IMPORT_DIR`. Core deletes partial/unpublished files
in a finally block when saving or publishing fails. Once queued, the consumer
owns the file and deletes it in finally after processing, including failures.
Deleting it immediately after publishing is unsafe because the message contains
only a file reference, not the PDF bytes.

This bounds retention for completed attempts, not abandoned jobs after a process
crash. Durable job tracking, broker confirms, idempotency, and a retention
reconciler remain necessary for crash-safe import delivery. Existing failure
acknowledgement behavior is retained.

Gemini and AI-to-core blocking calls have a 15-second limit per call. Chat input
is limited to 500 characters. Changes take effect after services are rebuilt
and restarted; updating Compose does not reconfigure already running containers.
