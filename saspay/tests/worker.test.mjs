/* Tests simulés (aucun appel réel à SasPay) : node --test saspay/tests/ */
import test from "node:test"; import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite"; import fs from "node:fs";
import W, { offre, montantTexte, hmac } from "../backend/worker.js";
const ORIGINE = "https://providenceeditions.github.io";
function d1() {
  const db = new DatabaseSync(":memory:"); db.exec(fs.readFileSync(new URL("../backend/schema.sql", import.meta.url), "utf8"));
  const st = (sql, args = []) => ({ bind: (...a) => st(sql, a), first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }), run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; } });
  return { prepare: s => st(s), raw: db };
}
function kv() { const m = new Map(); return { get: async k => m.has(k) ? m.get(k).v : null, put: async (k, v, o) => m.set(k, { v, md: o && o.metadata }),
  getWithMetadata: async k => m.has(k) ? { value: m.get(k).v, metadata: m.get(k).md } : { value: null }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name, metadata: m.get(name).md })) }), m }; }
let FAUX = {};
globalThis.fetch = async (u, o = {}) => {
  u = String(u); FAUX.appels = (FAUX.appels || []).concat([[o.method || "GET", u]]);
  const rep = (b, s = 200) => new Response(JSON.stringify({ success: true, data: b, code: s }), { status: s, headers: { "Content-Type": "application/json" } });
  if (u.endsWith("/checkout-sessions/") && o.method === "POST") { FAUX.corps = JSON.parse(o.body); return rep({ id: "sess-1", slug: "abc", checkout_url: "https://pay.saspay.me/checkout/abc" }, 201); }
  if (u.endsWith("/checkout-sessions/sess-1/status/")) return rep({ id: "sess-1", status: FAUX.statut || "PENDING", transaction_id: "tx-1", transaction_status: FAUX.statut === "PAID" ? "SUCCESS" : "PENDING" });
  if (u.endsWith("/checkout-sessions/sess-1/")) return rep({ id: "sess-1", amount: FAUX.montant || FAUX.corps.amount, currency: "XOF", metadata: FAUX.corps.metadata, status: FAUX.statut });
  if (u.endsWith("/payments/tx-1/verify/")) return rep({ id: "tx-1", status: "SUCCESS", charged: "8200.00", net_amount: "8000.00" });
  throw new Error("appel inattendu " + u);
};
const env = () => ({ DB: d1(), LIVRES: kv(), FRONTEND_ORIGIN: ORIGINE, SASPAY_API_KEY: "sk_test_x", SASPAY_WEBHOOK_SECRET: "whsec", PAIEMENT_OUVERT: "oui" });
const ctx = { waitUntil: p => (ctx.p = p) };
const req = (chemin, o = {}) => new Request("https://api.exemple.workers.dev" + chemin, { ...o, headers: { Origin: ORIGINE, "Content-Type": "application/json", ...(o.headers || {}) } });
async function payer(e, corps = { offre: "01", nom: "Awa Test", email: "awa@exemple.com" }) {
  FAUX = {}; const r = await W.fetch(req("/api/paiement", { method: "POST", body: JSON.stringify(corps) }), e, ctx); return [r.status, await r.json()];
}

