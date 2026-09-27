# Judge guide

## Fastest evaluation

1. Run `npm start`.
2. Open `http://localhost:3000`.
3. Select **Open live demo**.
4. Review **Claims & evidence** and **Neutrality ledger**.
5. Buyer offers ₹10,000.
6. Seller offers ₹8,000.
7. Accept as each party.
8. Open the memorandum.

No credentials or package installation are required for this path.

## What is real in the offline demo

- claim and evidence state machine;
- private-view filtering;
- alternating turns;
- transparent proposal calculation;
- fairness controls and bias pause;
- separate acceptance;
- memorandum generation;
- audit ledger.

## What activates with production credentials

- authenticated identities and database membership enforcement;
- permanent encrypted persistence;
- expiring email invitations;
- private evidence uploads;
- vision OCR;
- structured live-model options;
- electronic signature audit records;
- realtime synchronization;
- human mediator queue;
- jurisdiction-aware legal context.

## Test

```bash
npm test
```

The suite covers ten negotiation, privacy, encryption, signature, and jurisdiction invariants.

## Safety boundary

Settle supplies structured communication and legal information. It does not determine truth, authenticate evidence, compel settlement, provide legal representation, or guarantee enforceability.
