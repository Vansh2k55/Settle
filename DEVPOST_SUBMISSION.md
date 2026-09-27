# Settle — AI mediation with inspectable neutrality

## One-line summary

Settle is a two-party AI mediation room that verifies disputed facts, protects private strategy, explains fair settlement options, and records voluntary agreements.

## Short description

Most legal AI advises one side. Settle sits between both sides. It gives each participant an equal turn, keeps unverified claims visibly separate from evidence, protects private negotiation limits, proposes transparent settlement options, and requires independent consent before generating a settlement memorandum.

## Inspiration

Everyday disputes often remain unresolved because formal legal processes are expensive and ordinary chatbots are designed to answer one user—not manage a fair process between two people. We wanted to explore a harder question: can AI help people negotiate without secretly becoming judge, lawyer, or pressure mechanism?

## What it does

Settle creates a shared mediation room for consumer refund disputes.

1. One participant opens a case and invites the other.
2. Each factual claim is labelled unverified, agreed, disputed, or evidence-supported.
3. Evidence can be securely uploaded and factual fields extracted with vision OCR.
4. The parties exchange offers in enforced alternating turns.
5. The AI sees only shared context and returns multiple structured, voluntary settlement options.
6. A Neutrality Ledger exposes shared actions and automated fairness checks.
7. Either party can flag bias and pause the process for human review.
8. Both parties must separately accept the same proposal.
9. Settle records auditable electronic consent and produces an editable settlement memorandum.

The prepared demonstration deliberately begins with conflicting information: the buyer claims that earphones cost ₹15,000 while the seller states ₹12,000. Settle refuses to treat either statement as truth. An invoice record supports ₹12,000, and that provenance remains visible throughout negotiation.

## Why it is different

- **Process, not just advice:** Settle actively structures negotiation between two parties.
- **Inspectable neutrality:** offers, concessions, claim status, sources, and fairness checks remain visible.
- **Privacy by architecture:** private strategy notes are removed at the server boundary before the other participant receives a room.
- **AI under deterministic control:** the model suggests language and settlement options; code controls privacy, turns, evidence status, consent, and signatures.
- **Human escalation:** bias flags and high-risk cases stop automation and enter a mediator review queue.

## How we built it

- Vanilla HTML, CSS, and JavaScript for a fast, accessible interface
- Dependency-free Node.js HTTP API
- Supabase Auth, PostgreSQL, Storage, Row Level Security, and Realtime publication
- OpenAI Responses API with strict structured outputs
- OpenAI vision inputs for evidence-field extraction
- Resend-compatible transactional email invitations
- AES-256-GCM envelope encryption for mediation payloads
- HMAC-SHA256 consent-integrity records
- Jurisdiction packs for India, California, and England/Wales
- Node's built-in test runner

## AI safety and governance

Settle applies several non-negotiable controls:

- A party's statement never becomes a verified fact merely because it was entered first.
- Private notes are never sent to the model or the other party.
- The browser cannot choose or impersonate its production party role; server-side membership determines access.
- The model cannot accept a settlement, sign for a participant, change claim status, or bypass turn order.
- Model output follows a strict schema and presents multiple options rather than a single imposed outcome.
- Evidence OCR extracts fields but never declares a document authentic.
- Threats, power imbalances, fraud concerns, minors, violence, and urgent deadlines are escalated.
- Either participant can flag bias and pause mediation.

## Challenges

The core challenge was neutrality. A fluent model can sound fair while relying on an unverified claim or leaking one party's private constraint. We therefore separated the generative layer from the governance layer. The model receives only shared facts, while deterministic code enforces privacy, provenance, turns, consent, and auditability.

The second challenge was evidence conflict. Instead of deciding who is lying, Settle maintains a claim–evidence matrix and keeps conflicting values unresolved until evidence supports a value or both parties agree.

## Accomplishments

- A complete two-party mediation workflow
- Evidence-aware fact reconciliation
- Inspectable neutrality and privacy boundaries
- Live structured AI options with deterministic safety controls
- Human review escalation
- Encrypted persistence and private uploads
- Mutual electronic consent and settlement memorandum generation
- Ten automated tests covering negotiation and security invariants

## What we learned

Responsible legal AI is less about producing confident answers and more about controlling what the system is allowed to assume and do. Neutrality becomes more credible when users can inspect the process, challenge it, and stop it.

## What's next

- Independent legal and security review
- More jurisdiction packs and dispute types
- Verified payment and merchant integrations
- Professional mediator partnerships
- Accessibility and multilingual testing
- Retention controls, key rotation, backups, and incident-response operations
- Evaluation datasets measuring proposal symmetry, private-data leakage, and disparate treatment

## Built with

Node.js, JavaScript, HTML, CSS, Supabase, PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime, OpenAI Responses API, vision OCR, Resend, AES-256-GCM, HMAC-SHA256.

## Transparency

AI tools were used during development. All privacy, negotiation, evidence, consent, and security behavior is explicitly implemented and documented in the repository. External production integrations require credentials; the built-in deterministic demo runs without them.

## Submission links

- Live application: **ADD DEPLOYED URL**
- Public repository: **ADD GITHUB URL**
- Demo video: **ADD YOUTUBE / LOOM URL**