test("prix côté serveur : livres, collections, panier", () => {
  assert.equal(offre("01").montant, 8000); assert.equal(offre("lot10").montant, 49000); assert.equal(offre("lot4").montant, 16000);
  assert.equal(offre("lot10").montant + offre("lot4").montant, 65000);
  assert.equal(offre("panier", ["01", "03", "01"]).montant, 13000);
  assert.throws(() => offre("99")); assert.throws(() => offre("panier", ["01", "99"])); assert.equal(montantTexte(8000), "8000.00");
});
test("création : montant fixé par le serveur, chaîne décimale, nom/e-mail transmis, sandbox avec sk_test", async () => {
  const e = env(); const [s, b] = await payer(e, { offre: "01", nom: "Awa Test", email: "AWA@exemple.com", montant: 1 });
  assert.equal(s, 200); assert.equal(b.url, "https://pay.saspay.me/checkout/abc");
  assert.equal(FAUX.corps.amount, "8000.00"); assert.equal(FAUX.corps.currency, "XOF"); assert.equal(FAUX.corps.customer_email, "awa@exemple.com");
  assert.ok(FAUX.appels[0][1].startsWith("https://sandbox-api.saspay.me/api/v1/"));
  assert.ok(FAUX.corps.return_url.startsWith(ORIGINE + "/?commande="));
});
test("clé live → API de production", async () => { const e = env(); e.SASPAY_API_KEY = "sk_live_x"; await payer(e); assert.ok(FAUX.appels[0][1].startsWith("https://api.saspay.me/api/v1/")); });
test("paiement fermé tant que l'interrupteur n'est pas activé", async () => { const e = env(); e.PAIEMENT_OUVERT = ""; const [s] = await payer(e); assert.equal(s, 503); });
test("origine étrangère refusée", async () => { const e = env(); const r = await W.fetch(new Request("https://x/api/paiement", { method: "POST", headers: { Origin: "https://pirate.example" }, body: "{}" }), e, ctx); assert.equal(r.status, 403); });
test("double clic : une seule commande", async () => { const e = env(); const [, a] = await payer(e); const [, b] = await payer(e); assert.equal(a.commande, b.commande); });
test("aucune livraison avant SUCCESS ; livraison après vérification ; lien lié à la commande", async () => {
  const e = env(); const [, b] = await payer(e); const c = e.DB.raw.prepare("SELECT * FROM commandes").get();
  const acces = await hmac(await e.LIVRES.get("config/cle-liens"), "providence-commande:" + c.id);
  const etat = async () => (await W.fetch(req(`/api/commande?commande=${c.id}&acces=${acces}`), e, ctx)).json();
  FAUX.statut = "PENDING"; assert.equal((await etat()).etat, "en_attente");
  const bad = await W.fetch(req(`/api/telecharger/01?commande=${c.id}&acces=${acces}`), e, ctx); assert.equal(bad.status, 403);
  e.DB.raw.prepare("UPDATE commandes SET verifie_le=0").run(); FAUX.statut = "PAID";
  const ok = await etat(); assert.equal(ok.etat, "payee"); assert.equal(ok.livres.length, 1);
  await e.LIVRES.put("pdf/01", "%PDF-test", { metadata: { taille: 9 } });
  const dl = await W.fetch(req(`/api/telecharger/01?commande=${c.id}&acces=${acces}`), e, ctx); assert.equal(dl.status, 200); assert.equal(await dl.text(), "%PDF-test");
  const autre = await W.fetch(req(`/api/telecharger/02?commande=${c.id}&acces=${acces}`), e, ctx); assert.equal(autre.status, 403);
  const faux = await W.fetch(req(`/api/telecharger/01?commande=${c.id}&acces=${"0".repeat(64)}`), e, ctx); assert.equal(faux.status, 403);
  assert.equal(e.DB.raw.prepare("SELECT montant_net FROM commandes").get().montant_net, "8000.00");
});
test("montant SasPay différent → refus de livrer", async () => {
  const e = env(); await payer(e); const c = e.DB.raw.prepare("SELECT * FROM commandes").get(); FAUX.statut = "PAID"; FAUX.montant = "1.00";
  const acces = await hmac(await e.LIVRES.get("config/cle-liens"), "providence-commande:" + c.id);
  const r = await (await W.fetch(req(`/api/commande?commande=${c.id}&acces=${acces}`), e, ctx)).json(); assert.equal(r.etat, "en_attente");
});
test("webhook : signature valide acceptée, signature fausse / horodatage périmé refusés, traitement idempotent", async () => {
  const e = env(); await payer(e); FAUX.statut = "PAID";
  const corps = JSON.stringify({ event: "transaction.success", data: { id: "tx-1", status: "SUCCESS" } });
  const t = String(Math.floor(Date.now() / 1000)); const sig = await hmac("whsec", t + "." + corps);
  const envoi = (s, ts, b = corps) => W.fetch(new Request("https://x/api/saspay/webhook", { method: "POST", body: b, headers: { "X-Webhook-Signature": s, "X-Webhook-Timestamp": ts, "X-Webhook-Event": "transaction.success" } }), e, ctx);
  assert.equal((await envoi("a".repeat(64), t)).status, 401);
  assert.equal((await envoi(sig, String(Number(t) - 400))).status, 401);
  assert.equal((await envoi(sig, t, corps + " ")).status, 401);
  assert.equal((await envoi(sig, t)).status, 200); await ctx.p;
  assert.equal(e.DB.raw.prepare("SELECT etat FROM commandes").get().etat, "payee");
  assert.equal((await envoi(sig, t)).status, 200); await ctx.p;
  assert.equal(e.DB.raw.prepare("SELECT COUNT(*) n FROM commandes WHERE etat='payee'").get().n, 1);
});
test("santé : ne révèle aucun secret", async () => { const e = env(); const t = await (await W.fetch(req("/api/sante"), e, ctx)).text(); assert.ok(!t.includes("sk_test_x") && !t.includes("whsec")); });
test("envois Gmail : jeton Google valide accepté, faux jeton / mauvaise adresse refusés, marquage unique", async () => {
  const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", publicKey)), kid: "k1" };
  const b64u = o => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
  const jeton = async (email, exp = Date.now() / 1000 + 300) => { const h = b64u({ alg: "RS256", kid: "k1" }), c = b64u({ iss: "https://accounts.google.com", email, email_verified: true, exp });
    const sig = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(h + "." + c))).toString("base64url"); return h + "." + c + "." + sig; };
  const avant = globalThis.fetch;
  globalThis.fetch = async (u, o) => String(u).includes("oauth2/v3/certs") ? new Response(JSON.stringify({ keys: [jwk] })) : avant(u, o);
  const e = env(); e.EMAIL_EXPEDITEUR = "silasgbavou@gmail.com";
  await payer(e); FAUX.statut = "PAID";
  const c = e.DB.raw.prepare("SELECT * FROM commandes").get();
  e.DB.raw.prepare("UPDATE commandes SET etat='payee', payee_le=? WHERE id=?").run(Date.now(), c.id);
  const lister = async t => W.fetch(new Request("https://x/api/envois", { headers: { Authorization: "Bearer " + t } }), e, ctx);
  assert.equal((await lister(await jeton("pirate@gmail.com"))).status, 403);
  assert.equal((await lister(await jeton("silasgbavou@gmail.com", 1))).status, 403);
  const t = await jeton("silasgbavou@gmail.com"); const parts = t.split("."); parts[2] = parts[2].slice(0, -4) + "AAAA";
  assert.equal((await lister(parts.join("."))).status, 403);
  const ok = await (await lister(t)).json(); assert.equal(ok.commandes.length, 1); assert.ok(ok.commandes[0].lien.includes("#merci"));
  const fait = b => W.fetch(new Request("https://x/api/envois/fait", { method: "POST", headers: { Authorization: "Bearer " + t }, body: JSON.stringify({ id: c.id }) }), e, ctx);
  assert.equal((await (await fait()).json()).ok, true); assert.equal((await (await fait()).json()).ok, false);
  assert.equal((await (await lister(t)).json()).commandes.length, 0);
  globalThis.fetch = avant;
});
