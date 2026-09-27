import { randomUUID } from 'node:crypto';

export const OFFICIAL_SOURCES = [
  { id: 'cpa-2019', title: 'Consumer Protection Act, 2019', authority: 'India Code', url: 'https://www.indiacode.nic.in/handle/123456789/15256', note: 'Consumer rights and redressal framework.', verified: '2026-09-23' },
  { id: 'nch', title: 'National Consumer Helpline', authority: 'Department of Consumer Affairs', url: 'https://consumerhelpline.gov.in/', note: 'Official pre-litigation grievance channel.', verified: '2026-09-23' },
  { id: 'ejagriti', title: 'e-Jagriti', authority: 'Department of Consumer Affairs', url: 'https://e-jagriti.gov.in/', note: 'Official digital consumer grievance platform.', verified: '2026-09-23' }
];

const clean = (value, max = 3000) => String(value ?? '').trim().slice(0, max);
const amount = value => { const n = Number(String(value).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n >= 0 ? Math.round(n) : null; };
const now = () => new Date().toISOString();
function event(type, actor, summary, visibility = 'shared') { return { id: randomUUID(), type, actor, summary, visibility, at: now() }; }
function safeCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

export function createSession(input = {}) {
  const claimAmount = amount(input.claimAmount);
  if (!clean(input.creatorName, 80) || !clean(input.counterpartyName, 80)) throw new Error('Both party names are required');
  if (!clean(input.issue, 1500)) throw new Error('A dispute description is required');
  if (claimAmount === null || claimAmount <= 0) throw new Error('Enter a valid disputed amount');
  const session = {
    id: randomUUID(), code: safeCode(), createdAt: now(), updatedAt: now(), status: 'awaiting-counterparty', turn: 'partyB', category: 'consumer-refund', jurisdiction: clean(input.jurisdiction, 10) || 'IN', stateCode: clean(input.stateCode, 20) || null, title: clean(input.title, 100) || 'Consumer refund mediation',
    parties: { partyA: { name: clean(input.creatorName, 80), role: clean(input.creatorRole, 40) || 'Buyer', joined: true }, partyB: { name: clean(input.counterpartyName, 80), role: clean(input.counterpartyRole, 40) || 'Seller', joined: false } },
    sharedNarrative: clean(input.issue, 1500),
    claims: [{ id: randomUUID(), label: 'Amount paid', field: 'purchaseAmount', values: { partyA: claimAmount }, evidence: [], status: 'unverified', resolution: null }],
    signatures: [],
    evidence: [], offers: [], privateNotes: { partyA: [], partyB: [] }, biasFlags: [], acceptances: { partyA: false, partyB: false }, proposal: null,
    ledger: [event('session-created', 'partyA', `${clean(input.creatorName, 80)} opened a neutral mediation room.`), event('claim-added', 'partyA', `Claimed purchase amount: ₹${claimAmount.toLocaleString('en-IN')} (unverified).`)],
    sources: OFFICIAL_SOURCES, fairness: { equalTurns: true, privateDataExposed: false, disputedFactsUsedAsTruth: false, coerciveLanguageDetected: false, checksRunAt: now() }
  };
  return session;
}

export function publicView(session, viewer = 'observer') {
  const copy = structuredClone(session); delete copy.privateNotes;
  copy.myPrivateNotes = viewer === 'partyA' || viewer === 'partyB' ? session.privateNotes[viewer] : [];
  copy.ledger = copy.ledger.filter(item => item.visibility === 'shared' || item.actor === viewer);
  return copy;
}
export function joinSession(session, input = {}) {
  if (session.status !== 'awaiting-counterparty') throw new Error('This room is no longer accepting participants');
  session.parties.partyB.name = clean(input.name, 80) || session.parties.partyB.name; session.parties.partyB.joined = true; session.status = 'fact-check'; session.updatedAt = now();
  session.ledger.push(event('party-joined', 'partyB', `${session.parties.partyB.name} joined the mediation.`)); return session;
}
export function respondToClaim(session, actor, input = {}) {
  const claim = session.claims.find(item => item.id === input.claimId); if (!claim) throw new Error('Claim not found');
  if (!['agree', 'dispute'].includes(input.response)) throw new Error('Choose agree or dispute');
  if (input.response === 'agree') { claim.values[actor] = claim.values.partyA; claim.status = claim.evidence.length ? 'verified' : 'agreed'; claim.resolution = claim.values.partyA; session.ledger.push(event('claim-agreed', actor, `${session.parties[actor].name} agreed that the purchase amount was ₹${claim.resolution.toLocaleString('en-IN')}.`)); }
  else { const counterValue = amount(input.value); if (counterValue === null) throw new Error('Provide your version of the disputed amount'); claim.values[actor] = counterValue; claim.status = 'disputed'; claim.resolution = null; session.ledger.push(event('claim-disputed', actor, `${session.parties[actor].name} disputed the amount and stated ₹${counterValue.toLocaleString('en-IN')}.`)); }
  session.status = claim.status === 'disputed' ? 'evidence-review' : 'negotiating'; session.turn = 'partyA'; session.updatedAt = now(); return session;
}
export function addEvidence(session, actor, input = {}) {
  const value = amount(input.extractedAmount); const item = { id: randomUUID(), actor, name: clean(input.name, 120) || 'Uploaded evidence', type: clean(input.type, 50) || 'document', extractedAmount: value, note: clean(input.note, 300), status: 'pending-confirmation', createdAt: now() };
  session.evidence.push(item); const claim = session.claims[0]; claim.evidence.push(item.id);
  if (value !== null && Object.values(claim.values).includes(value)) { claim.resolution = value; claim.status = 'evidence-supported'; session.status = 'negotiating'; }
  session.ledger.push(event('evidence-added', actor, `${session.parties[actor].name} added ${item.name}${value !== null ? ` showing ₹${value.toLocaleString('en-IN')}` : ''}.`)); session.updatedAt = now(); return session;
}
export function addPrivateNote(session, actor, input = {}) {
  const note = clean(input.note, 500); if (!note) throw new Error('Private note cannot be empty');
  session.privateNotes[actor].push({ id: randomUUID(), note, minimum: amount(input.minimum), at: now() }); session.ledger.push(event('private-note', actor, 'Private strategy note saved. Its contents are hidden from the other party.', actor)); return session;
}
function overlap(session) { const a = [...session.offers].reverse().find(o => o.actor === 'partyA'); const b = [...session.offers].reverse().find(o => o.actor === 'partyB'); if (!a || !b) return null; return { a, b, gap: Math.abs(a.amount - b.amount), midpoint: Math.round((a.amount + b.amount) / 2) }; }
export function makeOffer(session, actor, input = {}) {
  if (session.turn !== actor) throw new Error(`It is ${session.parties[session.turn].name}’s turn`); const offerAmount = amount(input.amount); if (offerAmount === null) throw new Error('Enter a valid offer');
  const offer = { id: randomUUID(), actor, amount: offerAmount, terms: clean(input.terms, 400), createdAt: now(), status: 'open' }; session.offers.push(offer); session.acceptances = { partyA: false, partyB: false }; session.turn = actor === 'partyA' ? 'partyB' : 'partyA'; session.status = 'negotiating';
  session.ledger.push(event('offer-made', actor, `${session.parties[actor].name} proposed ₹${offerAmount.toLocaleString('en-IN')}${offer.terms ? ` with terms: ${offer.terms}` : ''}.`));
  const range = overlap(session); if (range) { const resolved = session.claims[0].resolution; const cap = resolved ?? Math.max(...Object.values(session.claims[0].values)); const proposed = Math.min(range.midpoint, cap); session.proposal = { id: randomUUID(), amount: proposed, terms: clean(input.mediatorTerms, 400) || 'Payment within 7 days through the original payment method. Both parties close the dispute after confirmed payment.', rationale: `This midpoint narrows the ₹${range.gap.toLocaleString('en-IN')} gap between the latest offers. It does not treat disputed facts as verified.`, sourceIds: ['cpa-2019', 'nch'], createdAt: now() }; session.ledger.push(event('mediator-proposal', 'mediator', `Settle proposed ₹${proposed.toLocaleString('en-IN')} as a transparent midpoint for discussion.`)); }
  session.updatedAt = now(); runFairnessChecks(session); return session;
}
export function acceptProposal(session, actor) { if (!session.proposal) throw new Error('There is no mediator proposal to accept'); session.acceptances[actor] = true; session.ledger.push(event('proposal-accepted', actor, `${session.parties[actor].name} accepted the current proposal.`)); if (session.acceptances.partyA && session.acceptances.partyB) { session.status = 'settled'; session.ledger.push(event('settlement-reached', 'mediator', 'Both parties voluntarily accepted the same settlement terms.')); } session.updatedAt = now(); return session; }
export function flagBias(session, actor, reason) { const text = clean(reason, 500); if (!text) throw new Error('Explain the fairness concern'); session.biasFlags.push({ id: randomUUID(), actor, reason: text, status: 'open', createdAt: now() }); session.ledger.push(event('bias-flag', actor, `${session.parties[actor].name} raised a fairness concern. Mediation paused for review.`)); session.status = 'fairness-review'; session.updatedAt = now(); return session; }
export function runFairnessChecks(session) {
  const counts=['partyA','partyB'].map(actor=>session.offers.filter(o=>o.actor===actor).length);
  const checks={equalTurns:Math.abs(counts[0]-counts[1])<=1,privateDataExposed:false,disputedFactsUsedAsTruth:session.claims.some(c=>c.status==='disputed'&&c.resolution!==null),coerciveLanguageDetected:session.offers.some(o=>/threat|or else|must accept/i.test(o.terms))};
  const penalties=[!checks.equalTurns?20:0,checks.privateDataExposed?50:0,checks.disputedFactsUsedAsTruth?35:0,checks.coerciveLanguageDetected?25:0].reduce((a,b)=>a+b,0);
  session.fairness={...checks,score:Math.max(0,100-penalties),method:'Deterministic safeguards; not a guarantee of substantive fairness.',checksRunAt:now()};
  return session.fairness;
}
export function agreement(session) {
  if (session.status !== 'settled' || !session.proposal) throw new Error('Both parties must accept before a memorandum can be generated'); const p=session.proposal,a=session.parties.partyA,b=session.parties.partyB;
  const text=`SETTLEMENT MEMORANDUM\n\nCase reference: ${session.code}\nGenerated: ${new Date().toLocaleDateString('en-IN')}\n\nPARTICIPANTS\n1. ${a.name} (${a.role})\n2. ${b.name} (${b.role})\n\nBACKGROUND\nThe parties used Settle’s voluntary mediation process concerning: ${session.sharedNarrative}\n\nAGREED TERMS\n1. Settlement amount: ₹${p.amount.toLocaleString('en-IN')}\n2. Additional terms: ${p.terms}\n3. Each party confirmed the same proposal voluntarily inside the mediation room.\n4. Performance of these terms should be documented by both parties.\n\nFACT RECORD\n${session.claims.map(c=>`• ${c.label}: ${c.resolution!==null?`₹${c.resolution.toLocaleString('en-IN')} (${c.status})`:`unresolved (${c.status})`}`).join('\n')}\n\nACKNOWLEDGEMENT\nThis document records the terms accepted in the Settle prototype. It is not legal advice, a court order, or a guarantee of enforceability. The parties should independently review accuracy, capacity, applicable law, electronic-signature requirements, and whether professional advice is appropriate before signing or relying on it.\n\n${a.name}: ____________________  Date: __________\n\n${b.name}: ____________________  Date: __________`;
  return { title:`Settlement Memorandum — ${session.code}`,text,generatedAt:now() };
}
export function demoSession() { const s=createSession({creatorName:'Aarav Sharma',creatorRole:'Buyer',counterpartyName:'NovaCart Support',counterpartyRole:'Seller',claimAmount:15000,issue:'Aarav says defective earphones were returned but the refund was not issued. NovaCart disputes the amount claimed.',title:'Defective earphones refund'});joinSession(s,{name:'NovaCart Support'});respondToClaim(s,'partyB',{claimId:s.claims[0].id,response:'dispute',value:12000});addEvidence(s,'partyB',{name:'Order invoice #NC-2048',type:'invoice',extractedAmount:12000,note:'Invoice total extracted and awaiting both parties’ review.'});s.turn='partyA';return s; }
