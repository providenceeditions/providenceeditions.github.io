/* Providence Éditions Prestige — paiement SasPay et livraison sécurisée des PDF.
 * Cloudflare Worker (un seul fichier). Aucune clé ni aucun PDF dans ce dépôt.
 *
 * Liaisons : DB (D1), LIVRES (KV privé, PDF + jeton interne).
 * Secrets (saisis dans Cloudflare, jamais ici) : SASPAY_API_KEY, SASPAY_WEBHOOK_SECRET, [BREVO_API_KEY].
 * Variables : FRONTEND_ORIGIN, [EMAIL_SENDER], [IMPORT_OUVERT="oui" pendant l'import des PDF].
 * Conforme à l'OpenAPI SasPay (docs.saspay.me/api-reference/openapi.json, lu le 26/11/2026) :
 *   serveurs : sandbox-api.saspay.me (sk_test_) / api.saspay.me (sk_live_)
 *   POST /checkout-sessions/ ; GET /checkout-sessions/{id}/ ; GET /checkout-sessions/{id}/status/
 *   GET /payments/{id}/verify/ ; webhook {event, data:{id, status, amount, charged, net_amount, currency...}}
 */

/* ---------- Catalogue officiel (prix du site, côté serveur uniquement) ---------- */
const LIVRES = {
  "01": { t: "Le Mystère du Vase d'Or", p: 8000, drive: "1-ko-Q1_8cqCBco1sUTQFoL90oYCzqJk4" },
  "02": { t: "L'Héritage des Saints dans la Lumière", p: 10000, drive: "1ohgzweSt4RnfGmGVaqo0LhDFxWLaTEjM" },
  "03": { t: "Les Réalités Spirituelles de la Rédemption", p: 5000, drive: "1OEujYPrKMJpK8MvYEDxRwng93zYMFkg0" },
  "04": { t: "Introduction au Royaume de la Puissance", p: 6000, drive: "1LJX-rqBbisYIdn36dR1v6USEBfFYp7wf" },
  "05": { t: "Les Sept Montagnes d'une Ville", p: 4000, drive: "1KpKckrVHy5WxQ992tWxDI50jyBbMNaRM" },
  "06": { t: "Les Fondements légaux de la Prière dans le règne spirituel", p: 5000, drive: "1rGpB5YcHsUldbr8__6pisYfUoN216iGp" },
  "07": { t: "L'Église glorieuse du temps de la fin", p: 4000, drive: "1xpXRK2__cftZx_QfnaDoro6CIsjkKcBV" },
  "08": { t: "Introduction au Mouvement Prophétique", p: 7500, drive: "1SQb6jTZ36D6RfUEP3QFdT3x1xFxRQHTb" },
  "09": { t: "La Prière qui engendre les Mouvements de Dieu", p: 4000, drive: "1go6NJ-jAbsIJ8alJz668pX5uzh0KGsUr" },
  "10": { t: "Dispensation prophétique et surnaturelle de l'Esprit (Ruach Naba)", p: 6000, drive: "1aw2qPD8zIyNTM-GkjRYUrSB11FtOj7hc" },
  "11": { t: "Les Partenaires de Dieu", p: 4000, drive: "1ivpj1VwtLaPepjuygJMBSfEYDLL8r3up" },
  "12": { t: "Les Porteurs Mobiles de la Divinité", p: 7500, drive: "19cU_0R7QIgTNmXsm-sLFpSUzPwYBVq4Z" },
  "13": { t: "Oint pour exercer un ministère de la Parole", p: 7500, drive: "1ULhtGo7GCpNWPKOS20EEpr1jC3KAnwRQ" },
  "14": { t: "Le Modèle biblique des cinq Ministères dans l'Église contemporaine", p: 5000, drive: "18bHBHig0UpTPeFl8f2cWv3ZR_-hjGzot" },
};
/* Collections : mêmes prix que le site (data/config.json → lotsCalcules : 65 000 réparti au prorata). */
const LOTS = {
  lot10: { t: "La Grande Collection — 10 livres", p: 49000, ids: ["02", "08", "10", "14", "07", "04", "01", "13", "06", "09"] },
  lot4: { t: "La Collection Complémentaire — 4 livres", p: 16000, ids: ["03", "05", "11", "12"] },
};
function offre(code, ids) {
  if (LIVRES[code]) return { code, titre: LIVRES[code].t, montant: LIVRES[code].p, livres: [code] };
  if (LOTS[code]) return { code, titre: LOTS[code].t, montant: LOTS[code].p, livres: [...LOTS[code].ids] };
  if (code === "panier" && Array.isArray(ids)) {
    const u = [...new Set(ids.map(String))];
    if (u.length < 1 || u.length > 14 || u.some(i => !LIVRES[i])) throw new Error("panier");
    if (u.length === 1) return offre(u[0]);
    return { code: "panier", titre: u.length + " ouvrages", montant: u.reduce((s, i) => s + LIVRES[i].p, 0), livres: u.sort() };
  }
  throw new Error("offre");
}

