import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  createSession, publicView, joinSession, respondToClaim, addEvidence, addPrivateNote,
  makeOffer, acceptProposal, flagBias, agreement, demoSession
} from './src/mediation-engine.js';
import {
  capabilities, authenticate, signUp, signIn, persistSession, loadSession, createInvitation,
  uploadEvidence, analyzeEvidence, generateMediationProposal, createSignature, persistSignature,
  requestHumanReview, acceptInvitation, listHumanReviews, resolveHumanReview, getSessionRole
} from './src/production-services.js';
import { getJurisdiction, listJurisdictions } from './src/jurisdictions.js';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const sessions = new Map();
const streams = new Map();
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'same-origin' });
  res.end(JSON.stringify(body));
}

async function bodyOf(req) {
  const chunks=[]; let size=0;
  for await (const chunk of req) { size += chunk.length; if (size > 15 * 1024 * 1024) throw Object.assign(new Error('Request exceeds 15 MB'), { status:413 }); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

async function findSession(id) {
  if (sessions.has(id)) return sessions.get(id);
  const stored = await loadSession(id);
  if (!stored) throw Object.assign(new Error('Mediation room not found'), { status:404 });
  sessions.set(id, stored); return stored;
}

function broadcast(session) {
  const clients = streams.get(session.id) || new Set();
  for (const client of clients) client.write(`event: session\ndata: ${JSON.stringify({ id:session.id, updatedAt:session.updatedAt, status:session.status })}\n\n`);
}

async function save(session) { await persistSession(session); broadcast(session); }

function openStream(req, res, sessionId) {
  res.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', Connection:'keep-alive', 'X-Accel-Buffering':'no' });
  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);
  if (!streams.has(sessionId)) streams.set(sessionId, new Set());
  streams.get(sessionId).add(res);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  req.on('close', () => { clearInterval(heartbeat); streams.get(sessionId)?.delete(res); });
}

async function api(req, res, url) {
  if (req.method==='GET' && url.pathname==='/api/health') return send(res,200,{status:'ok',service:'Settle',sessions:sessions.size,capabilities:capabilities()});
  if (req.method==='GET' && url.pathname==='/api/config') return send(res,200,{capabilities:capabilities(),jurisdictions:listJurisdictions(),production:Boolean(process.env.SUPABASE_URL)});
  if (req.method==='POST' && url.pathname==='/api/auth/signup') { const b=await bodyOf(req); return send(res,201,await signUp(b.email,b.password,b.name)); }
  if (req.method==='POST' && url.pathname==='/api/auth/signin') { const b=await bodyOf(req); return send(res,200,await signIn(b.email,b.password)); }
  if (req.method==='POST' && url.pathname==='/api/invitations/accept') { const user=await authenticate(req),b=await bodyOf(req); return send(res,200,await acceptInvitation({token:b.token,user})); }
  if (req.method==='GET' && url.pathname==='/api/mediator/reviews') { const user=await authenticate(req); return send(res,200,await listHumanReviews(user)); }
  if (req.method==='POST' && url.pathname==='/api/mediator/reviews/resolve') { const user=await authenticate(req),b=await bodyOf(req); return send(res,200,await resolveHumanReview({reviewId:b.reviewId,resolution:b.resolution,user})); }
  if (req.method==='POST' && url.pathname==='/api/sessions') {
    const user=await authenticate(req), input=await bodyOf(req), legal=getJurisdiction(input.jurisdiction || 'IN');
    const session=createSession(input); session.ownerId=user.id; session.legalContext=legal.consumer;
    sessions.set(session.id,session); await save(session); return send(res,201,publicView(session,'partyA'));
  }
  if (req.method==='POST' && url.pathname==='/api/demo') {
    const session=demoSession(); session.jurisdiction='IN'; session.legalContext=getJurisdiction('IN').consumer;
    sessions.set(session.id,session); return send(res,201,publicView(session,'partyA'));
  }
  const match=url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(.+))?$/);
  if (!match) return false;
  const id=match[1], action=match[2];
  if (req.method==='GET' && action==='events') { openStream(req,res,id); return; }
  const session=await findSession(id);
  const data=req.method==='POST'?await bodyOf(req):{};
  let viewer=data.actor || url.searchParams.get('viewer') || 'observer';
  if (capabilities().authentication && capabilities().database) {
    const user=await authenticate(req);
    viewer=await getSessionRole(id,user);
  }
  if (req.method==='GET' && !action) return send(res,200,publicView(session,viewer));
  if (req.method!=='POST') return false;

  if (action==='join') joinSession(session,data);
  else if (action==='claims/respond') respondToClaim(session,viewer,data);
  else if (action==='evidence') addEvidence(session,viewer,data);
  else if (action==='private-note') addPrivateNote(session,viewer,data);
  else if (action==='offers') makeOffer(session,viewer,data);
  else if (action==='accept') acceptProposal(session,viewer);
  else if (action==='flag-bias') flagBias(session,viewer,data.reason);
  else if (action==='agreement') return send(res,200,agreement(session));
  else if (action==='invite') {
    const user=await authenticate(req);
    const invite=await createInvitation({sessionId:id,email:data.email,role:data.role||'partyB',inviterName:user.user_metadata?.name||user.email||'A participant'});
    session.ledger.push({id:randomUUID(),type:'invitation',actor:viewer,summary:`Invitation created for ${data.email}.`,visibility:'shared',at:new Date().toISOString()});
    await save(session); return send(res,201,invite);
  }
  else if (action==='upload') {
    const user=await authenticate(req);
    const stored=await uploadEvidence({sessionId:id,userId:user.id,fileName:data.fileName,mimeType:data.mimeType,base64:data.base64});
    let extraction=null;
    if (data.runOcr!==false && capabilities().ocr && data.mimeType.startsWith('image/')) extraction=await analyzeEvidence({base64:data.base64,mimeType:data.mimeType,jurisdiction:session.jurisdiction});
    addEvidence(session,viewer,{name:data.fileName,type:data.mimeType,extractedAmount:extraction?.total_amount,note:extraction? `OCR confidence ${Math.round(extraction.confidence*100)}%. Human confirmation required.` : 'Stored securely; OCR not run.'});
    await save(session); return send(res,201,{stored,extraction,session:publicView(session,viewer)});
  }
  else if (action==='ai-proposal') {
    const shared=publicView(session,'observer');
    const result=await generateMediationProposal({jurisdiction:session.legalContext,claims:shared.claims,evidence:shared.evidence,offers:shared.offers,sharedNarrative:shared.sharedNarrative});
    if (!result) throw new Error('Live LLM is not configured');
    session.aiAnalysis={...result,createdAt:new Date().toISOString(),model:process.env.OPENAI_MODEL||'gpt-5-mini'};
    if (result.risks_requiring_human_review.length) session.status='human-review-recommended';
    session.ledger.push({id:Date.now().toString(),type:'ai-analysis',actor:'mediator',summary:'AI generated multiple neutral options from shared, verified context.',visibility:'shared',at:new Date().toISOString()});
    await save(session); return send(res,200,publicView(session,viewer));
  }
  else if (action==='sign') {
    const user=await authenticate(req);
    if (!session.proposal) throw new Error('No proposal is available to sign');
    if (!data.typedName || data.consent!==true) throw new Error('Typed name and explicit consent are required');
    const record=createSignature({sessionId:id,proposalId:session.proposal.id,userId:user.id,typedName:data.typedName,consentText:'I voluntarily accept the displayed settlement terms.',ip:req.socket.remoteAddress,userAgent:req.headers['user-agent']});
    await persistSignature(record); session.signatures.push({...record,actor:viewer}); acceptProposal(session,viewer);
    await save(session); return send(res,201,{record,session:publicView(session,viewer)});
  }
  else if (action==='human-review') {
    const user=await authenticate(req);
    const review=await requestHumanReview({sessionId:id,reason:data.reason,priority:data.priority,requestedBy:user.id});
    session.status='human-review'; session.ledger.push({id:review.id,type:'human-review',actor:viewer,summary:'A human mediator review was requested.',visibility:'shared',at:new Date().toISOString()});
    await save(session); return send(res,201,{review,session:publicView(session,viewer)});
  }
  else return false;
  await save(session); return send(res,200,publicView(session,viewer));
}

async function staticFile(req,res,url) {
  const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),safe=normalize(requested).replace(/^(\.\.[/\\])+/,'');
  let path=join(root,safe); if(!path.startsWith(root))return send(res,403,{error:'Forbidden'});
  try { if((await stat(path)).isDirectory())path=join(path,'index.html');const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data); }
  catch { const data=await readFile(join(root,'index.html'));res.writeHead(200,{'Content-Type':types['.html']});res.end(data); }
}

createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try { if(url.pathname.startsWith('/api/')){const handled=await api(req,res,url);if(handled===false)send(res,404,{error:'Endpoint not found'});} else await staticFile(req,res,url); }
  catch(error){send(res,error.status||422,{error:error.message||'Unexpected error'});}
}).listen(port,'0.0.0.0',()=>console.log(`Settle running at http://localhost:${port}`));
