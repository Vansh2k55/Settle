import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const env = process.env;
const jsonHeaders = { 'Content-Type': 'application/json' };

export const capabilities = () => ({
  database: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  authentication: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  storage: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  realtime: Boolean(env.SUPABASE_URL),
  email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  llm: Boolean(env.OPENAI_API_KEY),
  ocr: Boolean(env.OPENAI_API_KEY),
  encryption: Boolean(env.DATA_ENCRYPTION_KEY),
  signatures: Boolean(env.SIGNING_SECRET)
});

async function checkedFetch(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  let data; try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) throw new Error(data?.message || data?.error?.message || data?.error || `External service returned ${response.status}`);
  return data;
}

function supabaseHeaders(extra = {}) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, ...jsonHeaders, ...extra };
}

export async function authenticate(request) {
  if (!capabilities().authentication) return { id: 'demo-user', email: 'demo@settle.local', role: 'participant', demo: true };
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  return checkedFetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
}

export async function signUp(email, password, name) {
  if (!capabilities().authentication) throw new Error('Supabase authentication is not configured');
  return checkedFetch(`${env.SUPABASE_URL}/auth/v1/signup`, { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, ...jsonHeaders }, body: JSON.stringify({ email, password, data: { name } }) });
}

export async function signIn(email, password) {
  if (!capabilities().authentication) throw new Error('Supabase authentication is not configured');
  return checkedFetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, ...jsonHeaders }, body: JSON.stringify({ email, password }) });
}

export async function persistSession(session) {
  if (!capabilities().database) return { persisted: false, mode: 'memory' };
  const record = { id: session.id, code: session.code, title: session.title, category: session.category, status: session.status, jurisdiction: session.jurisdiction || 'IN', state_code: session.stateCode || null, data: encryptObject(session), updated_at: new Date().toISOString() };
  await checkedFetch(`${env.SUPABASE_URL}/rest/v1/mediation_sessions?on_conflict=id`, { method: 'POST', headers: supabaseHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(record) });
  if (session.ownerId && session.ownerId !== 'demo-user') {
    await checkedFetch(`${env.SUPABASE_URL}/rest/v1/session_members?on_conflict=session_id,user_id`, { method:'POST', headers:supabaseHeaders({Prefer:'resolution=ignore-duplicates,return=minimal'}), body:JSON.stringify({session_id:session.id,user_id:session.ownerId,party_role:'partyA'}) });
  }
  return { persisted: true, mode: 'supabase' };
}

export async function loadSession(id) {
  if (!capabilities().database) return null;
  const rows = await checkedFetch(`${env.SUPABASE_URL}/rest/v1/mediation_sessions?id=eq.${encodeURIComponent(id)}&select=data`, { headers: supabaseHeaders() });
  return rows[0]?.data ? decryptObject(rows[0].data) : null;
}

export async function getSessionRole(sessionId, user) {
  if (!capabilities().database) return null;
  const rows = await checkedFetch(`${env.SUPABASE_URL}/rest/v1/session_members?session_id=eq.${encodeURIComponent(sessionId)}&user_id=eq.${encodeURIComponent(user.id)}&select=party_role`, { headers:supabaseHeaders() });
  if (!rows[0]) throw Object.assign(new Error('You are not a member of this mediation'), { status:403 });
  return rows[0].party_role;
}

export async function createInvitation({ sessionId, email, role, inviterName }) {
  const token = randomBytes(24).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  if (capabilities().database) await checkedFetch(`${env.SUPABASE_URL}/rest/v1/invitations`, { method: 'POST', headers: supabaseHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify({ session_id: sessionId, email, role, token_hash: tokenHash, expires_at: expiresAt }) });
  const base = env.APP_URL || 'http://localhost:3000';
  const inviteUrl = `${base}/?invite=${token}&session=${sessionId}`;
  if (capabilities().email) {
    await checkedFetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, ...jsonHeaders }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject: `${inviterName} invited you to a Settle mediation`, html: `<h2>You have been invited to Settle</h2><p>Review the shared claims and participate voluntarily in a structured mediation.</p><p><a href="${inviteUrl}">Open mediation room</a></p><p>This invitation expires in 7 days.</p>` }) });
  }
  return { inviteUrl, expiresAt, emailSent: capabilities().email };
}