/* ---------- Outils ---------- */
const enc = new TextEncoder();
const ENTETES = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...ENTETES, "Content-Type": "application/json; charset=utf-8" } });
const emailOk = v => typeof v === "string" && v.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(v);
const uuidOk = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const idFournisseurOk = v => typeof v === "string" && v.length < 100 && /^[\w.:=+\/-]+$/.test(v);
const montantTexte = n => { if (!Number.isSafeInteger(n) || n <= 0) throw new Error("montant"); return n + ".00"; };
const memeMontant = (a, n) => Math.round(Number(a) * 100) === n * 100;
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
async function hmac(cle, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(cle), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
function egal(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
/* Clé interne des liens de téléchargement : créée une fois, conservée dans le KV privé. */
async function cleInterne(env) {
  let k = await env.LIVRES.get("config/cle-liens");
  if (!k) { const r = new Uint8Array(32); crypto.getRandomValues(r); k = hex(r); await env.LIVRES.put("config/cle-liens", k); k = await env.LIVRES.get("config/cle-liens") || k; }
  return k;
}
const acces = async (env, id) => hmac(await cleInterne(env), "providence-commande:" + id);
async function accesOk(env, cmd, a) { return !!(cmd && /^[a-f0-9]{64}$/.test(a || "") && egal(await acces(env, cmd.id), a)); }

/* ---------- SasPay ---------- */
function saspayBase(env) {
  const k = env.SASPAY_API_KEY || "";
  if (k.startsWith("sk_test_")) return "https://sandbox-api.saspay.me/api/v1";
  if (k.startsWith("sk_live_")) return "https://api.saspay.me/api/v1";
  throw new Error("cle-absente");
}
const modeSaspay = env => (env.SASPAY_API_KEY || "").startsWith("sk_live_") ? "live" : (env.SASPAY_API_KEY || "").startsWith("sk_test_") ? "sandbox" : "absent";
async function api(env, chemin, opt = {}) {
  const r = await fetch(saspayBase(env) + chemin, { ...opt, headers: { Authorization: "Bearer " + env.SASPAY_API_KEY, "Content-Type": "application/json", Accept: "application/json", ...(opt.headers || {}) } });
  let b = null; try { b = await r.json(); } catch (e) { /* corps non JSON */ }
  if (!r.ok || (b && b.success === false)) { const e = new Error("saspay-" + r.status); e.status = r.status; e.code = b && b.error && b.error.code; throw e; }
  return b && b.data !== undefined ? b.data : b;
}

/* ---------- Base de données ---------- */
const SQL_CMD = "SELECT * FROM commandes WHERE id=?";
const lire = (env, id) => env.DB.prepare(SQL_CMD).bind(id).first();

/* Vérification indépendante d'une commande auprès de SasPay (jamais sur la foi d'une redirection). */
async function verifier(env, cmd) {
  if (!idFournisseurOk(cmd.session_id || "")) return { paye: false };
  const s = encodeURIComponent(cmd.session_id);
  const st = await api(env, `/checkout-sessions/${s}/status/`);
  if (!st || st.status !== "PAID" || st.transaction_status !== "SUCCESS") return { paye: false, statut: st && st.status };
  if (st.id && String(st.id) !== cmd.session_id) return { paye: false };
  const det = await api(env, `/checkout-sessions/${s}/`);
  if (!det || det.currency !== "XOF" || !memeMontant(det.amount, cmd.montant)) return { paye: false, anomalie: "montant" };
  if (det.metadata && det.metadata.commande && det.metadata.commande !== cmd.id) return { paye: false, anomalie: "commande" };
  let tx = null;
  if (st.transaction_id && idFournisseurOk(String(st.transaction_id))) {
    try { tx = await api(env, `/payments/${encodeURIComponent(st.transaction_id)}/verify/`); } catch (e) { tx = null; }
    if (tx && tx.status && tx.status !== "SUCCESS") return { paye: false };
  }
  return { paye: true, tx: st.transaction_id ? String(st.transaction_id) : null, charge: tx && tx.charged || null, net: tx && tx.net_amount || null };
}
async function rapprocher(env, cmd, force) {
  if (!cmd || cmd.etat === "payee") return cmd;
  if (!force && Date.now() - (cmd.verifie_le || 0) < 10000) return cmd;
  await env.DB.prepare("UPDATE commandes SET verifie_le=? WHERE id=?").bind(Date.now(), cmd.id).run();
  const v = await verifier(env, cmd);
  if (v.paye) {
    const r = await env.DB.prepare("UPDATE commandes SET etat='payee', payee_le=?, transaction_id=?, montant_debite=?, montant_net=? WHERE id=? AND etat='en_attente'")
      .bind(Date.now(), v.tx, v.charge, v.net, cmd.id).run();
    if ((r.meta && r.meta.changes) > 0) await envoyerEmail(env, await lire(env, cmd.id)).catch(() => {});
    return lire(env, cmd.id);
  }
  return cmd;
}

/* ---------- Routes ---------- */
const origineOk = (req, env) => req.headers.get("Origin") === env.FRONTEND_ORIGIN;
function cors(req, env) {
  return origineOk(req, env) ? { "Access-Control-Allow-Origin": env.FRONTEND_ORIGIN, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "3600", Vary: "Origin" } : {};
}

async function creerPaiement(req, env) {
  if (!origineOk(req, env)) return json({ erreur: "Origine refusée" }, 403);
  if (env.PAIEMENT_OUVERT !== "oui") return json({ erreur: "Le paiement direct n'est pas encore ouvert." }, 503);
  const b = await req.json().catch(() => null);
  const nom = b && typeof b.nom === "string" ? b.nom.trim().replace(/\s+/g, " ") : "";
  const email = b && typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (nom.length < 2 || nom.length > 100 || /[<>]/.test(nom)) return json({ erreur: "Indiquez votre nom (2 à 100 caractères)." }, 400);
  if (!emailOk(email)) return json({ erreur: "Adresse e-mail invalide." }, 400);
  let o; try { o = offre(String(b.offre || ""), b.ids); } catch (e) { return json({ erreur: "Ouvrage ou collection inconnu." }, 400); }
  const ip = req.headers.get("CF-Connecting-IP") || "";
  const ipH = (await hmac("ip", ip)).slice(0, 16);
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM commandes WHERE ip=? AND cree_le>?").bind(ipH, Date.now() - 600000).first();
  if (n && n.n >= 8) return json({ erreur: "Trop de tentatives. Réessayez dans quelques minutes." }, 429);
  /* Double clic : réutiliser une commande identique, non payée, créée il y a moins de 2 minutes. */
  const deja = await env.DB.prepare("SELECT * FROM commandes WHERE email=? AND offre=? AND livres=? AND etat='en_attente' AND cree_le>? AND url_paiement IS NOT NULL ORDER BY cree_le DESC LIMIT 1")
    .bind(email, o.code, JSON.stringify(o.livres), Date.now() - 120000).first();
  if (deja) return json({ url: deja.url_paiement, commande: deja.id });
  const id = crypto.randomUUID(), a = await acces(env, id);
  await env.DB.prepare("INSERT INTO commandes (id,offre,titre,livres,montant,devise,etat,email,nom,ip,cree_le) VALUES (?,?,?,?,?,'XOF','en_attente',?,?,?,?)")
    .bind(id, o.code, o.titre, JSON.stringify(o.livres), o.montant, email, nom, ipH, Date.now()).run();
  const retour = new URL(env.FRONTEND_ORIGIN + "/");
  retour.searchParams.set("commande", id); retour.searchParams.set("acces", a); retour.hash = "merci";
  let s;
  try {
    s = await api(env, "/checkout-sessions/", { method: "POST", body: JSON.stringify({
      amount: montantTexte(o.montant), currency: "XOF", country: "BJ",
      description: "Providence Éditions Prestige — " + o.titre,
      customer_email: email, customer_name: nom, return_url: retour.toString(),
      metadata: { commande: id, offre: o.code },
    }) });
  } catch (e) {
    await env.DB.prepare("UPDATE commandes SET etat='abandonnee' WHERE id=?").bind(id).run();
    return json({ erreur: "Le service de paiement ne répond pas. Réessayez dans un instant." }, 502);
  }
  let u; try { u = new URL(s.checkout_url); } catch (e) { u = null; }
  if (!s || !idFournisseurOk(String(s.id || "")) || !u || u.protocol !== "https:" || !(u.hostname === "saspay.me" || u.hostname.endsWith(".saspay.me")))
    return json({ erreur: "Réponse de paiement inattendue." }, 502);
  await env.DB.prepare("UPDATE commandes SET session_id=?, url_paiement=? WHERE id=?").bind(String(s.id), u.toString(), id).run();
  return json({ url: u.toString(), commande: id });
}

/* Secret de signature du webhook : variable Cloudflare SASPAY_WEBHOOK_SECRET, sinon valeur créée une seule fois
   par la page d'installation et conservée dans le KV privé (le propriétaire la recopie dans SasPay). */
async function secretWebhook(env) { return env.SASPAY_WEBHOOK_SECRET || await env.LIVRES.get("config/secret-webhook"); }
async function pageSecretWebhook(env) {
  if (env.CONFIG_WEBHOOK !== "oui") return json({ erreur: "fermé" }, 404);
  if (await env.LIVRES.get("config/secret-webhook")) return new Response("<!doctype html><meta charset=utf-8><body style='font-family:sans-serif;padding:30px'>Le secret a déjà été créé et affiché une seule fois.", { status: 410, headers: { ...ENTETES, "Content-Type": "text/html; charset=utf-8" } });
  const r = new Uint8Array(32); crypto.getRandomValues(r); const v = "whsec_" + hex(r);
  await env.LIVRES.put("config/secret-webhook", v);
  return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Secret du webhook</title>
<body style="font-family:'Plus Jakarta Sans',Arial,sans-serif;background:#F3F8FF;color:#12243A;padding:24px"><div style="max-width:620px;margin:auto;background:#fff;border:1px solid #D7E4F2;border-radius:20px;padding:26px">
<p style="font-weight:800;color:#1450D2;font-size:12px;letter-spacing:.06em">PROVIDENCE ÉDITIONS PRESTIGE</p><h1 style="font-size:22px">Secret de signature du webhook</h1>
<p>Affiché <b>une seule fois</b>. Copiez-le, puis collez-le dans SasPay, champ « Secret de signature ».</p>
<input id="s" readonly value="${v}" style="width:100%;font:15px monospace;padding:12px;border:1.5px solid #D7E4F2;border-radius:12px">
<button onclick="navigator.clipboard.writeText(document.getElementById('s').value).then(()=>this.textContent='Copié ✓')" style="margin-top:14px;background:#1450D2;color:#fff;border:0;border-radius:999px;padding:13px 22px;font-weight:700;font-size:15px;cursor:pointer">Copier le secret</button>
</div>`, { headers: { ...ENTETES, "Content-Type": "text/html; charset=utf-8" } });
}
async function webhook(req, env, ctx) {
  const brut = await req.text();
  if (brut.length > 65536) return json({ erreur: "trop long" }, 413);
  const t = req.headers.get("X-Webhook-Timestamp") || "", sig = (req.headers.get("X-Webhook-Signature") || "").toLowerCase();
  const secret = await secretWebhook(env);
  if (!secret || !/^\d{9,11}$/.test(t) || !/^[a-f0-9]{64}$/.test(sig)) return json({ erreur: "signature" }, 401);
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return json({ erreur: "horodatage" }, 401);
  if (!egal(await hmac(secret, t + "." + brut), sig)) return json({ erreur: "signature" }, 401);
  let e; try { e = JSON.parse(brut); } catch (x) { return json({ erreur: "json" }, 400); }
  const evt = e.event || req.headers.get("X-Webhook-Event");
  await env.DB.prepare("INSERT INTO evenements (recu_le, evenement, ref) VALUES (?,?,?)").bind(Date.now(), String(evt).slice(0, 60), String(e.data && e.data.id || "").slice(0, 80)).run().catch(() => {});
  if (evt !== "transaction.success") return json({ recu: true });
  /* L'événement ne porte pas la référence de commande : on revérifie les commandes en attente récentes
     auprès de SasPay (statut de LEUR session), ce qui suffit pour une librairie. */
  const tache = (async () => {
    const r = await env.DB.prepare("SELECT * FROM commandes WHERE etat='en_attente' AND session_id IS NOT NULL AND cree_le>? ORDER BY cree_le DESC LIMIT 25").bind(Date.now() - 72 * 3600000).all();
    for (const c of r.results || []) { try { await rapprocher(env, c, true); } catch (x) { /* nouvel essai par la tâche planifiée */ } }
  })();
  ctx.waitUntil(tache);
  return json({ recu: true });
}

async function etatCommande(req, env, url) {
  if (!origineOk(req, env)) return json({ erreur: "Origine refusée" }, 403);
  const id = url.searchParams.get("commande"), a = url.searchParams.get("acces");
  if (!uuidOk(id)) return json({ erreur: "Commande invalide" }, 400);
  let c = await lire(env, id);
  if (!(await accesOk(env, c, a))) return json({ erreur: "Accès refusé" }, 403);
  try { c = await rapprocher(env, c, false); } catch (e) { return json({ etat: "verification", titre: c.titre }); }
  if (c.etat !== "payee") return json({ etat: c.etat === "abandonnee" ? "abandonnee" : "en_attente", titre: c.titre, montant: c.montant });
  const base = new URL(req.url).origin;
  const livres = JSON.parse(c.livres).map(i => ({ id: i, titre: LIVRES[i].t, url: `${base}/api/telecharger/${i}?commande=${id}&acces=${a}` }));
  return json({ etat: "payee", titre: c.titre, montant: c.montant, livres, email: c.email.replace(/^(.).*(@.*)$/, "$1•••$2"), emailEnvoye: !!c.email_envoye_le });
}

async function telecharger(env, livre, url) {
  const id = url.searchParams.get("commande"), a = url.searchParams.get("acces");
  if (!LIVRES[livre] || !uuidOk(id)) return json({ erreur: "Accès refusé" }, 403);
  const c = await lire(env, id);
  if (!(await accesOk(env, c, a)) || c.etat !== "payee" || !JSON.parse(c.livres).includes(livre)) return json({ erreur: "Accès refusé" }, 403);
  if (Date.now() - c.payee_le > 365 * 86400000) return json({ erreur: "Lien expiré : écrivez-nous, nous vous renverrons vos livres." }, 410);
  const f = await env.LIVRES.getWithMetadata("pdf/" + livre, { type: "stream" });
  if (!f || !f.value) return json({ erreur: "Fichier momentanément indisponible : écrivez-nous." }, 503);
  await env.DB.prepare("UPDATE commandes SET telechargements=COALESCE(telechargements,0)+1 WHERE id=?").bind(id).run();
  const nom = (LIVRES[livre].t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")) + " - Providence Editions Prestige.pdf";
  return new Response(f.value, { headers: { ...ENTETES, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nom}"`, ...(f.metadata && f.metadata.taille ? { "Content-Length": String(f.metadata.taille) } : {}) } });
}

