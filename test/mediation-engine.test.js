import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, publicView, joinSession, respondToClaim, addPrivateNote, addEvidence, makeOffer, acceptProposal, agreement, flagBias } from '../src/mediation-engine.js';

const input = { creatorName: 'Buyer', counterpartyName: 'Seller', claimAmount: 15000, issue: 'Defective earphones were returned but no refund arrived.' };

test('unilateral claim begins unverified', () => {
  const s = createSession(input);
  assert.equal(s.claims[0].status, 'unverified');
  assert.equal(s.claims[0].resolution, null);
});

test('private notes are isolated by viewer', () => {
  const s = createSession(input);
  addPrivateNote(s, 'partyA', { note: 'Will accept 9000', minimum: 9000 });
  assert.equal(publicView(s, 'partyB').myPrivateNotes.length, 0);
  assert.equal(publicView(s, 'partyA').myPrivateNotes.length, 1);
  assert.ok(!('privateNotes' in publicView(s, 'partyA')));
});

test('conflicting claim stays unresolved until evidence supports a value', () => {
  const s = createSession(input); joinSession(s, {});
  respondToClaim(s, 'partyB', { claimId: s.claims[0].id, response: 'dispute', value: 12000 });
  assert.equal(s.claims[0].resolution, null);
  addEvidence(s, 'partyB', { name: 'Invoice', extractedAmount: 12000 });
  assert.equal(s.claims[0].resolution, 12000);
  assert.equal(s.claims[0].status, 'evidence-supported');
});

test('alternating offers generate a transparent midpoint proposal', () => {
  const s = createSession(input); joinSession(s, {});
  respondToClaim(s, 'partyB', { claimId: s.claims[0].id, response: 'agree' });
  makeOffer(s, 'partyA', { amount: 10000 });
  assert.throws(() => makeOffer(s, 'partyA', { amount: 9000 }), /turn/);
  makeOffer(s, 'partyB', { amount: 8000 });
  assert.equal(s.proposal.amount, 9000);
  assert.match(s.proposal.rationale, /midpoint/);
  assert.equal(s.fairness.score, 100);
});

test('memorandum requires separate acceptance by both parties', () => {
  const s = createSession(input); joinSession(s, {});
  respondToClaim(s, 'partyB', { claimId: s.claims[0].id, response: 'agree' });
  makeOffer(s, 'partyA', { amount: 10000 }); makeOffer(s, 'partyB', { amount: 8000 });
  acceptProposal(s, 'partyA');
  assert.throws(() => agreement(s), /Both parties/);
  acceptProposal(s, 'partyB');
  assert.equal(s.status, 'settled');
  assert.match(agreement(s).text, /₹9,000/);
});

test('bias flag pauses mediation', () => {
  const s = createSession(input);
  flagBias(s, 'partyA', 'Proposal explanation seems asymmetric');
  assert.equal(s.status, 'fairness-review');
  assert.equal(s.biasFlags.length, 1);
});