export async function acceptInvitation({ token, user }) {
  if (!capabilities().database) throw new Error('Persistent invitations require Supabase');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const rows = await checkedFetch(`${env.SUPABASE_URL}/rest/v1/invitations?token_hash=eq.${tokenHash}&select=*`, { headers: supabaseHeaders() });
  const invite = rows[0];
  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) throw new Error('Invitation is invalid or expired');
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) throw new Error('Sign in using the invited email address');
  await checkedFetch(`${env.SUPABASE_URL}/rest/v1/session_members`, { method:'POST', headers:supabaseHeaders({Prefer:'resolution=ignore-duplicates,return=minimal'}), body:JSON.stringify({session_id:invite.session_id,user_id:user.id,party_role:invite.role}) });
  await checkedFetch(`${env.SUPABASE_URL}/rest/v1/invitations?id=eq.${invite.id}`, { method:'PATCH', headers:supabaseHeaders({Prefer:'return=minimal'}), body:JSON.stringify({accepted_at:new Date().toISOString()}) });
  return { sessionId:invite.session_id, role:invite.role };
}

export async function uploadEvidence({ sessionId, userId, fileName, mimeType, base64 }) {
  if (!capabilities().storage) throw new Error('Supabase storage is not configured');
  if (!/^[-\w. ()]+$/.test(fileName)) throw new Error('Invalid file name');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Evidence file exceeds the 10 MB limit');
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(mimeType)) throw new Error('Only PDF, PNG, JPEG, and WebP evidence is accepted');
  const path = `${sessionId}/${userId}/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;
  await checkedFetch(`${env.SUPABASE_URL}/storage/v1/object/evidence/${encodeURI(path)}`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'false' }, body: bytes });
  return { path, size: bytes.length, mimeType, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function analyzeEvidence({ base64, mimeType, jurisdiction = 'IN' }) {
  if (!capabilities().ocr) throw new Error('OpenAI OCR is not configured');
  const schema = { type: 'object', additionalProperties: false, properties: { document_type: { type: 'string' }, merchant: { type: ['string','null'] }, total_amount: { type: ['number','null'] }, currency: { type: ['string','null'] }, transaction_date: { type: ['string','null'] }, order_number: { type: ['string','null'] }, extracted_text: { type: 'string' }, inconsistencies: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' } }, required: ['document_type','merchant','total_amount','currency','transaction_date','order_number','extracted_text','inconsistencies','confidence'] };
  const response = await checkedFetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, ...jsonHeaders }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-5-mini', store: false, input: [{ role: 'system', content: [{ type: 'input_text', text: `Extract factual fields from evidence for a ${jurisdiction} consumer mediation. Do not determine authenticity or make legal conclusions. State uncertainty.` }] }, { role: 'user', content: [{ type: 'input_image', image_url: `data:${mimeType};base64,${base64}`, detail: 'high' }] }], text: { format: { type: 'json_schema', name: 'evidence_extraction', strict: true, schema } } }) });
  const text = response.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!text) throw new Error('OCR returned no structured result');
  return JSON.parse(text);
}

export async function generateMediationProposal(context) {
  if (!capabilities().llm) return null;
  const schema = { type: 'object', additionalProperties: false, properties: { summary: { type: 'string' }, agreed_facts: { type: 'array', items: { type: 'string' } }, disputed_facts: { type: 'array', items: { type: 'string' } }, options: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'object', additionalProperties: false, properties: { amount: { type: ['number','null'] }, terms: { type: 'string' }, rationale: { type: 'string' } }, required: ['amount','terms','rationale'] } }, deescalated_message: { type: 'string' }, risks_requiring_human_review: { type: 'array', items: { type: 'string' } } }, required: ['summary','agreed_facts','disputed_facts','options','deescalated_message','risks_requiring_human_review'] };
  const response = await checkedFetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, ...jsonHeaders }, body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-5-mini', store: false, input: [{ role: 'system', content: [{ type: 'input_text', text: 'You are a neutral mediation assistant. Never choose a winner, reveal private strategy, treat disputed claims as facts, threaten parties, or guarantee legal outcomes. Offer multiple voluntary options. Use only the supplied verified jurisdiction sources. Escalate fraud, threats, power imbalance, minors, violence, or urgent deadlines to a human.' }] }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(context) }] }], text: { format: { type: 'json_schema', name: 'mediation_proposal', strict: true, schema } } }) });
  const text = response.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!text) throw new Error('Model returned no structured proposal');
  return JSON.parse(text);
}

export function encryptObject(value) {
  if (!env.DATA_ENCRYPTION_KEY) return { mode: 'plaintext-demo', value };
  const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { mode: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

export function decryptObject(payload) {
  if (payload.mode === 'plaintext-demo') return payload.value;
  const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64'), iv = Buffer.from(payload.iv, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv); decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}

export function createSignature({ sessionId, proposalId, userId, typedName, consentText, ip, userAgent }) {
  if (!env.SIGNING_SECRET) throw new Error('SIGNING_SECRET is not configured');
  const signedAt = new Date().toISOString();
  const payload = { sessionId, proposalId, userId, typedName, consentText, signedAt, ipHash: createHash('sha256').update(ip || '').digest('hex'), userAgentHash: createHash('sha256').update(userAgent || '').digest('hex') };
  const signature = createHmac('sha256', env.SIGNING_SECRET).update(JSON.stringify(payload)).digest('hex');
  return { ...payload, signature, algorithm: 'HMAC-SHA256' };
}

export function verifySignature(record) {
  const { signature, algorithm, ...payload } = record;
  const expected = createHmac('sha256', env.SIGNING_SECRET).update(JSON.stringify(payload)).digest('hex');
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

export async function persistSignature(record) {
  if (!capabilities().database) return { persisted:false };
  await checkedFetch(`${env.SUPABASE_URL}/rest/v1/signature_records`, { method:'POST', headers:supabaseHeaders({Prefer:'return=minimal'}), body:JSON.stringify({session_id:record.sessionId,user_id:record.userId,proposal_id:record.proposalId,typed_name:record.typedName,consent_text:record.consentText,signature:record.signature,signed_at:record.signedAt,audit:{ipHash:record.ipHash,userAgentHash:record.userAgentHash,algorithm:record.algorithm}}) });
  return { persisted:true };
}

export async function requestHumanReview({ sessionId, reason, priority, requestedBy }) {
  const review = { id: randomUUID(), session_id: sessionId, reason, priority: priority || 'normal', requested_by: requestedBy, status: 'queued', created_at: new Date().toISOString() };
  if (capabilities().database) await checkedFetch(`${env.SUPABASE_URL}/rest/v1/mediator_reviews`, { method: 'POST', headers: supabaseHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify(review) });
  return review;
}

export async function listHumanReviews(user) {
  if (!capabilities().database) return [];
  if (user.user_metadata?.role !== 'mediator') throw Object.assign(new Error('Mediator role required'), { status:403 });
  return checkedFetch(`${env.SUPABASE_URL}/rest/v1/mediator_reviews?status=in.(queued,assigned)&select=*&order=created_at.asc`, { headers:supabaseHeaders() });
}

export async function resolveHumanReview({ reviewId, resolution, user }) {
  if (!capabilities().database) throw new Error('Review persistence is not configured');
  if (user.user_metadata?.role !== 'mediator') throw Object.assign(new Error('Mediator role required'), { status:403 });
  await checkedFetch(`${env.SUPABASE_URL}/rest/v1/mediator_reviews?id=eq.${encodeURIComponent(reviewId)}`, { method:'PATCH', headers:supabaseHeaders({Prefer:'return=minimal'}), body:JSON.stringify({assigned_to:user.id,status:'resolved',resolution,resolved_at:new Date().toISOString()}) });
  return { id:reviewId,status:'resolved',resolution };
}
