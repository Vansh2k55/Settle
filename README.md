# Settle

**A neutral, production-capable AI-assisted mediation room for everyday consumer disputes.**

Settle sits between two disputing parties instead of advising only one. It separates claims from verified facts, protects private strategy notes, enforces alternating offers, explains settlement proposals, provides visible fairness checks, and records mutual acceptance in an editable settlement memorandum.

Built for LexHack 2026 across Legal Automation, Access to Justice, and AI Safety & Governance.

## Submission kit

- `DEVPOST_SUBMISSION.md` — paste-ready project description
- `DEMO_VIDEO_SCRIPT.md` — timed three-minute walkthrough
- `JUDGE_GUIDE.md` — fastest evaluator path and feature transparency
- `SUBMISSION_CHECKLIST.md` — final upload checklist
- `DEPLOYMENT.md` — production activation instructions
- `ARCHITECTURE.md` — privacy and security boundaries

## What works

- Create a consumer-refund mediation room with two named parties
- Switch between buyer and seller views for an end-to-end demonstration
- Label facts as unverified, agreed, disputed, or evidence-supported
- Record evidence-derived values without claiming documents are authentic
- Store private limits behind a viewer-specific API boundary
- Enforce turn-based offers
- Produce a transparent midpoint proposal after both parties make offers
- Explain which values and sources inform the proposal
- Run visible fairness checks
- Allow either party to flag bias and pause mediation
- Require separate acceptance from both parties
- Generate an editable settlement memorandum only after mutual acceptance
- Maintain a timestamped neutrality ledger

## Production integrations

Version 2 adds:

- Supabase email/password authentication and invitation acceptance
- PostgreSQL persistence with row-level-security policies
- Private evidence uploads through Supabase Storage
- OpenAI vision OCR with structured extraction
- OpenAI Responses API mediation with strict output schemas
- Server-sent room synchronization and Supabase Realtime publication
- Cryptographically auditable electronic consent records
- AES-256-GCM encrypted mediation payloads
- Resend-compatible email invitation delivery
- Human mediator review queue and resolution API
- Jurisdiction packs for India, California, and England/Wales

The credential-free demo still works when external services are absent. A capability bar inside the room reports which production integrations are active.

## Run

Requires Node.js 20 or newer. There are no mandatory Node packages; production services are accessed through HTTPS APIs.

```bash
npm start
```

Open `http://localhost:3000`, then choose **Open live demo**.

## Recommended demo flow

1. Open the live demo. The buyer claimed ₹15,000; the seller stated ₹12,000.
2. Open **Claims & evidence**. Show that neither claim was silently treated as truth and that the invoice record supports ₹12,000.
3. Open **My private notes** as the buyer. Save a private negotiation limit.
4. Return to **Shared room** and offer ₹10,000.
5. Switch to **Seller view** and offer ₹8,000.
6. Explain the ₹9,000 midpoint and its rationale.
7. Accept separately as the seller and buyer.
8. Generate the settlement memorandum.
9. Open the **Neutrality ledger** and show the fairness checks and complete shared audit trail.

## Tests

```bash
npm test
```

The test suite verifies:

- unilateral claims remain unverified;
- private strategy does not leak to the other viewer;
- conflicting amounts remain unresolved until evidence supports a value;
- turns alternate;
- proposals show transparent midpoint reasoning;
- both parties must accept independently;
- bias flags pause mediation.

## Architecture

```text
Browser client
├── party-specific room view
├── claims and evidence matrix
├── offer composer
└── neutrality ledger
          │
          ▼
Dependency-free Node API
├── encrypted Supabase persistence with memory fallback
├── viewer-specific privacy filter
├── deterministic mediation engine
├── fairness checks
├── OpenAI structured mediation and OCR
├── invitations, signatures, and human review
└── memorandum generator
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/demo` | Create the prepared demo case |
| POST | `/api/sessions` | Create a mediation |
| GET | `/api/sessions/:id?viewer=partyA` | Retrieve a privacy-filtered room |
| POST | `/api/sessions/:id/claims/respond` | Agree with or dispute a claim |
| POST | `/api/sessions/:id/evidence` | Add an evidence record |
| POST | `/api/sessions/:id/private-note` | Save viewer-private strategy |
| POST | `/api/sessions/:id/offers` | Make a turn-controlled offer |
| POST | `/api/sessions/:id/accept` | Accept the current proposal |
| POST | `/api/sessions/:id/flag-bias` | Pause and flag a fairness concern |
| POST | `/api/sessions/:id/agreement` | Generate the accepted memorandum |
| POST | `/api/sessions/:id/invite` | Send an expiring email invitation |
| POST | `/api/sessions/:id/upload` | Store and OCR evidence |
| POST | `/api/sessions/:id/ai-proposal` | Generate structured neutral options |
| POST | `/api/sessions/:id/sign` | Record electronic consent |
| POST | `/api/sessions/:id/human-review` | Queue professional review |
| GET | `/api/sessions/:id/events` | Stream realtime updates |
| POST | `/api/invitations/accept` | Accept a verified invitation |
| GET | `/api/mediator/reviews` | Retrieve the mediator queue |

## Prototype boundaries

Settle is a legal-information and structured-communication prototype—not a lawyer, court, arbitrator, fraud detector, or guarantee of enforceability.

- It does not automatically authenticate uploaded documents.
- It does not decide which party is truthful.
- It does not expose private notes to the other participant.
- It does not generate a memorandum until both parties accept identical terms.
- It does not call the memorandum legally binding.
- Production credentials activate authentication, encrypted persistence, uploads, OCR, live AI, email, signatures, realtime updates, legal source packs, and review escalation. A real launch still requires malware scanning, independent security and legal review, retention policies, and staffed mediator operations.

## Deployment

`render.yaml` is included. See `DEPLOYMENT.md` for configuration and `ARCHITECTURE.md` for security boundaries.

## License

MIT
