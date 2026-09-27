# Production setup

## 1. Supabase

Create a Supabase project and run `supabase/migrations/001_production.sql` in its SQL editor. Copy the project URL, anonymous key, and service-role key into the server environment.

Enable email/password authentication. Configure the production site URL and allowed redirect URLs. Never expose the service-role key in browser code.

## 2. OpenAI

Create a restricted server-side API key and set `OPENAI_API_KEY`. The integration uses the Responses API with strict structured outputs for mediation and vision input for evidence extraction. Set `OPENAI_MODEL` to a model available to the project.

## 3. Invitations

Create a verified sending domain with Resend or a compatible account. Set `RESEND_API_KEY`, `EMAIL_FROM`, and the public `APP_URL`.

## 4. Encryption and signatures

Generate independent secrets:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Use the first value for `DATA_ENCRYPTION_KEY` and the second for `SIGNING_SECRET`. Store both in the hosting provider's secret manager. Rotating the encryption key requires a planned data migration.

## 5. Deploy

Deploy with the included `render.yaml` or any Node 20+ host. Run:

```bash
npm test
npm start
```

Check `/api/health`. Every required production capability should report `true` before accepting real cases.

## 6. Human mediators

Give approved reviewer accounts `user_metadata.role = mediator` through an administrative workflow. Reviewers can retrieve the queue from `GET /api/mediator/reviews` and resolve an item through `POST /api/mediator/reviews/resolve`.

## Important

Electronic signature laws and settlement enforceability vary. The signature implementation supplies consent and integrity evidence; it does not itself guarantee legal enforceability or replace qualified jurisdictional advice.
