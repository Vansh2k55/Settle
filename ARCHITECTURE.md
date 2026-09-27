# Settle production architecture

## Trust boundaries

1. The browser holds only the signed-in user's access token and the privacy-filtered room view.
2. The Node service validates the Supabase access token and owns all privileged credentials.
3. Private notes are removed before any response is sent to the other participant.
4. The database stores the mediation payload inside an AES-256-GCM envelope.
5. Evidence lives in a private storage bucket protected by membership policies.
6. OpenAI receives shared mediation context only. Private strategy notes are never included.
7. Signature records bind user, proposal, consent wording, timestamp, and hashed request metadata.

## Production flow

```text
Browser
  ├── Supabase email/password identity through Settle API
  ├── server-sent realtime room updates
  └── private evidence upload
          │
          ▼
Node service
  ├── JWT validation through Supabase Auth
  ├── deterministic privacy and consent controls
  ├── OpenAI Responses structured mediation
  ├── OpenAI vision evidence extraction
  ├── Resend invitation delivery
  └── AES-GCM / HMAC audit services
          │
          ▼
Supabase
  ├── PostgreSQL + RLS
  ├── private Storage bucket
  ├── Realtime publication
  └── human review and signature records
```

## Security properties

- Service-role, OpenAI, email, encryption, and signing secrets never enter browser code.
- Evidence types and sizes are allow-listed.
- Invitation tokens are random and stored as SHA-256 hashes.
- Model calls use structured outputs and `store: false`.
- Deterministic code—not the model—controls privacy, turns, claim status, acceptance, and signatures.
- Evidence extraction explicitly avoids authenticity conclusions.
- Human review is mandatory when a participant flags bias; AI analysis can recommend review for high-risk conditions.

## Remaining production operations

Before processing real disputes, arrange an independent security assessment, privacy impact assessment, retention policy, incident-response plan, backup and restore testing, jurisdictional legal review, and a staffed mediator escalation service.