/* ---------- E-mail de livraison (Brevo, activé seulement si la clé est enregistrée) ---------- */
async function envoyerEmail(env, c) {
  if (!env.BREVO_API_KEY || !emailOk(env.EMAIL_SENDER || "") || !c || c.etat !== "payee" || c.email_envoye_le) return false;
  const a = await acces(env, c.id), lien = `${env.FRONTEND_ORIGIN}/?commande=${c.id}&acces=${a}#merci`;
  const liste = JSON.parse(c.livres).map(i => `<li style="margin:6px 0">${LIVRES[i].t.replace(/[<>&]/g, "")}</li>`).join("");
  const html = `<div style="background:#F3F8FF;padding:24px;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#12243A"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #D7E4F2;border-radius:20px;padding:28px"><p style="margin:0 0 6px;font-weight:800;color:#1450D2;letter-spacing:.06em;font-size:12px">PROVIDENCE ÉDITIONS PRESTIGE</p><h1 style="font-size:22px;margin:0 0 12px">Merci, votre paiement est confirmé.</h1><p>Vos ouvrages :</p><ul>${liste}</ul><p style="margin:22px 0"><a href="${lien}" style="background:linear-gradient(180deg,#1450D2,#103FA8);color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px;display:inline-block">Télécharger mes ouvrages</a></p><p style="font-size:13px;color:#4C6178">Conservez cet e-mail : ce lien personnel vous permet de récupérer vos livres à tout moment. Référence : ${c.id.slice(0, 8).toUpperCase()}. Assistance : providenceeditionsprestige@gmail.com</p></div></div>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: { name: "Providence Éditions Prestige", email: env.EMAIL_SENDER }, to: [{ email: c.email, name: c.nom }], subject: "Vos livres — Providence Éditions Prestige", htmlContent: html, textContent: `Merci, votre paiement est confirmé. Téléchargez vos ouvrages : ${lien}` }) });
  if (!r.ok) return false;
  await env.DB.prepare("UPDATE commandes SET email_envoye_le=? WHERE id=? AND email_envoye_le IS NULL").bind(Date.now(), c.id).run();
  return true;
}


/* ---------- Envoi des e-mails de livraison par Google Apps Script (Gmail du propriétaire) ----------
   Aucun secret partagé : le script présente un jeton d'identité signé par Google ; on vérifie la signature
   (clés publiques Google), l'émetteur, l'expiration et l'adresse autorisée (variable EMAIL_EXPEDITEUR). */
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function identiteGoogle(req, env) {
  const m = (req.headers.get("Authorization") || "").match(/^Bearer ([\w-]+)\.([\w-]+)\.([\w-]+)$/);
  if (!m || !env.EMAIL_EXPEDITEUR) return false;
  let tete, corps; try { tete = JSON.parse(new TextDecoder().decode(b64u(m[1]))); corps = JSON.parse(new TextDecoder().decode(b64u(m[2]))); } catch (e) { return false; }
  if (tete.alg !== "RS256" || !["accounts.google.com", "https://accounts.google.com"].includes(corps.iss)) return false;
  if (!(corps.exp * 1000 > Date.now()) || corps.email_verified !== true && corps.email_verified !== "true") return false;
  if (String(corps.email).toLowerCase() !== env.EMAIL_EXPEDITEUR.toLowerCase()) return false;
  const jwks = await (await fetch("https://www.googleapis.com/oauth2/v3/certs", { cf: { cacheTtl: 3600 } })).json();
  const jwk = (jwks.keys || []).find(k => k.kid === tete.kid); if (!jwk) return false;
  const cle = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", cle, b64u(m[3]), enc.encode(m[1] + "." + m[2]));
}
async function envoisEnAttente(req, env) {
  if (!(await identiteGoogle(req, env))) return json({ erreur: "Accès refusé" }, 403);
  const r = await env.DB.prepare("SELECT * FROM commandes WHERE etat='payee' AND email_envoye_le IS NULL AND payee_le>? ORDER BY payee_le ASC LIMIT 20").bind(Date.now() - 30 * 86400000).all();
  const liste = [];
  for (const c of r.results || []) {
    const a = await acces(env, c.id);
    liste.push({ id: c.id, ref: c.id.slice(0, 8).toUpperCase(), nom: c.nom, email: c.email, offre: c.titre, montant: c.montant,
      livres: JSON.parse(c.livres).map(i => LIVRES[i].t), lien: `${env.FRONTEND_ORIGIN}/?commande=${c.id}&acces=${a}#merci` });
  }
  return json({ commandes: liste });
}
async function envoiFait(req, env) {
  if (!(await identiteGoogle(req, env))) return json({ erreur: "Accès refusé" }, 403);
  const b = await req.json().catch(() => ({}));
  if (!uuidOk(b.id)) return json({ erreur: "Commande invalide" }, 400);
  const r = await env.DB.prepare("UPDATE commandes SET email_envoye_le=? WHERE id=? AND etat='payee' AND email_envoye_le IS NULL").bind(Date.now(), b.id).run();
  return json({ ok: (r.meta && r.meta.changes) > 0 });
}

