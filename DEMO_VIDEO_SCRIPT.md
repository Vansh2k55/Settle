# Settle three-minute demo script

## 0:00–0:20 — Problem

“Most legal AI advises one person. But disputes involve two people, conflicting facts, and a trust problem. Settle is an AI-assisted mediation room that helps both parties negotiate without turning the AI into a hidden judge.”

Show the landing page and select **Open live demo**.

## 0:20–0:50 — Conflicting facts

“The buyer claims defective earphones cost ₹15,000. The seller says ₹12,000. Settle does not assume the first claim is true.”

Open **Claims & evidence**. Show:

- the conflicting values;
- the disputed/evidence-supported status;
- the ₹12,000 invoice record;
- the warning that OCR does not authenticate documents.

## 0:50–1:15 — Privacy and governance

Open **My private notes**.

“Each party can record a private negotiation boundary. The privacy control is enforced by the API, not hidden with CSS. These notes never go to the other party or the AI model.”

Open **Neutrality ledger**.

“The ledger exposes equal-turn, disputed-fact, privacy, and coercion checks. Either party can flag bias and pause automation for human review.”

## 1:15–1:55 — Actual negotiation

Return to **Shared room**.

1. In Buyer view, offer ₹10,000.
2. Switch to Seller view and offer ₹8,000.
3. Show the transparent ₹9,000 midpoint proposal.

“The model can generate multiple context-aware options when configured, but deterministic code controls turns, privacy, fact status, and consent. The proposal explains its calculation and never presents a disputed claim as verified.”

## 1:55–2:25 — Mutual consent

Accept from Seller view, switch to Buyer view, and accept again.

“One acceptance is insufficient. Both parties must voluntarily accept the same version. In production mode, each consent produces a tamper-evident signature audit record.”

Open the settlement memorandum.

## 2:25–2:50 — Production architecture

Briefly show the capability bar or architecture diagram.

“Settle includes Supabase authentication, encrypted persistence, private evidence storage, realtime updates, email invitations, vision OCR, structured OpenAI mediation, human review, jurisdiction packs, and auditable consent.”

## 2:50–3:00 — Close

“Settle does not replace lawyers or courts. It creates something missing between informal arguments and formal proceedings: a transparent, voluntary path toward common ground.”
