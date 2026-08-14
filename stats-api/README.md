# hand-outs-stats-api

Tiny Render service for Hand-Outs usage stats.

It should use the same Upstash Redis database as `flodlol.dev`; set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Render to the same values.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `POST` | `/visit` | Increment Hand-Outs views |
| `POST` | `/event` | Increment a project event. Body: `{ "event": "handout-generated" }` |
| `GET` | `/stats` | `{ project, visits: { total, uniqueToday, since }, events: { handoutsGenerated } }` |

## Local

```bash
cd stats-api
cp .env.example .env
npm install
npm run dev
```