/* ---------- Import privé des PDF depuis Google Drive (ouvert seulement pendant l'installation) ---------- */
async function importer(env, livre) {
  if (env.IMPORT_OUVERT !== "oui") return json({ erreur: "fermé" }, 404);
  if (!LIVRES[livre]) return json({ erreur: "livre" }, 400);
  const r = await fetch(`https://drive.usercontent.google.com/download?id=${LIVRES[livre].drive}&export=download&confirm=t`);
  if (!r.ok) return json({ livre, erreur: "drive-" + r.status }, 502);
  const b = await r.arrayBuffer();
  const tete = new TextDecoder().decode(b.slice(0, 5));
  if (tete !== "%PDF-") return json({ livre, erreur: "pas un PDF", type: r.headers.get("content-type") }, 502);
  if (b.byteLength > 25 * 1024 * 1024) return json({ livre, erreur: "trop volumineux", taille: b.byteLength }, 413);
  const sha = hex(await crypto.subtle.digest("SHA-256", b));
  await env.LIVRES.put("pdf/" + livre, b, { metadata: { taille: b.byteLength, sha256: sha, importe: new Date().toISOString() } });
  return json({ livre, taille: b.byteLength, sha256: sha });
}
async function inventaire(env) {
  if (env.IMPORT_OUVERT !== "oui") return json({ erreur: "fermé" }, 404);
  const l = await env.LIVRES.list({ prefix: "pdf/" });
  return json({ n: l.keys.length, fichiers: l.keys.map(k => ({ livre: k.name.slice(4), ...(k.metadata || {}) })) });
}

async function sante(env) {
  let db = false, kv = false, pdf = 0;
  try { await env.DB.prepare("SELECT 1").first(); db = true; } catch (e) {}
  try { pdf = (await env.LIVRES.list({ prefix: "pdf/" })).keys.length; kv = true; } catch (e) {}
  return json({ service: "Providence — paiement SasPay", saspay: modeSaspay(env), webhook: !!(await secretWebhook(env)), base: db, stockage: kv, pdf, email: !!env.BREVO_API_KEY || !!env.EMAIL_EXPEDITEUR, paiementOuvert: env.PAIEMENT_OUVERT === "oui" });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: origineOk(req, env) ? 204 : 403, headers: cors(req, env) });
    let r;
    try {
      if (p === "/api/sante" && req.method === "GET") r = await sante(env);
      else if (p === "/api/paiement" && req.method === "POST") r = await creerPaiement(req, env);
      else if (p === "/api/saspay/webhook" && req.method === "POST") r = await webhook(req, env, ctx);
      else if (p === "/api/commande" && req.method === "GET") r = await etatCommande(req, env, url);
      else if (p.startsWith("/api/telecharger/") && req.method === "GET") r = await telecharger(env, p.slice(17), url);
      else if (p.startsWith("/api/installation/importer/") && req.method === "POST") r = await importer(env, p.slice(27));
      else if (p === "/api/installation/inventaire" && req.method === "GET") r = await inventaire(env);
      else if (p === "/api/installation/secret-webhook" && req.method === "GET") r = await pageSecretWebhook(env);
      else if (p === "/api/envois" && req.method === "GET") r = await envoisEnAttente(req, env);
      else if (p === "/api/envois/fait" && req.method === "POST") r = await envoiFait(req, env);
      else r = json({ erreur: "Introuvable" }, 404);
    } catch (e) { r = json({ erreur: "Service momentanément indisponible" }, 503); }
    const h = new Headers(r.headers); for (const [k, v] of Object.entries(cors(req, env))) h.set(k, v);
    return new Response(r.body, { status: r.status, headers: h });
  },
  /* Reprise : paiements confirmés dont le navigateur s'est fermé et dont le webhook a tardé. */
  async scheduled(ev, env, ctx) {
    ctx.waitUntil((async () => {
      const r = await env.DB.prepare("SELECT * FROM commandes WHERE etat='en_attente' AND session_id IS NOT NULL AND cree_le>? ORDER BY cree_le DESC LIMIT 20").bind(Date.now() - 48 * 3600000).all();
      for (const c of r.results || []) { try { await rapprocher(env, c, true); } catch (e) {} }
      const e = await env.DB.prepare("SELECT * FROM commandes WHERE etat='payee' AND email_envoye_le IS NULL AND payee_le>? LIMIT 10").bind(Date.now() - 7 * 86400000).all();
      for (const c of e.results || []) { try { await envoyerEmail(env, c); } catch (x) {} }
    })());
  },
};
export { offre, montantTexte, memeMontant, hmac, egal, verifier, LIVRES, LOTS };
