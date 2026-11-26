/* Boutique Providence Éditions Prestige — refonte bleu et blanc
   Données : data/livres.json (fiches) et data/config.json (réglages, contacts, paiement).
   Aucun secret ni lien de téléchargement de PDF dans ce fichier. */
(() => {
"use strict";
let TOUS = [], LIVRES = [], CFG = {}, THEMES = [];
const vue = document.getElementById("vue");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fcfa = n => Number(n).toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA";
const wa = (num, txt) => "https://wa.me/" + num + "?text=" + encodeURIComponent(txt);
const mini = l => "couvertures/mini/" + String(l.couverture || "").split("/").pop();
const afficheVideo = x => x.affiche || String(x.fichier || "").replace(/\.(mp4|webm|mov)$/i, ".jpg");
/* Vignette manquante (livre ajouté depuis la plateforme de gestion) : on affiche la couverture complète. */
document.addEventListener("error", e => {
  const im = e.target; if (!(im instanceof HTMLImageElement) || im.dataset.repli) return;
  const src = im.getAttribute("src") || "";
  if (src.includes("couvertures/mini/")) { im.dataset.repli = "1"; im.src = src.replace("couvertures/mini/", "couvertures/"); }
}, true);
const auteursTxt = l => l.auteurs.join(" et ");
const deux = n => String(n).padStart(2, "0");
const reduit = matchMedia("(prefers-reduced-motion: reduce)");

/* Stockage sûr : jamais bloquant si le navigateur refuse */
const stock = {
  lire(type, cle) { try { return JSON.parse(window[type].getItem(cle) || "null"); } catch (e) { return null; } },
  ecrire(type, cle, v) { try { v == null ? window[type].removeItem(cle) : window[type].setItem(cle, JSON.stringify(v)); } catch (e) {} }
};

/* Mesure d'audience sans donnée personnelle : seulement le nom de l'événement et l'identifiant du livre */
function mesure(evenement, details) {
  if (CFG.mesure && CFG.mesure.actif === false) return;
  const d = { event: evenement };
  if (details && details.livre) d.livre = details.livre;
  if (details && details.nb != null) d.nb = details.nb;
  if (details && details.canal) d.canal = details.canal;
  (window.dataLayer = window.dataLayer || []).push(d);
}

/* Icônes */
const IC = {
  wa: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.1.3.6 1 1.4 1.7 1 .9 1.8 1.1 2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.2 1.4Z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M15.1 8.3h-1.9c-.5 0-.9.4-.9.9v2h2.8l-.4 2.9h-2.4V21H9.4v-6.9H7.1v-2.9h2.3V9c0-2.2 1.3-3.5 3.4-3.5.9 0 1.9.1 2.3.2z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 3.2a8.8 8.8 0 0 0-7.6 13.3L3.3 20.8l4.4-1.1A8.8 8.8 0 1 0 12 3.2Zm0 16a7.2 7.2 0 0 1-3.7-1l-.3-.2-2.6.7.7-2.5-.2-.3A7.2 7.2 0 1 1 12 19.2Zm4-5.4c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a5.9 5.9 0 0 1-2.9-2.5c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4a.8.8 0 0 0-.6.3 2.5 2.5 0 0 0-.8 1.9 4.4 4.4 0 0 0 .9 2.3 10 10 0 0 0 3.8 3.4c1.4.6 2 .7 2.7.6.4-.1 1.3-.5 1.5-1s.2-1 .1-1-.2-.2-.5-.3Z"/></svg>`,
  email: `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M6 38h7V22L4 15v20a3 3 0 0 0 2 3Z"/><path fill="#34A853" d="M35 38h7a3 3 0 0 0 2-3V15l-9 7Z"/><path fill="#FBBC04" d="M35 12v10l9-7v-3c0-3.7-4.2-5.8-7.2-3.6Z"/><path fill="#EA4335" d="M13 22V12l11 8.3L35 12v10l-11 8.3Z"/><path fill="#C5221F" d="M4 12v3l9 7V12l-1.8-1.6C8.2 8.2 4 10.3 4 12Z"/></svg>`,
  fleche: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`,
  croix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>`,
  alerte: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>`,
  loupe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  sablier: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"/></svg>`,
  sac: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>`,
  lieu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`,
  plume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19.2 8.8a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>`,
  livreOuvert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5"/><circle cx="9.5" cy="9" r="1.8"/><path d="m4.5 17 4.5-4.5 4 4 2.5-2.5 4 4"/></svg>`,
  isbn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 8v8M10 8v8M13 8v8M15.5 8v8M17.5 8v8"/></svg>`,
  piece: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M7 20h10M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/></svg>`,
  bouclier: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.2 2.2 4.3-4.4"/></svg>`
};

/* ---------- Panier ---------- */
let panier = { ids: [], collection: false };
const sP = stock.lire("localStorage", "pep-panier");
if (sP && Array.isArray(sP.ids)) panier = { ids: sP.ids.filter(x => typeof x === "string").slice(0, 30), collection: !!sP.collection };
let retires = []; // titres retirés automatiquement car indisponibles

function nettoyer() {
  const dispo = new Set(LIVRES.map(l => l.id));
  const avant = panier.ids.slice();
  panier.ids = [...new Set(panier.ids)].filter(id => dispo.has(id));
  retires = avant.filter(id => !dispo.has(id)).map(id => (TOUS.find(l => l.id === id) || {}).titre || "Un livre");
  if (retires.length) sauver();
}
function sauver() { stock.ecrire("localStorage", "pep-panier", panier); majCompteur(); }
const nbArticles = () => panier.collection ? LIVRES.length : panier.ids.length;
function majCompteur(bump) {
  const n = nbArticles();
  ["nb-haut", "nb-bas"].forEach(id => {
    const p = document.getElementById(id); if (!p) return;
    p.textContent = n; p.hidden = n === 0;
    if (bump && !reduit.matches) { p.classList.remove("bump"); void p.offsetWidth; p.classList.add("bump"); }
  });
  const centre = $(".barre-mobile .centre");
  if (centre) centre.setAttribute("aria-label", n ? `Commande, ${n} ${n > 1 ? "livres" : "livre"}` : "Commande");
}
function avis(texte, annuler) { stock.ecrire("sessionStorage", "pep-avis", { texte, annuler: annuler || null }); }
function ajouter(id) {
  const l = LIVRES.find(x => x.id === id); if (!l) return false;
  if (panier.collection) {
    avis(`La collection complète a été remplacée par « ${l.titre} ».`, { collection: true, ids: [] });
    panier = { ids: [id], collection: false };
  } else if (!panier.ids.includes(id)) panier.ids.push(id);
  else { sauver(); toast("Ce livre est déjà dans votre commande"); return true; }
  sauver(); majCompteur(true); mesure("ajout_commande", { livre: id });
  toast("Ajouté à votre sélection");
  return true;
}
function choisirCollection() {
  if (!panier.collection && panier.ids.length) {
    avis(`Vos ${panier.ids.length} ${panier.ids.length > 1 ? "livres sélectionnés ont été remplacés" : "livre sélectionné a été remplacé"} par la collection complète, qui ${panier.ids.length > 1 ? "les contient" : "le contient"}.`, { collection: false, ids: panier.ids.slice() });
  }
  panier = { ids: [], collection: true };
  sauver(); majCompteur(true); mesure("ajout_commande", { livre: "collection" });
}
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2000); }

/* ---------- Devises : équivalences indicatives, le règlement reste en FCFA ----------
   EUR : parité fixe 1 € = 655,957 FCFA. USD : taux EUR/USD de la BCE (service public),
   gardé 12 h sur l'appareil ; sans réseau, le dernier taux connu ou le taux de référence. */
const DEVISES = [["XOF", "FCFA", "Francs CFA"], ["EUR", "€", "Euros"], ["USD", "$", "Dollars américains"]];
const CODES = DEVISES.map(d => d[0]);
let devise = (() => { const d = stock.lire("localStorage", "pep-devise"); return CODES.includes(d) ? d : "XOF"; })();
let taux = null, tauxEnCours = null;
const change = () => (CFG.vente && CFG.vente.change) || {};
const parite = () => (change().parite || {}).EUR || 655.957;
function tauxReference() { const r = change().usdReference || {}; return { eurUsd: r.eurUsd || 1.1, date: r.date || "", source: r.source || "BCE" }; }
const dateFr = d => d ? String(d).split("-").reverse().join("/") : "";
const deci = n => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[\u202f\u00a0]/g, " ");
function convertir(xof) {
  if (devise === "EUR") return deci(xof / parite()) + " €";
  if (devise === "USD") return deci(xof / parite() * (taux || tauxReference()).eurUsd) + " $";
  return fcfa(xof);
}
function contenuPx(xof, mode) {
  if (devise === "XOF") return esc(fcfa(xof));
  if (mode === "texte") return `${esc(fcfa(xof))} <span class="px-eq">(≈ ${esc(convertir(xof))})</span>`;
  return `<span class="px-val">≈ ${esc(convertir(xof))}</span><span class="px-ref">${esc(fcfa(xof))}</span>`;
}
const px = (xof, mode) => `<span class="px${mode ? " px-" + mode : ""}" data-xof="${Number(xof)}">${contenuPx(xof, mode)}</span>`;
function texteDevise() {
  if (devise === "EUR") return `Équivalence indicative à la parité fixe 1 € = ${String(parite()).replace(".", ",")} FCFA. Le règlement s'effectue en FCFA.`;
  if (devise === "USD") { const t = taux || tauxReference(); return `Équivalence indicative : 1 € = ${String(t.eurUsd).replace(".", ",")} $ (taux ${t.source}${t.date ? " du " + dateFr(t.date) : ""}). Le règlement s'effectue en FCFA.`; }
  return "";
}
const infoDevise = () => `<p class="devise-info" data-devise-info ${devise === "XOF" ? "hidden" : ""}>${esc(texteDevise())}</p>`;
const selecteurDevise = cls => `<div class="devises${cls ? " " + cls : ""}" role="group" aria-label="Devise d'affichage des prix" style="--i:${CODES.indexOf(devise)}"><span class="curseur" aria-hidden="true"></span>${DEVISES.map(d => `<button type="button" data-devise="${d[0]}" aria-pressed="${d[0] === devise}" aria-label="${d[2]}">${d[1]}</button>`).join("")}</div>`;
function majDevise(anime) {
  document.documentElement.dataset.deviseActive = devise;
  $$(".devises").forEach(g => { g.style.setProperty("--i", CODES.indexOf(devise)); $$("[data-devise]", g).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.devise === devise))); });
  $$(".px").forEach(el => {
    el.innerHTML = contenuPx(+el.dataset.xof, el.classList.contains("px-texte") ? "texte" : "");
    if (anime && !reduit.matches) { el.classList.remove("chg"); void el.offsetWidth; el.classList.add("chg"); }
  });
  $$("[data-devise-info]").forEach(el => { el.hidden = devise === "XOF"; el.textContent = texteDevise(); });
}
function choisirDevise(d) {
  if (!CODES.includes(d) || d === devise) return;
  devise = d; stock.ecrire("localStorage", "pep-devise", d);
  majDevise(true);
  if (d === "USD") actualiserTaux();
  mesure("devise", { canal: d });
}
function actualiserTaux() {
  if (tauxEnCours) return tauxEnCours;
  const C = change(), duree = (C.cacheHeures || 12) * 36e5, cache = stock.lire("localStorage", "pep-taux");
  if (cache && cache.eurUsd > 0) { taux = cache; if (devise === "USD") majDevise(false); if (Date.now() - (cache.recu || 0) < duree) return Promise.resolve(); }
  const essai = (url, lire) => {
    if (!url || !window.fetch) return Promise.reject(new Error("indisponible"));
    const ac = window.AbortController ? new AbortController() : null, minuterie = setTimeout(() => ac && ac.abort(), 6000);
    return fetch(url, { signal: ac ? ac.signal : undefined, cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(lire).finally(() => clearTimeout(minuterie));
  };
  const [s1, s2] = C.sources || [];
  tauxEnCours = essai(s1, j => ({ eurUsd: +j.rates.USD, date: j.date, source: "BCE" }))
    .catch(() => essai(s2, j => ({ eurUsd: +j.rates.USD, date: new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10), source: "ExchangeRate-API" })))
    .then(t => { if (!(t.eurUsd > 0.5 && t.eurUsd < 3)) throw new Error("taux"); t.recu = Date.now(); taux = t; stock.ecrire("localStorage", "pep-taux", t); })
    .catch(() => { if (!taux) taux = tauxReference(); })
    .finally(() => { tauxEnCours = null; if (devise === "USD") majDevise(false); });
  return tauxEnCours;
}

/* ---------- Assistance : contact direct de l'auteur sur WhatsApp ---------- */
const numAssistance = () => CFG.vente.whatsappAssistance || CFG.vente.whatsappCommandes;
const lienAssistance = sujet => wa(numAssistance(), "Bonjour Docteur B. Silas Gbavou, " + (sujet || "j'ai une question concernant mon paiement."));
const assistance = sujet => `<p class="assistance"><span class="pico whatsapp">${IC.whatsapp}</span><span>Une question sur votre paiement ou votre livre ? <a href="${esc(lienAssistance(sujet))}" target="_blank" rel="noopener" data-sortie="assistance">Écrivez directement à l'auteur sur WhatsApp</a>.</span></p>`;

function articles() { return panier.collection ? LIVRES : panier.ids.map(id => LIVRES.find(l => l.id === id)).filter(Boolean); }
function totalConnu() {
  if (panier.collection) return CFG.vente.prixCollection || null;
  const a = articles(); if (!a.length || a.some(l => !l.prix)) return null;
  return a.reduce((s, l) => s + l.prix, 0);
}
/* Le paiement en ligne n'est proposé que s'il est activé, vérifié, et que chaque article a son lien */
function liensPaiement() {
  const p = CFG.vente.paiementEnLigne || {};
  if (!p.actif || !p.verifie) return null;
  if (panier.collection) return CFG.vente.lienCollection ? [{ id: "collection", titre: "Collection complète", lien: CFG.vente.lienCollection, prix: CFG.vente.prixCollection }] : null;
  const a = articles();
  if (!a.length || a.some(l => !/^https:\/\//.test(l.lienPaiement || ""))) return null;
  return a.map(l => ({ id: l.id, titre: l.titre, lien: l.lienPaiement, prix: l.prix }));
}
const prixLigne = l => l.prix ? `<span class="etat-prix num">${px(l.prix)}</span>` : `<span class="etat-prix inconnu">Prix sur demande</span>`;

/* ---------- Composants ---------- */
const livre3d = (l, grand, o) => { o = o || {};
  /* o.tailles : la vitrine propose aussi la vignette, le navigateur choisit l'image nette la plus légère. */
  const src = o.tailles ? ` srcset="${mini(l)} 420w, ${l.couverture} 800w" sizes="${o.tailles}"` : "";
  const chargement = o.paresseux || !grand ? 'loading="lazy"' : (o.priorite ? 'fetchpriority="high"' : "");
  return `<div class="livre3d"><div class="vol"><div class="dos"></div><div class="pages"></div><div class="face"><img src="${grand ? l.couverture : mini(l)}"${src} alt="Couverture du livre ${esc(l.titre)}" width="${grand ? 800 : 420}" height="${grand ? 1133 : 595}" ${chargement}></div></div></div>`; };
function carte(l, titreNiveau) {
  const h = titreNiveau || "h3";
  return `<article class="carte">
    <a class="couv" href="#livre-${l.slug}" tabindex="-1" aria-hidden="true"><img src="${mini(l)}" alt="" loading="lazy" width="420" height="595">${(CFG.vente.videos || []).some(v => v.livre === l.slug) ? `<span class="badge-carte-video">${IC_LECTURE}Vidéo</span>` : ""}</a>
    <span class="theme">${esc(l.theme)}</span>
    <${h}><a href="#livre-${l.slug}">${esc(l.titre)}</a></${h}>
    <span class="auteurs">${esc(auteursTxt(l))}</span>
    ${prixLigne(l)}
    <div class="boutons">
      <a class="btn btn-capsule btn-petit" href="#livre-${l.slug}">Découvrir<span class="sr"> ${esc(l.titre)}</span></a>
      <button class="btn btn-principal btn-petit" type="button" data-procurer="${l.id}">Se procurer<span class="sr"> (acheter ${esc(l.titre)})</span></button>
    </div>
  </article>`;
}
function groupesContacts() {
  const E = CFG.editeur || {}, deMaison = c => /Providence/.test(c.label);
  const nomType = { whatsapp: "WhatsApp", email: "E-mail", facebook: "Facebook" };
  const lignes = liste => liste.map(c => ({ type: c.type, titre: nomType[c.type] || c.label, valeur: c.valeur, lien: c.lien }));
  const maison = lignes(CFG.contacts.filter(deMaison));
  if (E.facebook) maison.push({ type: "facebook", titre: "Facebook", valeur: E.facebook, lien: "" });
  if (E.adresse) maison.push({ type: "lieu", titre: "Adresse", valeur: E.adresse, lien: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(E.adresse) });
  return [
    { nom: "Docteur B. Silas Gbavou", role: "Auteur · Enseignant de la Parole", image: CFG.auteur.photoBuste, rond: true, lignes: lignes(CFG.contacts.filter(c => !deMaison(c))), appel: lienAssistance(" "), appelTexte: "Écrire à l'auteur" },
    { nom: "Providence Éditions Prestige", role: "Maison d'édition · " + (E.devise || "Édition • Qualité • Excellence"), image: E.marque, rond: false, lignes: maison, appel: wa(CFG.vente.whatsappCommandes, "Bonjour Providence Éditions Prestige, "), appelTexte: "Écrire à la maison d'édition" }
  ];
}
function ligneContact(x) {
  const corps = `<span class="pico ${x.type}">${IC[x.type] || ""}</span><span class="lc-txt"><small>${esc(x.titre)}</small><b>${esc(x.valeur)}</b></span>`;
  return x.lien
    ? `<a class="ligne-contact" href="${esc(x.lien)}" ${x.type === "email" ? "" : 'target="_blank" rel="noopener"'} data-sortie="${x.type}">${corps}<span class="fleche">${IC.fleche}</span></a>`
    : `<div class="ligne-contact">${corps}</div>`;
}
function contacts() {
  return `<div class="contacts">${groupesContacts().map(g => `<article class="fiche-contact revele">
    <header><span class="fc-visuel${g.rond ? " rond" : ""}"><img src="${esc(g.image)}" alt="" width="58" height="58" loading="lazy"></span><span><b>${esc(g.nom)}</b><small>${esc(g.role)}</small></span></header>
    <div class="fc-lignes">${g.lignes.map(ligneContact).join("")}</div>
    <a class="btn btn-wa btn-petit" href="${esc(g.appel)}" target="_blank" rel="noopener" data-sortie="whatsapp">${IC.wa}${esc(g.appelTexte)}</a>
  </article>`).join("")}</div>`;
}
const contactWA = () => CFG.contacts.find(c => c.type === "whatsapp") || { valeur: "", lien: "https://wa.me/" + CFG.vente.whatsappCommandes };
const etapes = () => `<ol class="etapes">
  ${[["Choisir", "Un livre, plusieurs, ou toute la collection."],
     ["Se procurer", "Touchez « Se procurer » : la page de paiement sécurisée s'ouvre."],
     ["Régler", "Par Mobile Money ou carte bancaire, en toute sécurité."],
     ["Recevoir", "Le PDF vous est remis automatiquement, prêt à lire."]]
    .map((e, i) => `<li class="etape revele"><div class="ruban"><b>${deux(i + 1)}</b>Étape</div><h3>${e[0]}</h3><p>${e[1]}</p></li>`).join("")}
</ol>`;
const IC_LECTURE = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z"/></svg>`;
function carteVideo(x) {
  const coll = x.livre === "collection", l = coll ? null : LIVRES.find(b => b.slug === x.livre);
  if (!coll && !l) return "";
  const titreLivre = coll ? "Tous les ouvrages du Docteur B. Silas Gbavou" : l.titre;
  const prix = coll ? null : l.prix;
  const id = coll ? "collection" : l.id;
  const appel = coll
    ? `<button class="btn btn-principal btn-petit btn-eclat" type="button" data-liste-ouvrages>Acquérir les ouvrages</button>`
    : `<button class="btn btn-principal btn-petit btn-eclat" type="button" data-procurer="${id}">Acquérir ce livre</button>`;
  return `<article class="carte-video revele">
    <div class="video-cadre ${x.format === "vertical" ? "vertical" : "horizontal"}">
      <video src="${esc(x.fichier)}" poster="${esc(afficheVideo(x))}" preload="none" playsinline controls controlslist="nodownload" aria-label="${esc(x.type + " : " + x.titre)}"></video>
      <span class="badge-video">${esc(x.type)}</span>
      <div class="video-fin" aria-hidden="true">
        <p class="vf-sur">Vous avez aimé cet aperçu ?</p>
        <p class="vf-titre">${esc(titreLivre)}</p>
        <div class="vf-actions">${appel}<button class="btn btn-capsule btn-petit" type="button" data-revoir>Revoir</button></div>
      </div>
    </div>
    <div class="cv-corps">
      ${coll ? `<img class="cv-couv" src="${esc(CFG.vente.collectionVisuel || mini(LIVRES[0]))}" alt="" width="56" height="56" loading="lazy">` : `<a href="#livre-${l.slug}" class="cv-couv-lien" tabindex="-1" aria-hidden="true"><img class="cv-couv" src="${mini(l)}" alt="" width="56" height="79" loading="lazy"></a>`}
      <div class="cv-texte">
        <h3>${esc(x.titre)}</h3>
        <p class="cv-livre">${coll ? esc(titreLivre) : `<a href="#livre-${l.slug}">${esc(l.titre)}</a>`}</p>
        ${prix ? `<p class="cv-prix num">${px(prix)}</p>` : ""}
      </div>
    </div>
    <div class="cv-actions">${appel}${coll ? `<a class="btn btn-capsule btn-petit" href="#catalogue">Voir les ouvrages</a>` : `<a class="btn btn-capsule btn-petit" href="#livre-${l.slug}">Découvrir</a>`}</div>
  </article>`;
}
/* Bande de vidéos : compacte, défilement horizontal, ouverture dans un lecteur */
function ordreVideos() {
  const V = (CFG.vente.videos || []).map((x, i) => ({ x, i })).filter(o => o.x.fichier);
  const rang = o => o.x.livre === "collection" ? 0 : /^Pr/.test(o.x.type) ? 1 : 2;
  return V.sort((a, b) => rang(a) - rang(b));
}
function bandeVideos() {
  const V = ordreVideos(); if (!V.length) return "";
  return `<section class="bande-videos" aria-labelledby="bv-titre"><div class="wrap">
    <div class="bv-tete"><span class="bv-pastille"><i></i>En vidéo</span><h2 id="bv-titre">Les ouvrages <span class="b">en vidéo</span></h2><a class="bv-tout" href="#videos">Tout voir</a></div>
    <div class="bv-rail" role="list" data-defileur="videos" data-sens="-1" data-vitesse="24">${V.map(({ x, i }) => {
      const coll = x.livre === "collection", l = coll ? null : LIVRES.find(b => b.slug === x.livre);
      if (!coll && !l) return "";
      return `<button class="bv-item" type="button" role="listitem" draggable="false" data-lecture="${i}" aria-label="Regarder : ${esc((coll ? "La collection complète" : l.titre) + " — " + x.type)}">
        <span class="bv-image"><img src="${esc(afficheVideo(x))}" alt="" loading="lazy" width="320" height="400"><span class="bv-play" aria-hidden="true">${IC_LECTURE}</span><span class="bv-type">${esc(x.type)}</span></span>
        <span class="bv-nom">${esc(coll ? "La collection complète" : l.titre)}</span>
      </button>`;
    }).join("")}</div>
  </div></section>`;
}
/* Bande d'ouvrages : couvertures en défilement continu, ouverture de la fiche au toucher */
function bandeOuvrages() {
  return `<section class="bande-ouvrages" aria-labelledby="bo-titre"><div class="wrap">
    <div class="bv-tete"><span class="bv-pastille bo-pastille"><i></i>La librairie</span><h2 id="bo-titre">Les ouvrages <span class="b">à découvrir</span></h2><a class="bv-tout" href="#catalogue">Tout le catalogue</a></div>
    <div class="bo-rail" role="list" data-defileur="ouvrages" data-sens="1" data-vitesse="30">${LIVRES.map(l => `<a class="bo-item" role="listitem" href="#livre-${l.slug}" draggable="false">
        <span class="bo-couv"><img src="${mini(l)}" alt="" loading="lazy" width="420" height="595" draggable="false">${(CFG.vente.videos || []).some(v => v.livre === l.slug && v.fichier) ? `<span class="badge-carte-video">${IC_LECTURE}Vidéo</span>` : ""}</span>
        <span class="bo-theme">${esc(l.theme)}</span>
        <span class="bo-nom">${esc(l.titre)}</span>
        ${l.prix ? `<span class="bo-prix num">${px(l.prix)}</span>` : ""}
      </a>`).join("")}</div>
  </div></section>`;
}
/* Vidéo de la collection : accès aux ouvrages un par un (sans l'offre groupée) */
const resume = l => { const t = l.sous || (l.description[0] || "").split(/(?<=\.)\s/)[0]; return t.length > 130 ? t.slice(0, 127).replace(/\s+\S*$/, "") + "…" : t; };
function listeOuvrages() {
  return `<div class="liste-ouvrages">
    <div class="lo-tete"><span class="bv-pastille"><i></i>La librairie</span><h2>Choisissez <span class="b">votre ouvrage</span></h2><p>Touchez « Se procurer » pour acquérir un livre, ou « Découvrir » pour lire sa présentation.</p></div>
    <div class="lo-liste">${LIVRES.map(l => `<article class="lo-item">
      <a href="#livre-${l.slug}" class="lo-couv" tabindex="-1" aria-hidden="true"><img src="${mini(l)}" alt="" width="64" height="91" loading="lazy"></a>
      <div class="lo-texte"><span class="lo-theme">${esc(l.theme)}</span><h3>${esc(l.titre)}</h3><p>${esc(resume(l))}</p>
        <div class="lo-bas">${l.prix ? `<b class="num">${px(l.prix)}</b>` : ""}<div class="lo-actions"><button class="btn btn-principal btn-petit" type="button" data-procurer="${l.id}">Se procurer<span class="sr"> ${esc(l.titre)}</span></button><a class="btn btn-capsule btn-petit" href="#livre-${l.slug}">Découvrir</a></div></div>
      </div></article>`).join("")}</div>
    <button class="btn btn-capsule btn-petit lo-retour" type="button" data-lecture="${(CFG.vente.videos || []).findIndex(v => v.livre === "collection")}">Revoir la vidéo</button>
  </div>`;
}
function blocVideos(filtreV, limite) {
  const v = (CFG.vente.videos || []).filter(x => x.fichier && (!filtreV || filtreV(x))).slice(0, limite || 99);
  if (!v.length) return "";
  return `<div class="grille-videos">${v.map(carteVideo).join("")}</div>`;
}

/* Note de l'éditeur : nature contributive des montants */
function noteEditeur(court) {
  if (court) return `<p class="note-editeur court"><b>NB.</b> Montant inférieur au coût de production : chaque livre est un cadeau, reçu avec un geste de soutien à l'œuvre d'édition.</p>`;
  return `<aside class="note-editeur revele" aria-labelledby="nb-titre">
    <div class="ne-texte">
      <span class="pastille-info"><i></i>Note de l'éditeur</span>
      <h2 id="nb-titre">Un cadeau, <span class="b">reçu avec un geste de soutien</span></h2>
      <p>Ces ouvrages ne sont pas publiés dans un but lucratif. Le montant fixé pour chaque livre reste même inférieur à son coût réel de production en PDF : il n'en couvre qu'une partie.</p>
      <p>Chaque titre engage en effet des dépenses importantes : rédaction, relecture doctrinale, correction, mise en page, conception graphique et diffusion. Puisque le prix n'atteint pas ce coût, chaque livre est d'abord un cadeau offert au lecteur. Et parce que toute œuvre a un coût, ce cadeau se reçoit avec un geste de soutien : votre contribution permet à la maison d'édition de faire avancer la publication des ouvrages à venir.</p>
      <a class="btn btn-capsule btn-petit" target="_blank" rel="noopener" data-sortie="soutien" href="${wa(CFG.vente.whatsappCommandes, "Bonjour Providence Éditions Prestige, je souhaite soutenir l'œuvre d'édition des livres du Docteur B. Silas Gbavou.")}">Soutenir l'œuvre d'édition</a>
    </div>
    <ul class="ne-reperes" aria-label="En résumé">
      <li><span class="pe-ico">${IC.piece}</span><b>En deçà du coût de production</b><span>Le prix ne couvre qu'une part des frais d'édition.</span></li>
      <li><span class="pe-ico">${IC.bouclier}</span><b>Un cadeau, sans but lucratif</b><span>Aucun profit commercial n'est recherché.</span></li>
      <li><span class="pe-ico">${IC.livreOuvert}</span><b>Un geste de soutien</b><span>Chaque contribution fait avancer l'œuvre d'édition.</span></li>
    </ul>
  </aside>`;
}
/* Collections : prix d'ensemble réparti au prorata, recalculé automatiquement
   (nouveau livre → dernière collection ; nouveau total → même proportion). */
function lotsCalcules() {
  const E = CFG.vente.ensemble || {}, base = CFG.vente.lots || [];
  if (!base.length) return { lots: [], total: 0, ensemble: 0 };
  const pris = new Set(base.flatMap(L => L.ids));
  const lots = base.map((L, i) => ({ ...L, livres: [...L.ids, ...(i === base.length - 1 ? LIVRES.filter(l => !pris.has(l.id)).map(l => l.id) : [])].map(id => LIVRES.find(l => l.id === id)).filter(Boolean) })).filter(L => L.livres.length);
  lots.forEach(L => { L.valeur = L.livres.reduce((s, l) => s + (l.prix || 0), 0); });
  const total = lots.reduce((s, L) => s + L.valeur, 0), pas = E.arrondi || 500;
  const ensemble = total === E.totalReference ? E.prix : Math.round(total * E.prix / E.totalReference / pas) * pas;
  let reste = ensemble;
  lots.forEach((L, i) => { L.prix = i === lots.length - 1 ? reste : Math.round(ensemble * L.valeur / total / pas) * pas; reste -= L.prix; });
  return { lots, total, ensemble };
}
function blocCollection() {
  const { lots, total: tot, ensemble: fin } = lotsCalcules();
  if (!lots.length) return "";
  return `<div class="collection">
    <div>
      <span class="pastille-info"><i></i>Collections</span>
      <h2 style="margin-top:16px">Recevez l'enseignement <span class="b-clair">par ensemble</span></h2>
      <p style="margin:14px 0 6px">Pour les leaders, les écoles bibliques et les groupes d'étude qui veulent recevoir l'enseignement dans sa cohérence.</p>
      ${tot > fin ? `<div class="offre-ensemble">
        <span class="oe-sur">Tarif d'ensemble</span>
        <p class="oe-prix num">Les ${LIVRES.length} ouvrages : ${px(fin)} <span class="oe-avant">au lieu de <del>${px(tot)}</del></span></p>
        <p class="oe-texte">Ce tarif préférentiel s'applique à l'acquisition des collections et se répartit entre elles au prorata de leur valeur. Notre démarche n'étant pas commerciale, il ne s'agit pas d'une promotion, mais d'une faveur accordée à ceux qui reçoivent l'enseignement dans son ensemble.</p>
      </div>` : ""}
      <div class="prix-collection">${selecteurDevise("devises-clair")}</div>
      ${infoDevise()}
      <div class="lots">${lots.map(L => { return `<article class="lot">
        <div class="lot-tete"><div><b>${esc(L.nom)}</b><small>${L.livres.length} ouvrages en PDF</small></div><div class="lot-prix-bloc"><p class="lot-prix num">${px(L.prix)}</p>${L.valeur > L.prix ? `<p class="lot-avant num">au lieu de <del>${px(L.valeur)}</del></p>` : ""}</div></div>
        <div class="lot-couvs" aria-hidden="true">${L.livres.map(l => `<img src="${mini(l)}" alt="" loading="lazy" width="42" height="60">`).join("")}</div>
        <p class="lot-liste">${L.livres.map(l => esc(l.titre)).join(" · ")}</p>
        <button class="btn btn-capsule btn-eclat btn-petit" type="button" data-procurer="${L.id}">Se procurer cette collection</button>
      </article>`; }).join("")}</div>
    </div>
    <div class="mur" aria-hidden="true">${LIVRES.map(l => `<img src="${mini(l)}" alt="" loading="lazy" width="420" height="595">`).join("")}</div>
  </div>`;
}
const vagues = `<svg class="vagues" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden="true">
  <defs><linearGradient id="vg1" x1="0" x2="1"><stop offset="0" stop-color="#103FA8"/><stop offset=".6" stop-color="#1450D2"/><stop offset="1" stop-color="#08A4D6"/></linearGradient></defs>
  <path d="M0 120 C 260 60 520 170 820 112 S 1260 40 1440 92 V200 H0Z" fill="#EAF3FC"/>
  <path d="M0 150 C 300 100 560 196 880 150 S 1280 90 1440 130 V200 H0Z" fill="url(#vg1)" opacity=".92"/>
  <path d="M0 168 C 340 130 620 204 940 172 S 1300 128 1440 156" fill="none" stroke="#F3C623" stroke-width="3" stroke-linecap="round"/>
  <path d="M0 184 C 360 160 660 210 980 190 S 1320 162 1440 178 V200 H0Z" fill="#fff"/>
</svg>`;
const enTete = (pastille, titre, chapeau) => `<span class="pastille-info"><i></i>${pastille}</span><h1 style="margin-top:16px">${titre}</h1>${chapeau ? `<p class="chapeau" style="margin-top:14px">${chapeau}</p>` : ""}`;

/* ---------- Pages ---------- */
function pageAccueil() {
  const A = CFG.auteur;
  const pile = ["07", "08", "01", "10", "06"].map(id => LIVRES.find(l => l.id === id)).filter(Boolean);
  const choix = ["01", "08", "06", "13"].map(id => LIVRES.find(l => l.id === id)).filter(Boolean);
  const pages = LIVRES.reduce((s, l) => s + (l.pages || 0), 0).toLocaleString("fr-FR").replace(/ | /g, " ");
  return `
  <section class="hero"><div class="wrap hero-grille">
    <div>
      <span class="pastille-info" data-enter><i></i>Librairie numérique • Providence Éditions Prestige</span>
      <h1 data-enter="2" tabindex="-1">Une librairie de référence pour <span class="b">approfondir les Écritures</span></h1>
      <p class="hero-lead" data-enter="3">Explorez l'univers littéraire et doctrinal du <span style="white-space:nowrap">Docteur B. Silas Gbavou</span>.</p>
      <div class="hero-texte" data-enter="3">
        <p>Découvrez une collection d'ouvrages consacrés à l'intelligence des Saintes Écritures, à la profondeur des mystères bibliques et à l'édification spirituelle.</p>
        <p>À travers des enseignements spirituels et prophétiques structurés, des études doctrinales approfondies et une approche rigoureuse de la Parole de Dieu, chaque ouvrage vous invite à progresser dans la connaissance des vérités de la Parole de Dieu.</p>
        <p class="hero-acces">Accédez à nos ouvrages numériques en quelques instants, où que vous soyez dans le monde.</p>
      </div>
      <ul class="atouts" data-enter="3"><li>Ouvrages numériques accessibles immédiatement en PDF</li><li>Paiement sécurisé par Mobile Money ou carte bancaire</li></ul>
      <div class="actions" data-enter="4">
        <a class="btn btn-principal btn-eclat" href="#tous-les-ouvrages" data-defile="tous-les-ouvrages">Découvrir la collection</a>
        <a class="btn btn-capsule" href="#parcours" data-defile="parcours">Comment acquérir un livre</a>
      </div>
    </div>
    <div class="vitrine" aria-hidden="true"><div class="vt-lumiere"></div>
      <div class="vt-scene">
        <svg class="vt-socle" viewBox="0 0 600 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="vtDessus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9FBFF"/><stop offset=".6" stop-color="#EDF3FC"/><stop offset="1" stop-color="#DCE7F7"/></linearGradient>
            <linearGradient id="vtTranche" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCE7F7"/><stop offset="1" stop-color="#B9CCE8"/></linearGradient>
            <linearGradient id="vtReflet" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          </defs>
          <path d="M92 14 H508 Q526 14 538 26 L582 70 Q590 78 578 78 H22 Q10 78 18 70 L62 26 Q74 14 92 14Z" fill="url(#vtDessus)"/>
          <path d="M22 78 H578 Q588 78 588 88 V96 Q588 106 576 106 H24 Q12 106 12 96 V88 Q12 78 22 78Z" fill="url(#vtTranche)"/>
          <path d="M30 78.6 H570" stroke="url(#vtReflet)" stroke-width="1.6"/>
        </svg>
        ${pile.map((l, i) => `<div class="vt-livre vt-${i + 1}"><span class="vt-ombre"></span><div class="vt-flotte">${livre3d(l, true, { tailles: i === 2 ? "(max-width: 599px) 42vw, 210px" : "(max-width: 599px) 33vw, 170px", paresseux: i === 0 || i === 4, priorite: i === 2 })}</div></div>`).join("")}
      </div>
      <p class="vt-signature"><span>Providence Éditions Prestige</span></p>
    </div>
  </div></section>

  ${bandeOuvrages()}
  ${bandeVideos()}

  <section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap">
    <div class="section-tete"><div><span class="pastille-info"><i></i>Sélection</span><h2 style="margin-top:14px">Quatre portes <span class="b">d'entrée</span></h2><p class="chapeau">L'onction, le prophétique, la prière et le ministère de la Parole.</p></div><a class="btn btn-capsule btn-petit" href="#catalogue">Tout le catalogue</a></div>
    <div class="grille">${choix.map(l => carte(l)).join("")}</div>
  </div></section>

  <section class="fond-bleu" id="parcours"><div class="wrap">
    <div class="section-tete"><div><span class="pastille-info"><i></i>Parcours de commande</span><h2 style="margin-top:14px">Acquérir un livre en <span class="b">quatre étapes</span></h2><p class="chapeau">Paiement sécurisé par Mobile Money ou carte bancaire. Une question ? L'auteur vous répond directement sur WhatsApp.</p></div></div>
    ${etapes()}
  </div></section>

  ${(CFG.vente.videos || []).some(v => v.fichier) ? `<section><div class="wrap">
    <div class="section-tete"><div><span class="pastille-info"><i></i>En vidéo</span><h2 style="margin-top:14px">Les ouvrages <span class="b">présentés en vidéo</span></h2><p class="chapeau">Découvrez l'esprit de chaque livre en quelques instants, puis acquérez-le directement.</p></div><a class="btn btn-capsule btn-petit" href="#videos">Toutes les vidéos</a></div>
    ${blocVideos(x => /^Pr/.test(x.type) && x.livre !== "collection", 3)}</div></section>` : ""}

  <section><div class="wrap">
    <div class="section-tete" id="tous-les-ouvrages"><div><span class="pastille-info"><i></i>La librairie</span><h2 style="margin-top:14px">Tous les <span class="b">ouvrages</span></h2><p class="chapeau">L'ensemble des livres du Docteur B. Silas Gbavou, réunis en ${THEMES.length} grands thèmes. Choisissez, acquérez, lisez aussitôt.</p></div><a class="btn btn-principal btn-petit" href="#catalogue">Parcourir et filtrer</a></div>
    <div class="grille">${LIVRES.map(l => carte(l)).join("")}</div>
  </div></section>

  <section style="padding-top:0"><div class="wrap">${blocCollection()}</div></section>

  <section style="padding-top:0"><div class="wrap">${noteEditeur()}</div></section>

  <section class="fond-bleu"><div class="wrap auteur-bande">
    <div class="portrait"><div class="cadre"><img src="${esc(A.photo)}" alt="Docteur B. Silas Gbavou" loading="lazy" width="960" height="1200"></div></div>
    <div>
      <span class="pastille-info"><i></i>L'auteur</span>
      <h2 style="margin-top:14px">Docteur B. Silas Gbavou</h2>
      <p class="chapeau" style="margin-top:12px">${esc(A.bioCourte)}</p>
      <p class="parole">${esc(A.citation)}</p>
      <div class="mini-galerie">${A.galerie.slice(0, 2).map(g => `<img src="${esc(g)}" alt="Docteur B. Silas Gbavou" loading="lazy" width="160" height="120">`).join("")}</div>
      <div class="actions"><a class="btn btn-principal" href="#auteur">Lire la biographie</a><a class="btn btn-capsule" href="#editeur">L'éditeur</a></div>
    </div>
  </div></section>

  <section class="faq"><div class="wrap" style="max-width:860px">
    <div class="section-tete"><div><span class="pastille-info"><i></i>Questions fréquentes</span><h2 style="margin-top:14px">Avant de vous <span class="b">procurer un livre</span></h2></div><a class="btn btn-capsule btn-petit" href="#aide">Toute l'aide</a></div>
    ${faq().slice(0, 4).join("")}
  </div></section>

  <section style="padding-top:0"><div class="wrap">
    <div class="section-tete"><div><span class="pastille-info"><i></i>Contact</span><h2 style="margin-top:14px">L'auteur et l'éditeur <span class="b">à votre écoute</span></h2><p class="chapeau">Touchez un contact pour écrire sur WhatsApp, par e-mail ou sur Facebook.</p></div><a class="btn btn-capsule btn-petit" href="#contact">Page contact</a></div>
    ${contacts()}
    ${blocNouveautes()}
  </div></section>`;
}
function blocNouveautes() {
  return `<div class="panneau" style="margin-top:22px;display:grid;gap:12px">
    <h3>Recevoir l'annonce des nouveaux livres</h3>
    <p style="color:var(--texte-2);font-size:15px">Inscription séparée de toute commande. En touchant le bouton, vous envoyez vous-même une demande d'inscription sur WhatsApp. Pour vous désinscrire à tout moment, écrivez « STOP » au même numéro.</p>
    <div><a class="btn btn-wa btn-petit" target="_blank" rel="noopener" data-sortie="nouveautes" href="${wa(CFG.vente.whatsappCommandes, "Bonjour Providence Éditions Prestige, je souhaite recevoir sur WhatsApp l'annonce des nouveaux livres du Docteur B. Silas Gbavou. (Je pourrai me désinscrire en écrivant STOP.)")}">${IC.wa}M'inscrire aux nouveautés</a></div>
  </div>`;
}
let filtre = "Tous", recherche = "";
const normal = s => s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
/* Catalogue : filtre par thème (la barre de recherche a été retirée). */
const MOTS_VIDES = new Set(["de", "la", "le", "les", "du", "des", "et", "d", "l", "un", "une", "au", "aux", "en", "sur", "pour", "livre", "livres"]);
const indexLivre = l => normal([l.titre, l.sous, l.theme, ...(l.auteurs || []), ...(l.motsCles || []), ...(l.cles || []), ...(l.description || []), ...(l.chapitres || [])].join(" ").replace(/[’']/g, " "));
const listeFiltree = () => LIVRES.filter(l => filtre === "Tous" || l.theme === filtre);
function grilleCatalogue() {
  const liste = listeFiltree();
  return liste.length ? liste.map(l => carte(l, "h2")).join("") : `<p class="chapeau" style="grid-column:1/-1">Aucun livre dans ce thème. <button class="btn btn-capsule btn-petit" type="button" data-reinit>Tout afficher</button></p>`;
}
const texteResultat = () => { const n = listeFiltree().length; return `${n} ${n > 1 ? "livres" : "livre"}${filtre !== "Tous" ? " · " + filtre : ""}`; };

/* Assistant bibliothécaire.
   Chaque besoin réunit les mots de tous les jours qu'un lecteur emploie (« je n'arrive pas à prier », « attaques la nuit », « mon appel »)
   et les livres qui traitent réellement ce sujet, du plus adapté au complément. Les explications affichées viennent des fiches des livres. */
const BESOINS = [
  /* Deux prières bien distinctes :
     — la prière personnelle d'ascension spirituelle, par la pratique des lois de l'esprit (Les Fondements légaux de la Prière) ;
     — l'intercession qui engendre et active les mouvements de Dieu, libère les distorsions et crée l'atmosphère spirituelle (La Prière qui engendre les Mouvements de Dieu). */
  { id: "priere", nom: "Ma vie de prière personnelle", dit: "faire grandir votre vie de prière personnelle par les lois spirituelles du règne de l'esprit",
    mots: ["comment prier", "apprendre a prier", "mieux prier", "prier efficacement", "prier avec efficacite", "n arrive pas a prier", "arrive pas a prier", "ma priere", "mes prieres", "vie de priere", "prieres ne sont pas exaucees", "pas exauce", "exauce", "reponse a mes prieres", "pas de resultat", "rien ne change", "grandir", "croissance", "monter", "ascension", "elever", "progresser", "niveau spirituel", "lois spirituelles", "loi ", "lois ", "principes", "regles", "semence", "semer", "sacrifice", "aumone", "parfum", "odeur", "autel", "feu spirituel", "langues", "parlement", "cieux fermes", "ciel ferme", "jeune", "jeuner", "veillee"],
    livres: ["06", "10", "12"] },
  { id: "intercession", nom: "Intercession et mouvements de Dieu", dit: "intercéder pour engendrer et activer les mouvements de Dieu dans une atmosphère spirituelle",
    mots: ["intercession", "interceder", "intercede", "intercesseur", "prier pour", "prier en faveur", "porter dans la priere", "fardeau", "enfanter", "enfantement", "engendrer", "mouvement de dieu", "mouvements de dieu", "nouveau mouvement", "reveil", "atmosphere", "climat spirituel", "distorsion", "debloquer", "ouvrir les cieux", "gloire", "visitation", "deplacement de dieu", "manifester dieu", "chaine de priere", "groupe de priere", "cellule de priere", "veiller pour"],
    livres: ["09", "11", "08"] },
  { id: "spiritualite", nom: "La haute spiritualité", dit: "comprendre la spiritualité, le monde spirituel et le fonctionnement des lois spirituelles",
    mots: ["spiritualite", "spirituel", "spirituelle", "spirituels", "monde spirituel", "regne de l esprit", "regne spirituel", "lois spirituelles", "loi spirituelle", "royaume invisible", "dimension spirituelle", "realites spirituelles", "mystere", "mysteres", "haute spiritualite", "niveau spirituel", "fonctionnement spirituel", "comment fonctionne le monde"],
    livres: ["06", "05", "02"] },
  { id: "prophetique", nom: "Comprendre le prophétique", dit: "comprendre le prophétique et la voix de Dieu",
    mots: ["prophet", "prophetie", "vision", "reve", "songe", "voix de dieu", "entendre dieu", "dieu me parle", "revelation", "discern", "voyant", "message de dieu"],
    livres: ["08", "10", "01"] },
  { id: "onction", nom: "Recevoir et garder l'onction", dit: "recevoir l'onction et la garder",
    mots: ["onction", "oint", "huile", "manteau", "garder ce que dieu", "perdu le feu", "perdre la puissance", "tiede", "froid spirituel", "dons spirituels", "mes dons"],
    livres: ["01", "04", "13"] },
  { id: "coeur", nom: "Un cœur pur et sanctifié", dit: "purifier votre cœur et vivre dans la sainteté",
    mots: ["coeur", "purete", "pur", "sanctif", "saintete", "caractere", "orgueil", "tentation", "consacr", "consecration"],
    livres: ["01", "12"] },
  { id: "identite", nom: "Mon identité en Christ", dit: "connaître votre identité et votre héritage en Christ",
    mots: ["identite", "qui je suis", "fils de dieu", "enfant de dieu", "filiation", "heritage", "valeur", "nom nouveau", "lumiere", "position en christ", "autorite du croyant", "droits"],
    livres: ["02", "12", "03"] },
  { id: "salut", nom: "Bien comprendre mon salut", dit: "comprendre en profondeur votre salut",
    mots: ["salut", "sauve", "converti", "nouveau croyant", "nouvelle naissance", "ne de nouveau", "debut", "commence", "croix", "sang de jesus", "pardon", "peche", "iniquite", "justification", "regeneration", "redemption"],
    livres: ["03", "02"] },
  { id: "delivrance", nom: "Délivrance et liberté", dit: "être délivré et marcher dans la liberté",
    mots: ["delivr", "liberer", "liberte", "attaque", "sorcel", "envout", "malediction", "maudit", "generation", "ancetre", "lignee", "famille", "autels familiaux", "demon", "oppress", "cauchemar", "blocage", "bloque", "echec", "ame captive", "possede"],
    livres: ["03", "10", "02"] },
  { id: "puissance", nom: "Miracles et puissance de Dieu", dit: "voir la puissance de Dieu se manifester",
    mots: ["miracle", "prodige", "signe", "guerison", "guerir", "malade", "puissance", "surnaturel", "manifestation", "royaume de dieu", "autorite"],
    livres: ["04", "10", "02"] },
  { id: "esprit", nom: "Le Saint-Esprit", dit: "mieux connaître le Saint-Esprit et son action",
    mots: ["saint-esprit", "saint esprit", "esprit saint", "souffle", "ruach", "bapteme", "remplir", "rempli", "parler en langues", "dispensation"],
    livres: ["10", "12", "06"] },
  { id: "presence", nom: "La présence de Dieu", dit: "vivre dans la présence de Dieu",
    mots: ["presence", "intimite", "proche de dieu", "temple", "gloire", "demeure", "adorer", "adoration", "louange", "sentir dieu", "communion", "loin de dieu", "eloigne de dieu", "sec spirituellement", "secheresse", "vide spirituel", "rallumer"],
    livres: ["12", "09", "01"] },
  { id: "invisible", nom: "Les anges et le monde invisible", dit: "comprendre les anges et le monde invisible",
    mots: ["ange", "invisible", "nuee", "temoins", "mort", "defunt", "deces", "apres la mort", "au-dela", "paradis", "ciel", "cieux", "esprits", "armee celeste", "monde spirituel"],
    livres: ["02", "04", "05"] },
  { id: "fin", nom: "La fin des temps", dit: "comprendre la fin des temps et le retour du Christ",
    mots: ["fin des temps", "fin du monde", "derniers jours", "apocalyp", "retour du christ", "retour de jesus", "enlevement", "eschat", "avenir", "antichrist", "epouse", "tribulation"],
    livres: ["07", "02", "13"] },
  { id: "appel", nom: "Mon appel et le ministère", dit: "discerner votre appel et servir Dieu",
    mots: ["appel", "vocation", "appele", "servir", "serviteur", "ministere", "pasteur", "apotre", "evangeliste", "docteur", "eglise", "cinq ministeres", "responsable", "leader", "berger"],
    livres: ["14", "13", "11"] },
  { id: "parole", nom: "Prêcher et enseigner la Parole", dit: "prêcher et enseigner la Parole avec onction",
    mots: ["precher", "predic", "enseign", "parole", "message", "sermon", "exhort", "bible", "etudier", "doctrine", "revelation"],
    livres: ["13", "14", "08"] },
  { id: "ville", nom: "Impacter ma ville et ma nation", dit: "impacter votre ville, votre nation et la société",
    mots: ["ville", "nation", "pays", "territoire", "quartier", "influence", "societe", "politique", "gouvernement", "entreprise", "media", "education", "culture", "conquete", "evangelis", "babylone"],
    livres: ["05", "04", "11"] },
  { id: "soutien", nom: "Soutenir l'œuvre de Dieu", dit: "devenir partenaire de l'œuvre de Dieu",
    mots: ["soutenir", "soutien", "partenaire", "partenariat", "donner", "offrande", "dime", "semer", "semence", "sacrifice", "aumone", "financer", "aider l oeuvre", "sponsor", "benir"],
    livres: ["11", "06"] }
];
const PROFILS = [
  { id: "tout", nom: "Je veux toute la collection", mots: ["tout", "toute la collection", "tous les livres", "collection complete", "les 14", "tous"] },
  { id: "offrir", nom: "Offrir un livre", mots: ["offrir", "cadeau", "anniversaire", "pour mon pasteur", "pour un ami", "pour ma femme", "pour mon mari"] }
];
let besoinChoisi = "", texteAssistant = "", LEXIQUE = null;
let lexiqueEnCours = null;
const chargerLexique = () => lexiqueEnCours || (lexiqueEnCours = fetch("data/concepts.json?v=20261126b").then(r => r.json()).then(d => { LEXIQUE = d; if (texteAssistant.trim()) majAssistant(false); }).catch(() => { lexiqueEnCours = null; }));
/* Propositions affichées : une sélection différente à chaque visite. */
const PROPOSITIONS = (() => { const a = BESOINS.map(b => b.id); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 8); })();
const prep = t => " " + normal(t || "").replace(/[’'ʼ]/g, " ").replace(/[^a-z0-9-]+/g, " ").replace(/\s+/g, " ") + " ";
const touche = (t, m) => m.endsWith(" ") ? t.includes(" " + m) : t.includes(" " + m) || (m.length >= 5 && t.includes(m));
const livreDispo = id => LIVRES.find(l => l.id === id);
/* Compréhension d'une phrase libre : besoins reconnus puis livres classés. */
function comprendre(phrase) {
  const t = prep(phrase);
  const besoins = BESOINS.map(b => ({ b, n: b.mots.filter(m => touche(t, m)).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
  const profil = PROFILS.find(p => p.mots.some(m => t.includes(" " + m + " ")));
  const score = {};
  besoins.forEach(({ b, n }, rang) => b.livres.forEach((id, k) => { score[id] = (score[id] || 0) + (6 + 2 * Math.min(n, 3)) * (3 - k) * (rang ? 0.6 : 1); }));
  LIVRES.forEach(l => {
    if (t.includes(prep(l.titre).trim())) score[l.id] = (score[l.id] || 0) + 20;
    (l.motsCles || []).forEach(k => { const p = prep(k).trim(); if (p.length > 4 && t.includes(" " + p + " ")) score[l.id] = (score[l.id] || 0) + (p.includes(" ") ? 14 : 4); });
  });
  /* « Prière » sans précision : on présente les deux livres de prière, chacun pour ce qu'il traite. */
  if (/ (prier|priere|prieres|prie) /.test(t) && !besoins.some(x => x.b.id === "priere" || x.b.id === "intercession")) {
    score["06"] = (score["06"] || 0) + 6; score["09"] = (score["09"] || 0) + 5; besoins.unshift({ b: { dit: "approfondir la prière (prière personnelle ou intercession)" }, n: 1 });
  }
  /* Lexique doctrinal tiré du texte intégral des livres (data/concepts.json). */
  if (LEXIQUE) {
    const vus = new Set();
    let fort = false;
    const ajoute = (table, coef) => { for (const k in table) { if (vus.has(k) || !t.includes(" " + k + " ") && !(k.length >= 6 && !k.includes(" ") && (t.includes(" " + k + "s ") || (k.endsWith("s") && t.includes(" " + k.slice(0, -1) + " "))))) continue; vus.add(k); const nb = k.split(" ").length; for (const id in table[k]) score[id] = (score[id] || 0) + table[k][id] * coef * (nb > 1 ? 1.4 : 1) + (fort && nb > 1 ? 12 + 6 * (nb - 2) : 0); } };
    ajoute(LEXIQUE.doctrines || {}, 0.7);
    fort = true; ajoute(LEXIQUE.termes || {}, 1.6);
  }
  /* Fiches des livres : titre, sous-titre, mots-clés, points clés et chapitres. */
  const motsLecteur = t.trim().split(" ").filter(w => w.length >= 5 && !MOTS_VIDES.has(w));
  LIVRES.forEach(l => {
    const fiche = prep([l.titre, l.sous, ...(l.motsCles || []), ...(l.cles || []), ...(l.chapitres || [])].join(" "));
    motsLecteur.forEach(w => { if (fiche.includes(" " + w + " ") || (w.length >= 7 && fiche.includes(" " + w.slice(0, -1)))) score[l.id] = (score[l.id] || 0) + 1.5; });
  });
  const livres = Object.entries(score).filter(([id]) => livreDispo(id)).sort((a, b) => b[1] - a[1]).map(([id]) => livreDispo(id));
  return { besoins: besoins.slice(0, 2).map(x => x.b), livres: livres.slice(0, 3), profil };
}
function lotDe(ids) { return lotsCalcules().lots.find(L => ids.every(id => L.livres.some(x => x.id === id))); }
function propositionCollection(reco) {
  const { lots, total, ensemble } = lotsCalcules();
  if (!lots.length) return "";
  const somme = reco.reduce((s, l) => s + (l.prix || 0), 0);
  const lot = reco.length > 1 ? lotDe(reco.map(l => l.id)) : null;
  const ligneLot = lot ? `<div class="aide-offre"><div><b>${esc(lot.nom)}</b><span>Ces ${reco.length} ouvrages en font partie, avec ${lot.livres.length - reco.length} autres : ${lot.livres.length} livres pour ${px(lot.prix)} au lieu de ${px(lot.valeur)}.</span></div><button type="button" class="btn btn-contour btn-petit" data-procurer="${lot.id}">Choisir ce pack</button></div>` : "";
  return `<div class="aide-plus">
    <p class="aide-plus-titre">Pour aller plus loin</p>
    ${ligneLot}
    <div class="aide-offre"><div><b>La collection complète</b><span>Les ${LIVRES.length} ouvrages du Docteur B. Silas Gbavou pour ${px(ensemble)} au lieu de ${px(total)}${somme ? ` (les ouvrages conseillés ci-dessus valent à eux seuls ${px(somme)})` : ""}.</span></div><button type="button" class="btn btn-principal btn-petit" data-procurer="collection">Choisir la collection</button></div>
  </div>`;
}
function ficheConseil(l, rang) {
  const cles = (l.cles || []).slice(0, rang ? 2 : 3);
  return `<li class="aide-livre${rang ? "" : " aide-premier"}">
    <a class="aide-couv" href="#livre-${l.slug}" aria-label="Découvrir ${esc(l.titre)}"><img src="${mini(l)}" alt="" width="420" height="595" loading="lazy"></a>
    <div class="aide-corps">
      <small>${rang ? "Lecture complémentaire" : "Ouvrage recommandé"}</small>
      <b><a href="#livre-${l.slug}">${esc(l.titre)}</a></b>
      ${l.pour ? `<p class="aide-pour"><span>Pour qui :</span> ${esc(l.pour)}</p>` : ""}
      ${cles.length ? `<p class="aide-trouve">Vous y découvrirez :</p><ul>${cles.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
      <div class="aide-pied"><span class="num">${l.pages ? l.pages + " pages · PDF" : "PDF"}${l.prix ? " · " : ""}</span>${l.prix ? px(l.prix) : ""}</div>
      <div class="aide-actions"><button type="button" class="btn btn-principal btn-petit" data-procurer="${l.id}">Se procurer ce livre</button><a class="btn btn-capsule btn-petit" href="#livre-${l.slug}">Voir le livre</a></div>
    </div></li>`;
}
function reponseAssistant() {
  let reco = [], intro = "", profil = null;
  if (besoinChoisi) {
    const B = BESOINS.find(x => x.id === besoinChoisi);
    if (B) { reco = B.livres.map(livreDispo).filter(Boolean); intro = `Ouvrages recommandés pour ${B.dit} :`; }
  } else if (texteAssistant.trim()) {
    const c = comprendre(texteAssistant); reco = c.livres; profil = c.profil;
    if (c.besoins.length) intro = `Besoin identifié : ${c.besoins.map(b => b.dit).join(", et aussi ")}. Voici les ouvrages qui y répondent :`;
    else if (reco.length) intro = "Sujet identifié dans votre demande. Voici les ouvrages qui le traitent :";
    if (profil && profil.id === "offrir" && reco.length) intro = "Ouvrages recommandés pour votre cadeau :";
  }
  if (profil && profil.id === "tout") return `<p class="assistant-intro">Vous souhaitez lire tout l'enseignement du Docteur B. Silas Gbavou : la collection complète est la meilleure solution.</p>${propositionCollection([])}`;
  if (profil && profil.id === "offrir" && !reco.length) return `<p class="assistant-intro">Pour offrir, dites-nous en quelques mots à qui (un pasteur, un jeune croyant, un intercesseur…) ou choisissez un besoin ci-dessus. Vous pouvez aussi offrir la collection complète :</p>${propositionCollection([])}`;
  if (!reco.length && texteAssistant.trim()) return `<div class="aide-vide"><p>Nous n'avons pas encore bien saisi votre demande. Essayez avec d'autres mots, par exemple « je n'arrive pas à prier » ou « je veux comprendre mon appel », ou choisissez un besoin ci-dessus.</p><a class="btn btn-wa btn-petit" target="_blank" rel="noopener" data-sortie="assistant" href="${lienAssistance("je cherche un livre qui parle de : " + texteAssistant.trim().slice(0, 200))}">${IC.wa}Demander conseil sur WhatsApp</a></div>`;
  if (!reco.length) return "";
  return `<p class="assistant-intro">${esc(intro)}</p>
    <ol class="aide-liste">${reco.map(ficheConseil).join("")}</ol>
    ${propositionCollection(reco)}
    <p class="aide-whatsapp">Une question avant de choisir ? <a target="_blank" rel="noopener" data-sortie="assistant" href="${lienAssistance("j'aimerais un conseil pour choisir un de vos livres" + (texteAssistant.trim() ? " : " + texteAssistant.trim().slice(0, 200) : besoinChoisi ? " (" + BESOINS.find(x => x.id === besoinChoisi).nom + ")" : "") + ".")}">Écrivez-nous sur WhatsApp</a>.</p>`;
}
function blocAssistant() {
  return `<aside class="assistant" aria-labelledby="assistant-titre">
    <div class="assistant-tete"><span class="assistant-ico" aria-hidden="true">${IC.livreOuvert || ""}</span><div><h2 id="assistant-titre">Assistant bibliothécaire</h2><p>Décrivez votre besoin avec vos propres mots : l'assistant identifie le sujet et sélectionne dans la librairie les ouvrages à acquérir qui y répondent.</p></div></div>
    <form class="aide-form" id="aide-form" autocomplete="off">
      <label class="sr" for="aide-q">Votre besoin, avec vos mots</label>
      <textarea id="aide-q" rows="2" maxlength="300" enterkeyhint="send" placeholder="Exemple : je veux apprendre à prier efficacement ; je porte un fardeau d'intercession pour ma ville ; je veux comprendre mon appel…">${esc(texteAssistant)}</textarea>
      <button type="submit" class="btn btn-principal">Trouver mes ouvrages</button>
    </form>
    <p class="aide-ou">Ou sélectionnez un besoin :</p>
    <div class="besoins" role="group" aria-label="Ce que vous cherchez">${BESOINS.filter(b => PROPOSITIONS.includes(b.id) || b.id === besoinChoisi).map(b => `<button type="button" class="besoin" data-besoin="${b.id}" aria-pressed="${b.id === besoinChoisi}">${esc(b.nom)}</button>`).join("")}<button type="button" class="besoin" data-besoin="tout" aria-pressed="false">Toute la collection</button></div>
    <div class="assistant-reponse" id="assistant-reponse" aria-live="polite">${reponseAssistant()}</div>
  </aside>`;
}
function majAssistant(defiler) {
  const r = $("#assistant-reponse"); if (!r) return;
  r.innerHTML = reponseAssistant();
  $$(".besoin").forEach(b => b.setAttribute("aria-pressed", b.dataset.besoin === besoinChoisi));
  if (defiler && r.firstElementChild) r.scrollIntoView({ block: "start", behavior: reduit.matches ? "auto" : "smooth" });
}
document.addEventListener("submit", e => {
  if (e.target.classList.contains("achat-form")) { e.preventDefault(); envoyerAchat(e.target); return; }
  if (e.target.id !== "aide-form") return;
  e.preventDefault(); chargerLexique();
  const q = $("#aide-q"); texteAssistant = q ? q.value : ""; besoinChoisi = "";
  if (texteAssistant.trim()) mesure("assistant");
  majAssistant(true); if (q) q.blur();
});
document.addEventListener("focusin", e => { if (e.target.id === "aide-q") chargerLexique(); });
document.addEventListener("keydown", e => {
  if (e.target.id === "aide-q" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit ? e.target.form.requestSubmit() : e.target.form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); }
});
function pageCatalogue() {
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap">
    <div class="section-tete"><div>${enTete("La librairie", `Les ouvrages du <span class="b">Docteur B. Silas Gbavou</span>`, "Doctrine, prophétie, prière, Royaume et ministère : parcourez la librairie, puis touchez une couverture pour découvrir l'ouvrage.")}</div></div>
    </div></section>
  ${bandeVideos()}
  <section style="padding-top:clamp(20px,3vw,32px)"><div class="wrap">
    ${blocAssistant()}
    <div class="outils">
      <div class="filtres" role="group" aria-label="Filtrer par thème">
        ${["Tous", ...THEMES].map(t => `<button class="filtre" type="button" data-filtre="${esc(t)}" aria-pressed="${t === filtre}">${esc(t)}</button>`).join("")}
      </div>
    </div>
    <p class="resultat" id="resultat" aria-live="polite">${esc(texteResultat())}</p>
    <div class="grille" id="grille">${grilleCatalogue()}</div>
  </div></section>
  <section style="padding-top:0"><div class="wrap">${blocCollection()}</div></section>
  <section style="padding-top:0"><div class="wrap">${noteEditeur()}</div></section>`;
}
function pageLivre(l) {
  const autres = LIVRES.filter(x => x.theme === l.theme && x.id !== l.id).concat(LIVRES.filter(x => x.theme !== l.theme)).slice(0, 3);
  const infos = [(l.pages ? l.pages + " pages" : null), l.format ? "Format " + l.format : null, "PDF", l.copyright ? "© " + l.copyright : null, l.date, l.isbn ? "ISBN " + l.isbn : null].filter(Boolean);
  const vid = (CFG.vente.videos || []).find(v => v.livre === l.slug && v.fichier);
  const urlLivre = (CFG.vente.urlCanonique || CFG.vente.urlSite || "") + "#livre-" + l.slug;
  const titreSommaire = l.sommaireType === "parties" ? "Les grandes parties" : "Au fil des chapitres";
  return `<section class="fiche"><div class="wrap">
    <nav class="fil" aria-label="Fil d'Ariane"><a href="#catalogue">Les livres</a> › ${esc(l.theme)}</nav>
    <div class="fiche-grille">
      <div class="fiche-gauche">${livre3d(l, true)}</div>
      <div>
        <span class="theme" style="margin-top:0">${esc(l.theme)}</span>
        <h1 tabindex="-1">${esc(l.titre)}</h1>
        ${l.sous ? `<p class="sous">${esc(l.sous)}</p>` : ""}
        <p class="par">Par ${esc(auteursTxt(l))}</p>
        <div class="infos">${infos.map(i => `<span>${esc(i)}</span>`).join("")}</div>
        <div class="offre">
          <div class="entete-offre"><span>Livre numérique</span><b>PDF</b></div>
          <div class="corps">
            <div class="prix-bloc">${l.prix ? `<p class="prix-ligne num">${px(l.prix)}</p>` : `<p class="prix-ligne inconnu">Prix sur demande</p>`}${selecteurDevise("devises-petit")}</div>
            ${infoDevise()}
            <button class="btn btn-principal btn-large btn-eclat" type="button" data-procurer="${l.id}">Se procurer ce livre</button>
            <button class="btn btn-capsule btn-large" type="button" data-ajouter="${l.id}">Ajouter à ma sélection</button>
            ${l.extrait ? `<a class="btn btn-contour btn-large" href="${esc(l.extrait)}" target="_blank" rel="noopener" data-sortie="extrait">Lire un extrait</a>` : ""}
            <ul class="garanties"><li>Paiement sécurisé : Mobile Money ou carte bancaire</li><li>PDF remis automatiquement après l'achat</li><li>Lecture sur téléphone, tablette ou ordinateur</li></ul>
            ${noteEditeur(true)}
            ${assistance(`j'ai une question concernant l'acquisition du livre « ${l.titre} ».`)}
          </div>
        </div>
        ${l.pour ? `<p class="pour"><b>Pour qui ?</b> ${esc(l.pour)}</p>` : ""}
        <div class="bloc"><h2>Présentation</h2>${l.description.map(p => `<p>${esc(p)}</p>`).join("")}</div>
        ${vid ? `<div class="bloc"><h2>Le livre en vidéo</h2>${blocVideos(x => x.livre === l.slug)}</div>` : ""}
        ${(l.cles || []).length ? `<div class="bloc"><h2>Ce que vous allez découvrir</h2>
          <ul class="cles">${l.cles.map((k, i) => `<li><span class="cartouche" aria-hidden="true"><small>CLÉ</small><b>${deux(i + 1)}</b></span><p>${esc(k)}</p></li>`).join("")}</ul></div>` : ""}
        ${(l.chapitres || []).length ? `<div class="bloc"><h2>${titreSommaire}</h2><ol class="bandes">${l.chapitres.map((ch, i) => `<li><span aria-hidden="true">${deux(i + 1)}</span><b>${esc(ch)}</b></li>`).join("")}</ol>
          <p class="precision">${l.sommaireType === "extraits" ? "Aperçu de quelques chapitres : ce n'est pas le sommaire complet du livre." : "Aperçu tiré du livre. Le sommaire détaillé figure dans le PDF."}</p></div>` : ""}
        ${l.citation ? `<div class="bloc"><blockquote class="citation">${esc(l.citation)}<small>${esc(l.titre)}${l.citation_page ? ", page " + l.citation_page + " du PDF" : ""}</small></blockquote></div>` : ""}
        <div class="bloc"><h2>Partager ce livre</h2><div class="partage">
          <a class="btn-reseau wa" target="_blank" rel="noopener" data-sortie="partage" href="https://wa.me/?text=${encodeURIComponent(l.titre + " — " + auteursTxt(l) + "\n" + urlLivre)}"><span class="pico whatsapp">${IC.wa}</span><span><small>Partager sur</small>WhatsApp</span></a>
          <a class="btn-reseau fb" target="_blank" rel="noopener" data-sortie="partage" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlLivre)}"><span class="pico facebook">${IC.facebook}</span><span><small>Partager sur</small>Facebook</span></a>
        </div></div>
        <div class="bloc"><h2>Vous aimerez aussi</h2><div class="reco">
          ${autres.map(x => `<a href="#livre-${x.slug}"><img src="${mini(x)}" alt="" loading="lazy" width="420" height="595"><span>${esc(x.titre)}</span></a>`).join("")}
        </div></div>
      </div>
    </div>
  </div></section>`;
}
function pageVideos() {
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap">
    <div class="section-tete"><div>${enTete("Vidéos", "Les ouvrages <span class=\"b\">en vidéo</span>", "Présentations et extraits d'enseignement : découvrez chaque livre, puis acquérez-le directement depuis la vidéo.")}</div></div>
    <h2 class="titre-groupe">Présentations des ouvrages</h2>
    ${blocVideos(x => !/^Extrait/.test(x.type))}
    <h2 class="titre-groupe">Extraits d'enseignement</h2>
    ${blocVideos(x => /^Extrait/.test(x.type)) || `<p class="chapeau">Les vidéos arrivent bientôt.</p>`}
  </div></section>`;
}
function pageAuteur() {
  const A = CFG.auteur, E = CFG.editeur;
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap auteur-bande">
    <div class="portrait"><div class="cadre"><img src="${esc(A.photo)}" alt="Docteur B. Silas Gbavou" width="960" height="1200"></div>
      <div class="sceau"><img src="${esc(E.marque)}" alt="" width="30" height="35">Providence<br>Éditions Prestige</div></div>
    <div>
      ${enTete("L'auteur", "Docteur B. Silas Gbavou", "")}
      <div class="fonctions">${A.fonctions.map(f => `<span>${esc(f)}</span>`).join("")}</div>
      ${A.bio.slice(0, 2).map(p => `<p class="chapeau" style="margin-bottom:14px">${esc(p)}</p>`).join("")}
      <p class="note">${esc(A.noteTitre)}</p>
    </div>
  </div></section>

  <section class="fond-bleu"><div class="wrap deux-col">
    <div>
      <h2>Ministère et enseignement</h2>
      ${A.bio.slice(2).map(p => `<p style="margin-top:14px;max-width:62ch">${esc(p)}</p>`).join("")}
      <p style="margin-top:14px;max-width:62ch">${esc(A.vision)}</p>
    </div>
    <div class="galerie">${A.galerie.map(g => `<img src="${esc(g)}" alt="Docteur B. Silas Gbavou" loading="lazy">`).join("")}</div>
  </div></section>

  <section><div class="wrap deux-col">
    <div>
      <h2>L'écrivain</h2>
      <p style="margin:14px 0 18px;max-width:62ch">Son activité littéraire est principalement consacrée à l'enseignement de la Parole de Dieu, à la doctrine biblique et à la formation chrétienne. Il considère l'écriture comme un moyen de préserver, de structurer et de transmettre les enseignements de la Parole de Dieu aux générations présentes et futures.</p>
      <ul class="points">${A.ecriture.map(e => `<li>${esc(e)}</li>`).join("")}</ul>
    </div>
    <div><blockquote class="citation">${esc(A.citation)}<small>Docteur B. Silas Gbavou</small></blockquote>
      <div class="actions" style="margin-top:20px"><a class="btn btn-principal" href="#catalogue">Voir ses livres</a><a class="btn btn-capsule" href="#editeur">L'éditeur</a></div></div>
  </div></section>

  <section style="padding-top:0"><div class="wrap">
    <div class="section-tete"><h2>Contacts</h2></div>
    ${contacts()}
  </div></section>`;
}
function pageEditeur() {
  const E = CFG.editeur, I = CFG.infosLegales || {};
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap deux-col">
    <div class="page-texte">
      ${enTete("L'éditeur", "Providence Éditions Prestige", `Maison d'édition de ${esc(CFG.structure)}, au ${esc(CFG.pays)}.`)}
      <p style="margin-top:16px">${esc(E.fonction)}. ${esc(E.vocation)}</p>
      <h2>Identité</h2>
      <ul>
        <li>Structure : ${esc(CFG.structure)}</li>
        <li>Pays : ${esc(CFG.pays)}</li>
        <li>Responsable : Docteur B. Silas Gbavou, promoteur et directeur général</li>
        <li>Adresse professionnelle : ${I.adresseProfessionnelle ? esc(I.adresseProfessionnelle) : "non publiée sur ce site"}</li>
        ${I.rccm ? `<li>RCCM : ${esc(I.rccm)}</li>` : ""}${I.ifu ? `<li>IFU : ${esc(I.ifu)}</li>` : ""}
      </ul>
      <h2>Savoir-faire</h2>
      <ul>${E.competences.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
      <p class="note">Philosophie éditoriale : ${esc(E.philosophie)}</p>
    </div>
    <div><div class="logo-support"><img src="${esc(E.logo)}" alt="Providence Éditions Prestige" width="300" height="229"></div>
      <p style="text-align:center;margin-top:12px;font-weight:700;color:var(--texte-2)">${esc(E.devise)}</p></div>
  </div></section>
  <section style="padding-top:0"><div class="wrap"><div class="section-tete"><h2>Contacts</h2></div>${contacts()}</div></section>`;
}
function pageConditions() {
  const I = CFG.infosLegales || {};
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap page-texte">
    ${enTete("Informations", "Conditions de vente", "Ce qu'il faut savoir avant de commander un livre numérique.")}
    <h2>Ce que vous achetez</h2>
    <p>Des livres numériques au format PDF, pour un usage personnel. Chaque fiche indique le nombre de pages et le format du livre.</p>
    <h2>Nature des montants</h2>
    <p>Les montants restent inférieurs au coût de production des ouvrages. Chaque livre est ainsi offert comme un cadeau, reçu avec une contribution qui soutient la publication des prochains ouvrages.</p>
    <h2>Paiement</h2>
    <p>Le règlement s'effectue en ligne, en FCFA, sur notre page de paiement sécurisée : Mobile Money ou carte bancaire. Les équivalences en euros ou en dollars affichées sur le site sont indicatives.</p>
    <h2>Conclusion de l'acquisition</h2>
    <p>L'acquisition est conclue à la confirmation du paiement ; le PDF vous est alors remis automatiquement. Pour toute question, l'auteur vous répond directement sur WhatsApp.</p>
    <h2>Droits d'auteur</h2>
    <p>Chaque livre est réservé à l'usage personnel de l'acquéreur. Toute reproduction, diffusion ou revente sans l'autorisation écrite de l'auteur est interdite.</p>
    <div class="liens-infos"><a class="btn btn-capsule btn-petit" href="#livraison">Livraison et problèmes</a><a class="btn btn-capsule btn-petit" href="#confidentialite">Confidentialité</a><a class="btn btn-capsule btn-petit" href="#mentions">Mentions légales</a></div>
  </div></section>`;
}
function pageMentions() {
  const I = CFG.infosLegales || {}, mail = (CFG.contacts.find(c => c.type === "email") || {}).valeur;
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap page-texte">
    ${enTete("Informations", "Mentions légales", "")}
    <h2>Éditeur du site</h2>
    <ul>
      <li>Providence Éditions Prestige, maison d'édition de ${esc(CFG.structure)} (${esc(CFG.pays)})</li>
      ${I.adresseProfessionnelle ? `<li>Adresse : ${esc(I.adresseProfessionnelle)}</li>` : ""}${I.rccm ? `<li>RCCM : ${esc(I.rccm)}</li>` : ""}${I.ifu ? `<li>IFU : ${esc(I.ifu)}</li>` : ""}
      <li>Responsable de la publication : Docteur B. Silas Gbavou, promoteur et directeur général</li>
      <li>Contact : ${mail ? esc(mail) + ", " : ""}WhatsApp ${esc(contactWA().valeur)}</li>
    </ul>
    <h2>Hébergement</h2>
    <p>GitHub Pages, service de GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
    <h2>Propriété intellectuelle</h2>
    <p>Les textes, couvertures, visuels et vidéos de ce site appartiennent à leurs auteurs et à Providence Éditions Prestige. Toute reproduction sans autorisation écrite est interdite.</p>
    <div class="liens-infos"><a class="btn btn-capsule btn-petit" href="#conditions">Conditions de vente</a><a class="btn btn-capsule btn-petit" href="#confidentialite">Confidentialité</a></div>
  </div></section>`;
}
function pageLivraison() {
  const W = CFG.contacts.find(c => c.type === "whatsapp" && c.lien.includes(numAssistance())) || contactWA();
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap page-texte">
    ${enTete("Informations", "Livraison et assistance", "Comment le livre vous parvient, et à qui écrire en cas de besoin.")}
    <h2>Comment le PDF vous est remis</h2>
    <p>Dès la confirmation du paiement, le PDF vous est remis automatiquement par notre page de paiement sécurisée. Les livres ne sont jamais déposés à une adresse publique sur ce site.</p>
    <h2>Délai</h2>
    <p>La remise intervient dès la confirmation du paiement par votre opérateur Mobile Money ou votre banque.</p>
    <h2>Si le paiement échoue</h2>
    <ul><li>Ne refaites pas le paiement tout de suite.</li><li>Gardez le message de votre opérateur Mobile Money ou de votre banque.</li><li>Écrivez à l'auteur sur WhatsApp avec ce message : il vérifie avant toute nouvelle tentative.</li></ul>
    <h2>Si vous avez payé sans recevoir le livre</h2>
    <ul><li>Envoyez à l'auteur, sur WhatsApp, votre nom, le titre du livre et la référence de paiement.</li><li>Vérifiez aussi vos courriers indésirables.</li></ul>
    <p style="margin-top:20px"><a class="btn btn-wa" target="_blank" rel="noopener" data-sortie="assistance" href="${esc(lienAssistance("j'ai une préoccupation concernant mon paiement.\nTitre du livre :\nRéférence de paiement :"))}">${IC.wa}Écrire à l'auteur</a></p>
    <p class="note">WhatsApp de l'auteur : ${esc(W.valeur)}</p>
  </div></section>`;
}
function pageConfidentialite() {
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap page-texte">
    ${enTete("Informations", "Confidentialité", "Ce que ce site garde, et ce qu'il ne garde pas.")}
    <h2>Sur votre appareil</h2>
    <ul>
      <li>La liste des livres de votre sélection et la devise d'affichage choisie restent dans votre navigateur.</li>
      <li>Le site n'a pas de base de données : il ne reçoit ni votre nom, ni votre numéro, ni votre e-mail.</li>
    </ul>
    <h2>Quand vous réglez</h2>
    <p>Le règlement s'effectue sur notre page de paiement sécurisée, qui traite seule vos données de paiement : ce site n'en reçoit aucune. Elle vous demande vos nom, e-mail et téléphone, utilisés uniquement pour vous remettre le livre et vous envoyer la confirmation. Si vous écrivez sur WhatsApp, vous envoyez vous-même votre message.</p>
    <h2>Équivalences de devises</h2>
    <p>Pour afficher une équivalence en dollars, le site peut consulter un service public de taux de change. Aucune donnée personnelle n'est transmise.</p>
    <h2>Mesure d'audience</h2>
    <p>Le site peut compter des actions anonymes (livre consulté, ajout à la sélection, ouverture de la page de paiement), sans nom, numéro ni e-mail.</p>
    <h2>Nouveautés</h2>
    <p>L'inscription aux nouveautés est séparée de la commande et jamais cochée d'avance. Pour vous désinscrire, écrivez « STOP » sur WhatsApp.</p>
    <p style="margin-top:20px"><button class="btn btn-capsule" type="button" data-effacer>Effacer les données de ce site sur mon appareil</button></p>
  </div></section>`;
}

function pageCommande() {
  const a = articles();
  const message = stock.lire("sessionStorage", "pep-avis");
  stock.ecrire("sessionStorage", "pep-avis", null);
  const bandeauRetires = retires.length ? `<div class="avis" role="status">${IC.alerte}<div>${retires.length > 1 ? "Ces livres ne sont plus disponibles et ont été retirés" : "Ce livre n'est plus disponible et a été retiré"} : ${esc(retires.join(", "))}.</div></div>` : "";
  retires = [];
  const bandeauAvis = message ? `<div class="avis" role="status">${IC.info}<div>${esc(message.texte)}${message.annuler ? `<br><button class="btn btn-capsule btn-petit" type="button" data-annuler='${esc(JSON.stringify(message.annuler))}'>Annuler ce changement</button>` : ""}</div></div>` : "";
  if (!a.length) return `<section class="commande"><div class="wrap" style="max-width:720px">${bandeauRetires}${bandeauAvis}
    <div class="panneau" style="text-align:center"><h1 tabindex="-1" style="font-size:clamp(28px,5vw,40px)">Votre sélection est vide</h1>
    <p class="chapeau" style="margin:10px auto 22px">Choisissez un ou plusieurs livres dans le catalogue.</p>
    <a class="btn btn-principal" href="#catalogue">Voir les livres</a></div></div></section>`;
  const t = totalConnu(), liens = liensPaiement();
  return `<section class="commande"><div class="wrap">
    ${enTete("Ma sélection", "Finaliser mon acquisition", "")}
    <ol class="etat-parcours" aria-label="Étapes"><li>Choix des livres</li><li aria-current="step">Règlement sécurisé</li><li>Remise du PDF</li></ol>
    ${bandeauRetires}${bandeauAvis}
    <div class="cmd-grille">
      <div class="panneau">
        <div class="panneau-tete"><h2>Vos livres <span class="num" style="color:var(--texte-2);font-weight:700">(${nbArticles()})</span></h2>${selecteurDevise("devises-petit")}</div>
        ${panier.collection
          ? `<div class="art"><img src="${mini(LIVRES[0])}" alt="" width="52" height="74"><div><b>Collection complète — ${LIVRES.length} livres</b><small>PDF · ${CFG.vente.prixCollection ? px(CFG.vente.prixCollection) : "prix sur demande"}</small></div><button class="retirer" type="button" data-vider aria-label="Retirer la collection">${IC.croix}</button></div>`
          : a.map(l => `<div class="art"><img src="${mini(l)}" alt="" width="52" height="74"><div><b>${esc(l.titre)}</b><small>${l.prix ? px(l.prix) : "Prix sur demande"}</small></div><button class="retirer" type="button" data-retirer="${l.id}" aria-label="Retirer ${esc(l.titre)}">${IC.croix}</button></div>`).join("")}
        <div class="total"><span>Total</span>${t ? `<span class="num">${px(t)}</span>` : `<span class="inconnu">Sur demande</span>`}</div>
        ${infoDevise()}
        <div class="actions" style="margin-top:16px">${panier.collection ? `<a class="btn btn-capsule btn-petit" href="#catalogue">Revenir au catalogue</a>` : `<a class="btn btn-capsule btn-petit" href="#catalogue">Ajouter un livre</a>`}</div>
      </div>
      <div class="panneau reglement">
        <h2>Règlement sécurisé</h2>
        ${saspayActif() && !panier.collection && offreSaspay("panier", a.map(l => l.id))
          ? `<p class="aide-reglement">Réglez ${a.length > 1 ? "vos " + a.length + " livres en une seule fois" : "votre livre"} sur la page de paiement sécurisée ; ${a.length > 1 ? "ils vous sont remis" : "il vous est remis"} aussitôt le règlement confirmé.</p>
          <button class="btn btn-principal btn-large" type="button" data-saspay-panier>Acquérir${a.length > 1 ? " les " + a.length + " livres" : ""}${t ? " — " + px(t) : ""}</button>`
          : liens
          ? `<p class="aide-reglement">${liens.length > 1 ? "Chaque livre se règle sur sa page de paiement sécurisée. Touchez « Acquérir » pour chacun d'eux." : "Touchez « Acquérir » : la page de paiement sécurisée s'ouvre."}</p>
          <div class="paiements">${liens.map((x, i) => `<div class="paiement-livre"><div><b>${esc(x.titre)}</b>${x.prix ? `<small class="num">${px(x.prix)}</small>` : ""}<span class="statut-ligne" aria-live="polite"></span></div><button class="btn btn-principal btn-petit" type="button" data-regler="${i}">Acquérir<span class="sr"> ${esc(x.titre)}</span></button></div>`).join("")}</div>`
          : `<div class="info">${IC.info}<span>La collection complète sera très prochainement proposée en un seul règlement sécurisé. Pour la recevoir dès maintenant, écrivez à l'auteur sur WhatsApp.</span></div>
          <a class="btn btn-wa" style="margin-top:14px" href="${esc(lienAssistance("je souhaite acquérir la collection complète de vos livres."))}" target="_blank" rel="noopener" data-sortie="assistance">${IC.wa}Demander la collection</a>`}
        <ul class="garanties" style="margin-top:18px"><li>Paiement sécurisé : Mobile Money ou carte bancaire</li><li>Règlement en FCFA, PDF remis automatiquement</li><li>Lecture sur téléphone, tablette ou ordinateur</li></ul>
        ${noteEditeur(true)}
        ${assistance("j'ai une question concernant l'acquisition de mes livres.")}
      </div>
    </div>
  </div></section>`;
}
function faq() {
  const W = CFG.contacts.find(c => c.type === "whatsapp" && c.lien.includes(numAssistance())) || contactWA();
  return [
    ["Sous quel format sont les livres ?", "En PDF, lisible sur téléphone Android ou iPhone, tablette ou ordinateur, sans application payante."],
    ["Quel est le prix ?", "Chaque fiche affiche son montant officiel en FCFA. Le sélecteur FCFA, € ou $ donne une équivalence indicative ; le règlement s'effectue toujours en FCFA."],
    ["Comment acheter un livre ?", "Touchez « Se procurer » : la page de paiement sécurisée s'ouvre (Mobile Money ou carte bancaire) et le PDF vous est remis automatiquement après le règlement."],
    ["Pourquoi ces montants ?", "Ils restent inférieurs au coût de production des livres. Chaque ouvrage est donc un cadeau, que le lecteur reçoit avec un geste de soutien à la maison d'édition pour les publications à venir."],
    ["Puis-je régler depuis l'étranger ?", "Oui, par carte bancaire. Le montant est prélevé en FCFA ; si votre carte est en euros ou en dollars, votre banque effectue la conversion."],
    ["Quand vais-je recevoir mon livre ?", "Automatiquement, dès la confirmation du paiement."],
    ["Puis-je partager mon PDF ?", "Non. Chaque livre est protégé par le droit d'auteur : toute reproduction ou revente sans l'autorisation écrite de l'auteur est interdite."],
    ["Je n'ai pas reçu mon livre.", `Écrivez à l'auteur sur WhatsApp au ${W.valeur} avec votre nom, le titre et la référence de paiement.`]
  ].map((q, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`);
}
function pageAide() {
  return `<section class="faq" style="padding-top:clamp(28px,4vw,48px)"><div class="wrap" style="max-width:860px">
    ${enTete("Aide", "Questions fréquentes", "")}
    <div style="margin-top:24px">${faq().join("")}</div>
    <div class="liens-infos"><a class="btn btn-capsule btn-petit" href="#livraison">Livraison et problèmes</a><a class="btn btn-capsule btn-petit" href="#conditions">Conditions de vente</a><a class="btn btn-capsule btn-petit" href="#confidentialite">Confidentialité</a><a class="btn btn-capsule btn-petit" href="#mentions">Mentions légales</a></div>
    <div style="margin-top:34px">${contacts()}</div>
    ${blocNouveautes()}
  </div></section>`;
}
function pageContact() {
  return `<section style="padding-top:clamp(28px,4vw,48px)"><div class="wrap">
    <div class="section-tete"><div>${enTete("Contact", "Nous <span class=\"b\">contacter</span>", "L'auteur et la maison d'édition vous répondent directement, sur WhatsApp, par e-mail ou sur Facebook.")}</div></div>
    ${contacts()}
    <div class="panneau bloc-assistance revele">
      <span class="pe-ico">${IC.bouclier}</span>
      <div><h3>Une préoccupation liée à un paiement ?</h3><p>Indiquez votre nom, le titre du livre et la référence de paiement : votre demande sera traitée plus rapidement.</p></div>
      <a class="btn btn-wa btn-petit" target="_blank" rel="noopener" data-sortie="assistance" href="${esc(lienAssistance("j'ai une préoccupation concernant mon paiement.\nTitre du livre :\nRéférence de paiement :"))}">${IC.wa}Écrire à l'auteur</a>
    </div>
    ${blocNouveautes()}
  </div></section>`;
}
function piedEditeur() {
  const E = CFG.editeur || {}, A = E.annonce; if (!A) return "";
  const [t1, t2] = A.titre.split(/ (?=au )/);
  const icones = [IC.plume, IC.livreOuvert, IC.image, IC.isbn];
  const coord = [
    E.whatsapp && { type: "whatsapp", txt: E.whatsapp, lien: "https://wa.me/" + CFG.vente.whatsappCommandes },
    E.email && { type: "email", txt: E.email, lien: "mailto:" + E.email },
    E.facebook && { type: "facebook", txt: E.facebook },
    E.adresse && { type: "lieu", txt: E.adresse, lien: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(E.adresse) }
  ].filter(Boolean);
  return `<div class="wrap pe-in">
    <div class="pe-texte revele">
      <div class="pe-marque"><span class="pe-logo"><img src="${esc(E.logo)}" alt="Providence Éditions Prestige" width="300" height="229" loading="lazy"></span>
        <div><small>La maison d'édition</small><b>Providence Éditions Prestige</b><span class="pe-devise">${esc(E.devise)}</span></div></div>
      <p class="pe-sur">${esc(A.accroche)}</p>
      <h2 id="pe-titre">${esc(t1)}${t2 ? ` <span class="b">${esc(t2)}</span>` : ""}</h2>
      <p class="pe-intro">Correction, mise en page, couverture et préparation technique : Providence Éditions Prestige accompagne les auteurs jusqu'au livre achevé.</p>
      <ul class="pe-services">${A.services.map((x, i) => `<li><span class="pe-ico">${icones[i] || IC.plume}</span>${esc(x)}</li>`).join("")}</ul>
      <div class="pe-promesse"><b>${esc(A.promesse)}</b><span>${esc(A.promesseTexte)}</span></div>
      <div class="pe-actions"><a class="btn btn-principal btn-eclat" target="_blank" rel="noopener" data-sortie="manuscrit" href="${esc(wa(CFG.vente.whatsappCommandes, "Bonjour Providence Éditions Prestige, je souhaite vous confier mon manuscrit."))}">${esc(A.appel)}</a><a class="btn btn-capsule" href="#editeur">Découvrir la maison</a></div>
      <ul class="pe-coord">${coord.map(c => `<li>${c.lien ? `<a href="${esc(c.lien)}" ${c.type === "email" ? "" : 'target="_blank" rel="noopener"'} data-sortie="${c.type}">` : "<span>"}<span class="pico ${c.type}">${IC[c.type] || ""}</span>${esc(c.txt)}${c.lien ? "</a>" : "</span>"}</li>`).join("")}</ul>
    </div>
    <div class="pe-visuels revele">${(A.visuels || []).map((v, i) => `<button type="button" class="aff aff-${i + 1}" data-agrandir="${esc(v)}" aria-label="Agrandir l'annonce ${i + 1} de Providence Éditions Prestige"><img src="${esc(v)}" alt="Annonce de Providence Éditions Prestige : ${esc(i ? A.accroche : A.titre)}" width="760" height="${i ? 760 : 950}" loading="lazy"></button>`).join("")}</div>
  </div>`;
}

/* ---------- Métadonnées par page ---------- */
function meta(titre, desc, image) {
  document.title = titre;
  $("#meta-desc").setAttribute("content", desc);
  $("#og-titre").setAttribute("content", titre);
  $("#og-desc").setAttribute("content", desc);
  const base = CFG.vente.urlCanonique || "";
  const can0 = $('link[rel="canonical"]');
  const abs = u => (/^https?:/.test(u) || !base) ? u : base + String(u).replace(/^\//, "");
  const img = abs(image || "couvertures/01-vase-d-or.jpg");
  $("#og-image").setAttribute("content", img);
  [["#tw-titre", titre], ["#tw-desc", desc], ["#tw-image", img]].forEach(([s, v]) => { const el = $(s); if (el) el.setAttribute("content", v); });
  const ou = $("#og-url"); if (ou && base && !(can0 && can0.dataset.fixe)) ou.setAttribute("content", base + location.hash);
  /* Les adresses en « # » ne sont pas des pages distinctes pour les moteurs : l'URL canonique reste l'accueil. */
  let can = $('link[rel="canonical"]');
  if (base && !(can && can.dataset.fixe)) { if (!can) { can = document.createElement("link"); can.rel = "canonical"; document.head.appendChild(can); } can.href = base; }
}
function donneesStructurees(l) {
  let s = $("#ld"); if (s) s.remove();
  if (!l) return;
  s = document.createElement("script"); s.type = "application/ld+json"; s.id = "ld";
  const d = { "@context": "https://schema.org", "@type": "Book", name: l.titre, author: l.auteurs.map(n => ({ "@type": "Person", name: n })), publisher: { "@type": "Organization", name: "Providence Éditions Prestige" }, bookFormat: "https://schema.org/EBook", inLanguage: "fr", image: (CFG.vente.urlCanonique || "") + l.couverture };
  if (l.pages) d.numberOfPages = l.pages;
  if (l.isbn) d.isbn = l.isbn;
  if ((l.motsCles || []).length) d.keywords = l.motsCles.join(", ");
  if (l.prix) d.offers = { "@type": "Offer", price: l.prix, priceCurrency: CFG.vente.devise || "XOF", ...(/^https:/.test(l.lienPaiement || "") ? { url: (CFG.vente.urlCanonique || "") + "#livre-" + l.slug, availability: "https://schema.org/InStock" } : {}) };
  s.textContent = JSON.stringify(d); document.head.appendChild(s);
}

/* ---------- Routeur ---------- */
const BASE_TITRE = "Les livres du Docteur B. Silas Gbavou — Providence Éditions Prestige";
function router() {
  const h = (location.hash || "#accueil").slice(1);
  let html, nav = h, livre = null;
  if (h.startsWith("livre-")) { livre = LIVRES.find(x => x.slug === h.slice(6)); nav = "catalogue"; html = livre ? pageLivre(livre) : pageCatalogue(); }
  else if (h === "parcours") { html = pageAccueil(); nav = "accueil"; }
  else html = ({ catalogue: pageCatalogue, commande: pageCommande, auteur: pageAuteur, aide: pageAide, videos: pageVideos, confirmation: pageCommande, contact: pageContact, editeur: pageEditeur, conditions: pageConditions, mentions: pageMentions, livraison: pageLivraison, confidentialite: pageConfidentialite, merci: pageMerci }[h] || pageAccueil)();
  if (nav === "confirmation") nav = "commande";
  if (!["accueil","catalogue","commande","auteur","aide","videos","editeur","contact"].includes(nav)) nav = ["conditions","livraison","confidentialite"].includes(nav) ? "aide" : nav === "merci" ? "commande" : "accueil";
  const lect = document.getElementById("lecteur");
  if (lect && lect.open) { const v = lect.querySelector("video"); if (v) v.pause(); try { lect.close(); } catch (err) { lect.removeAttribute("open"); } }
  vue.innerHTML = html;
  $$("[data-nav]").forEach(a => { const on = a.dataset.nav === nav; a.classList.toggle("actif", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
  if (livre) { meta(livre.titre + " — Docteur B. Silas Gbavou", (livre.description[0] || "").slice(0, 160), livre.couverture); donneesStructurees(livre); mesure("vue_livre", { livre: livre.id }); }
  else { meta(BASE_TITRE, "La librairie du Docteur B. Silas Gbavou : ouvrages doctrinaux et prophétiques en PDF, édités par Providence Éditions Prestige (Bénin)."); donneesStructurees(null); }
  if (h === "commande" && articles().length) mesure("debut_commande", { nb: nbArticles() });
  if (h === "parcours") { const p = $("#parcours"); p && p.scrollIntoView(); }
  else window.scrollTo({ top: 0, behavior: "instant" });
  if (router.fait) { const t = $("h1", vue); if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); } }
  else if (!reduit.matches) { document.documentElement.classList.add("entree"); setTimeout(() => document.documentElement.classList.remove("entree"), 1400); }
  router.fait = true;
  observer();
  if (h === "merci") suivreMerci(0);
  defileurs();
}
let io = null;
function observer() {
  if (!("IntersectionObserver" in window) || reduit.matches) return;
  document.documentElement.classList.add("anim");
  io && io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vu"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".revele:not(.vu)").forEach(el => io.observe(el));
}

/* ---------- Ouverture discrète des pages de paiement ---------- */
function ouvrir(url, canal) {
  if (!/^https:\/\//.test(url || "")) return false;
  const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
  document.body.appendChild(a); a.click(); a.remove();
  mesure("sortie", { canal: canal || "paiement" });
  return true;
}
function enLigneActif() { const p = CFG.vente.paiementEnLigne || {}; return p.actif && p.verifie; }
/* Affiche le bloc « Collections » du catalogue (les deux collections, leurs prix et leurs liens de paiement). */
function allerCollections() {
  const aller = () => { const c = $(".collection"); if (c) c.scrollIntoView({ behavior: reduit.matches ? "auto" : "smooth", block: "start" }); };
  if (location.hash === "#catalogue") aller(); else { location.hash = "catalogue"; setTimeout(aller, 350); }
}
function procurer(id) {
  if (saspayActif() && id !== "collection" && ouvrirAchat(offreSaspay(id))) return;
  const lot = (CFG.vente.lots || []).find(L => L.id === id);
  if (lot) {
    if (enLigneActif() && lot.lien && ouvrir(lot.lien, "paiement-" + lot.id)) { toast("Ouverture de la page de paiement sécurisée"); return; }
    const lc = lotsCalcules().lots.find(L => L.id === id);
    ouvrir(lienAssistance(`je souhaite acquérir ${lot.nom} (${lc ? lc.livres.length : lot.ids.length} ouvrages).`), "assistance-" + lot.id); return;
  }
  if (id === "collection") {
    if (enLigneActif() && CFG.vente.lienCollection && ouvrir(CFG.vente.lienCollection, "paiement-collection")) { toast("Ouverture de la page de paiement sécurisée"); return; }
    if (!CFG.vente.lienCollection && lotsCalcules().lots.length) { allerCollections(); return; }
    choisirCollection(); location.hash === "#commande" ? router() : (location.hash = "commande"); return;
  }
  const l = LIVRES.find(x => x.id === id); if (!l) return;
  if (enLigneActif() && ouvrir(l.lienPaiement, "paiement-livre")) { mesure("debut_achat", { livre: id }); toast("Ouverture de la page de paiement sécurisée"); return; }
  if (ajouter(id)) location.hash = "commande";
}

/* ---------- Paiement direct SasPay (interrupteur : CFG.vente.saspay.actif) ----------
   Nom et e-mail sont demandés ici, sur la boutique ; le paiement s'ouvre ensuite dans le même onglet
   sur la page sécurisée SasPay. La livraison n'a lieu qu'après vérification par notre serveur. */
function saspayActif() {
  const s = CFG.vente.saspay || {};
  if (!/^https:\/\//.test(s.api || "")) return false;
  if (s.actif) return true;
  try { if (/[?&]saspay=essai\b/.test(location.search)) sessionStorage.setItem("pep-saspay", "1"); return sessionStorage.getItem("pep-saspay") === "1"; } catch (e) { return false; }
}
const API_SASPAY = () => (CFG.vente.saspay || {}).api.replace(/\/$/, "");
function offreSaspay(id, ids) {
  const lc = lotsCalcules().lots.find(L => L.id === id);
  if (lc) return { offre: id, titre: lc.nom, detail: lc.livres.length + " ouvrages", montant: lc.prix, couv: lc.livres[0] };
  if (id === "panier") { const a = (ids || []).map(i => LIVRES.find(l => l.id === i)).filter(l => l && l.prix); if (!a.length) return null;
    return a.length === 1 ? offreSaspay(a[0].id) : { offre: "panier", ids: a.map(l => l.id), titre: a.length + " ouvrages", detail: a.map(l => l.titre).join(" · "), montant: a.reduce((s, l) => s + l.prix, 0), couv: a[0] }; }
  const l = LIVRES.find(x => x.id === id); if (!l || !l.prix) return null;
  return { offre: l.id, titre: l.titre, detail: "Livre numérique PDF", montant: l.prix, couv: l };
}
function ouvrirAchat(o) {
  const d = $("#achat"); if (!d || !o) return false;
  let m = {}; try { m = JSON.parse(localStorage.getItem("pep-acheteur") || "{}"); } catch (e) {}
  $(".achat-corps", d).innerHTML = `<form class="achat-form" novalidate data-offre='${esc(JSON.stringify({ offre: o.offre, ids: o.ids }))}'>
    <span class="pastille-info"><i></i>Acquisition</span>
    <h2>Recevoir <span class="b">mon ouvrage</span></h2>
    <div class="achat-recap"><img src="${mini(o.couv)}" alt="" width="52" height="74"><div><b>${esc(o.titre)}</b><small>${esc(o.detail)}</small></div><span class="num">${px(o.montant)}</span></div>
    <label class="champ"><span>Votre nom</span><input name="nom" autocomplete="name" required minlength="2" maxlength="100" value="${esc(m.nom || "")}"></label>
    <label class="champ"><span>Votre adresse e-mail</span><input name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254" value="${esc(m.email || "")}"></label>
    <p class="achat-note">Vos livres vous sont remis dès la confirmation du paiement. Cette adresse sert à vous les retrouver en cas de besoin.</p>
    <p class="achat-erreur" role="alert" aria-live="assertive"></p>
    <button class="btn btn-principal btn-large" type="submit">Continuer vers le paiement sécurisé</button>
    <ul class="garanties"><li>Mobile Money, en FCFA</li><li>Page de paiement sécurisée SasPay</li></ul>
  </form>`;
  try { d.showModal(); } catch (e) { d.setAttribute("open", ""); }
  const champ = $(m.nom ? (m.email ? "button[type=submit]" : "input[name=email]") : "input[name=nom]", d); champ && champ.focus();
  mesure("debut_achat", { offre: o.offre, canal: "saspay" });
  return true;
}
async function envoyerAchat(f) {
  const b = $("button[type=submit]", f), err = $(".achat-erreur", f);
  if (b.getAttribute("aria-busy") === "true") return;
  const nom = f.nom.value.trim(), email = f.email.value.trim();
  err.textContent = "";
  if (nom.length < 2) { err.textContent = "Indiquez votre nom."; f.nom.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = "Vérifiez votre adresse e-mail."; f.email.focus(); return; }
  try { localStorage.setItem("pep-acheteur", JSON.stringify({ nom, email })); } catch (e) {}
  b.setAttribute("aria-busy", "true"); const t0 = b.textContent; b.textContent = "Ouverture du paiement sécurisé…";
  try {
    const r = await fetch(API_SASPAY() + "/api/paiement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(f.dataset.offre), nom, email }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && /^https:\/\//.test(j.url || "")) { mesure("sortie", { canal: "saspay" }); location.assign(j.url); return; }
    err.textContent = j.erreur || "Le paiement n'a pas pu s'ouvrir. Réessayez dans un instant.";
  } catch (e) { err.textContent = "Connexion impossible. Vérifiez votre réseau, puis réessayez."; }
  b.removeAttribute("aria-busy"); b.textContent = t0;
}
/* Page de remise des livres (retour de SasPay) : l'état vient du serveur, jamais de l'adresse. */
function paramsCommande() { const p = new URLSearchParams(location.search); const c = p.get("commande"), a = p.get("acces"); return /^[0-9a-f-]{36}$/i.test(c || "") && /^[a-f0-9]{64}$/.test(a || "") ? { c, a } : null; }
function pageMerci() {
  return `<section class="commande"><div class="wrap" style="max-width:760px">
    <ol class="etat-parcours" aria-label="Étapes"><li>Choix des livres</li><li>Règlement sécurisé</li><li aria-current="step">Remise du PDF</li></ol>
    <div class="panneau merci" id="merci" aria-live="polite">${paramsCommande() ? `<div class="merci-attente"><span class="roue" aria-hidden="true"></span><h1 tabindex="-1">Paiement en cours de vérification</h1><p>Nous confirmons votre règlement auprès de SasPay. Cela prend généralement quelques secondes.</p></div>`
      : `<h1 tabindex="-1">Lien incomplet</h1><p>Ouvrez le lien reçu par e-mail, ou écrivez-nous : nous vous renverrons vos livres.</p>${assistance("je n'arrive pas à récupérer mes livres après paiement.")}`}</div>
  </div></section>`;
}
let suiviMerci = 0;
async function suivreMerci(essai) {
  const p = paramsCommande(), z = $("#merci"); if (!p || !z || location.hash !== "#merci") return;
  clearTimeout(suiviMerci);
  let j = null;
  try { const r = await fetch(`${API_SASPAY()}/api/commande?commande=${encodeURIComponent(p.c)}&acces=${p.a}`); j = await r.json(); if (!r.ok) j = { etat: "refus", erreur: j.erreur }; } catch (e) { j = { etat: "reseau" }; }
  if (!$("#merci")) return;
  if (j.etat === "payee") {
    mesure("achat_confirme", { offre: j.titre });
    z.innerHTML = `<span class="pastille-info"><i></i>Paiement confirmé</span>
      <h1 tabindex="-1">Merci. Vos ouvrages <span class="b">vous attendent</span></h1>
      <p class="chapeau">${esc(j.titre)} — référence ${esc(p.c.slice(0, 8).toUpperCase())}</p>
      <div class="merci-livres">${j.livres.map(x => { const l = LIVRES.find(b => b.id === x.id); return `<div class="art"><img src="${l ? mini(l) : ""}" alt="" width="52" height="74"><div><b>${esc(x.titre)}</b><small>PDF</small></div><a class="btn btn-principal btn-petit" href="${esc(x.url)}" download>Télécharger mon livre</a></div>`; }).join("")}</div>
      <div class="info">${IC.info}<span>${j.emailEnvoye ? `Un e-mail avec vos liens a été envoyé à ${esc(j.email)}.` : "Gardez cette page dans vos favoris : son adresse vous permet de retélécharger vos livres à tout moment."}</span></div>
      ${assistance("j'ai une question au sujet de ma commande " + p.c.slice(0, 8).toUpperCase() + ".")}`;
    return;
  }
  if (j.etat === "refus" || j.etat === "abandonnee") { z.innerHTML = `<h1 tabindex="-1">Commande introuvable</h1><p>${esc(j.erreur || "Ce paiement n'a pas abouti.")} Aucun montant n'est perçu sans paiement confirmé.</p><a class="btn btn-principal" href="#catalogue">Revenir à la librairie</a>${assistance("ma commande " + p.c.slice(0, 8).toUpperCase() + " n'apparaît pas.")}`; return; }
  const n = (essai || 0) + 1;
  if (n > 60) { z.innerHTML = `<h1 tabindex="-1">Paiement non confirmé pour l'instant</h1><p>Si vous avez réglé, la confirmation peut prendre quelques minutes : revenez sur cette page plus tard, vos livres y seront. Aucun livre n'est remis sans paiement confirmé.</p><button class="btn btn-principal" type="button" data-reverifier>Vérifier à nouveau</button>${assistance("j'ai payé la commande " + p.c.slice(0, 8).toUpperCase() + " mais je n'ai pas encore mes livres.")}`; return; }
  suiviMerci = setTimeout(() => suivreMerci(n), n < 10 ? 3000 : 6000);
}
/* ---------- Défilement continu des bandes (ouvrages, vidéos) ----------
   Le défilement est natif (doigt, souris, molette, clavier) ; l'animation avance la position
   au rythme du temps réellement écoulé (requestAnimationFrame) et s'efface dès que le visiteur
   agit. Boucle sans fin : des copies décoratives (aria-hidden, hors tabulation) entourent la
   liste ; la position est ramenée d'un cycle exact quand c'est invisible. */
const DEF_POS = {};
let DEF = [], defRAF = 0, defT = 0, videoEnCours = false;

function defileurs() {
  DEF.forEach(d => d.detruire()); DEF = [];
  if (reduit.matches) return;
  $$("[data-defileur]", vue).forEach(el => { const d = creerDefileur(el); if (d) DEF.push(d); });
  if (DEF.length && !defRAF) { defT = 0; defRAF = requestAnimationFrame(defBoucle); }
}
function creerDefileur(el) {
  const originaux = [...el.children];
  if (originaux.length < 3) return null;
  const d = { el, nom: el.dataset.defileur, sens: +el.dataset.sens || 1, vitesse: +el.dataset.vitesse || 28,
    U: 0, base: 0, m: 0, survolT: 0, pos: 0, ecrit: -1, f: 0, visible: true, survol: false, focus: false, appui: false, dernier: -1e9, glisse: null };
  el.classList.add("defileur");
  const copie = it => { const c = it.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.setAttribute("data-copie", ""); c.removeAttribute("role");
    c.tabIndex = -1; $$("a,button,[tabindex]", c).forEach(x => { x.tabIndex = -1; }); return c; };
  const mesurer = () => {
    const cw = el.clientWidth; if (!cw) return false;
    const g = parseFloat(getComputedStyle(el).columnGap) || 0;
    const a = originaux[0], z = originaux[originaux.length - 1];
    const U = (z.offsetLeft + z.offsetWidth + g) - a.offsetLeft;
    if (U <= 0) return false;
    const m = Math.ceil(cw / U) + 1;
    if (m !== d.m) {
      $$("[data-copie]", el).forEach(x => x.remove());
      const avant = document.createDocumentFragment(), apres = document.createDocumentFragment();
      for (let k = 0; k < m; k++) originaux.forEach(it => { avant.appendChild(copie(it)); apres.appendChild(copie(it)); });
      el.insertBefore(avant, originaux[0]); el.appendChild(apres); d.m = m;
    }
    const decal = d.U ? (((d.pos - d.base) % d.U) + d.U) % d.U : (DEF_POS[d.nom] || 0);
    d.U = U; d.base = originaux[0].offsetLeft - el.firstElementChild.offsetLeft;
    d.pos = d.base + (decal % U); el.scrollLeft = d.pos; d.ecrit = el.scrollLeft;
    return true;
  };
  const maintenant = () => performance.now();
  const ev = [];
  const on = (cible, type, fn, opt) => { cible.addEventListener(type, fn, opt); ev.push([cible, type, fn, opt]); };
  on(el, "scroll", () => { if (Math.abs(el.scrollLeft - d.ecrit) > 1.5) { d.pos = el.scrollLeft; d.ecrit = el.scrollLeft; d.dernier = maintenant(); } }, { passive: true });
  on(el, "wheel", () => { d.dernier = maintenant(); }, { passive: true });
  /* Survol à la souris : pause tant que le curseur bouge sur la bande ; un curseur immobile
     (par exemple au retour d'une fiche) laisse la bande repartir d'elle-même. */
  on(el, "pointerenter", e => { if (e.pointerType === "mouse") { d.survol = true; d.survolT = maintenant(); } });
  on(el, "pointermove", e => { if (e.pointerType === "mouse") { d.survol = true; d.survolT = maintenant(); } }, { passive: true });
  on(el, "pointerleave", e => { if (e.pointerType === "mouse") { d.survol = false; d.dernier = maintenant(); } });
  /* Pause au focus clavier seulement (un toucher ou un clic ne doit pas figer la bande). */
  on(el, "focusin", e => { let v = false; try { v = e.target.matches(":focus-visible"); } catch (er) {} d.focus = v; });
  on(el, "focusout", e => { if (!el.contains(e.relatedTarget)) { d.focus = false; d.dernier = maintenant(); } });
  /* Doigt : défilement natif du navigateur ; l'animation cède la main pendant le geste. */
  on(el, "pointerdown", e => {
    d.appui = true; d.dernier = maintenant();
    if (e.pointerType === "mouse" && e.button === 0) d.glisse = { x: e.clientX, s: el.scrollLeft, bouge: false, id: e.pointerId };
  });
  /* Souris : glisser-déposer horizontal sur ordinateur, sans déclencher de clic involontaire. */
  on(el, "pointermove", e => {
    const g = d.glisse; if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    if (!g.bouge && Math.abs(dx) > 6) { g.bouge = true; el.classList.add("glisse"); try { el.setPointerCapture(e.pointerId); } catch (er) {} }
    if (g.bouge) { el.scrollLeft = g.s - dx; d.pos = el.scrollLeft; d.ecrit = el.scrollLeft; d.dernier = maintenant(); }
  });
  const fin = () => { d.appui = false; d.dernier = maintenant(); if (d.glisse) { const b = d.glisse.bouge; d.glisse = null; el.classList.remove("glisse"); if (b) d.annulerClic = maintenant(); } };
  on(el, "pointerup", fin); on(el, "pointercancel", fin); on(el, "lostpointercapture", fin);
  on(el, "click", e => { if (d.annulerClic && maintenant() - d.annulerClic < 400) { e.preventDefault(); e.stopPropagation(); d.annulerClic = 0; return; }
    if (e.target.closest("a,button")) DEF_POS[d.nom] = (((d.pos - d.base) % d.U) + d.U) % d.U; }, true);
  on(el, "dragstart", e => e.preventDefault());
  const vis = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(x => { d.visible = x.isIntersecting; })) : null;
  vis && vis.observe(el);
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => { if (d.U) mesurer(); }) : null;
  ro && ro.observe(el);
  d.detruire = () => { ev.forEach(([c, t, f, o]) => c.removeEventListener(t, f, o)); vis && vis.disconnect(); ro && ro.disconnect(); };
  d.mesurer = mesurer; d.pret = mesurer();
  return d;
}
function defBoucle(t) {
  if (!DEF.length) { defRAF = 0; return; }
  defRAF = requestAnimationFrame(defBoucle);
  const dt = defT ? Math.min(0.05, (t - defT) / 1000) : 0; defT = t;
  if (document.hidden || !dt) return;
  const lect = document.getElementById("lecteur"), bloque = videoEnCours || !!(lect && lect.open);
  for (const d of DEF) {
    if (!d.pret) { d.pret = d.mesurer(); continue; }
    const recent = t - d.dernier < 1500;
    if (d.appui || recent) { d.f = 0; continue; }
    const libre = !bloque && d.visible && !(d.survol && t - d.survolT < 2500) && !d.focus;
    d.f += ((libre ? 1 : 0) - d.f) * Math.min(1, dt * (libre ? 1.4 : 7));
    if (!libre && d.f < 0.003) { d.f = 0; continue; }
    if (!d.visible) continue;
    d.pos += d.sens * d.vitesse * d.f * dt;
    if (d.pos >= d.base + d.U) d.pos -= d.U; else if (d.pos < d.base) d.pos += d.U;
    d.el.scrollLeft = d.pos; d.ecrit = d.el.scrollLeft;
    DEF_POS[d.nom] = d.pos - d.base;
  }
}
document.addEventListener("play", e => { if (e.target.tagName === "VIDEO") videoEnCours = true; }, true);
document.addEventListener("pause", e => { if (e.target.tagName === "VIDEO") videoEnCours = $$("video").some(v => !v.paused && !v.ended); }, true);
document.addEventListener("ended", e => { if (e.target.tagName === "VIDEO") videoEnCours = $$("video").some(v => !v.paused && !v.ended); }, true);
reduit.addEventListener && reduit.addEventListener("change", () => { if (router.fait) router(); });

/* ---------- Actions ---------- */
document.addEventListener("click", e => {
  const s = e.target.closest("[data-sortie]");
  if (s) mesure("sortie", { canal: s.dataset.sortie });
  const ev = e.target.closest("[data-evitement]");
  if (ev) { e.preventDefault(); vue.focus(); return; }
  const df = e.target.closest("[data-defile]");
  if (df) { e.preventDefault(); const c = document.getElementById(df.dataset.defile); if (c) { c.scrollIntoView({ behavior: reduit.matches ? "auto" : "smooth" }); const h = $("h2", c); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } } return; }
  if (e.target.closest("[data-haut]")) { window.scrollTo({ top: 0, behavior: reduit.matches ? "auto" : "smooth" }); return; }
  const bs = e.target.closest("[data-besoin]");
  if (bs) { const v = bs.dataset.besoin; if (v === "tout") { besoinChoisi = ""; texteAssistant = "toute la collection"; const q = $("#aide-q"); if (q) q.value = ""; } else { besoinChoisi = besoinChoisi === v ? "" : v; texteAssistant = ""; const q = $("#aide-q"); if (q) q.value = ""; } majAssistant(!!(besoinChoisi || texteAssistant)); if (v === "tout") texteAssistant = ""; return; }
  const pr = e.target.closest("[data-procurer]");
  if (pr) { procurer(pr.dataset.procurer); return; }
  const dv = e.target.closest("button[data-devise]");
  if (dv) { choisirDevise(dv.dataset.devise); return; }
  const ag = e.target.closest("[data-agrandir]");
  if (ag) { const d = $("#visionneuse"); $("img", d).src = ag.dataset.agrandir; $("img", d).alt = $("img", ag).alt; try { d.showModal(); } catch (err) { d.setAttribute("open", ""); } return; }
  if (e.target.closest("[data-fermer]") || e.target.id === "visionneuse") { const d = $("#visionneuse"); try { d.close(); } catch (err) { d.removeAttribute("open"); } return; }
  const lo = e.target.closest("[data-liste-ouvrages]");
  if (lo) {
    const d = $("#lecteur"); if (!d) return;
    $$("video").forEach(v => v.pause());
    $(".lecteur-corps", d).innerHTML = listeOuvrages(); d.classList.add("mode-liste");
    if (!d.open) { try { d.showModal(); } catch (err) { d.setAttribute("open", ""); } }
    $(".lecteur-corps", d).scrollTop = 0; mesure("liste_ouvrages", { canal: "video-collection" }); return;
  }
  const lc = e.target.closest("[data-lecture]");
  if (lc) {
    const x = (CFG.vente.videos || [])[+lc.dataset.lecture], d = $("#lecteur"); if (!x || !d) return;
    d.classList.remove("mode-liste");
    $(".lecteur-corps", d).innerHTML = carteVideo(x);
    $$(".revele", d).forEach(el => el.classList.add("vu"));
    try { d.showModal(); } catch (err) { d.setAttribute("open", ""); }
    const v = $("video", d); if (v) { v.preload = "auto"; v.play().catch(() => {}); }
    mesure("video_ouverte", { livre: x.livre }); return;
  }
  if (e.target.closest("[data-fermer-lecteur]") || e.target.id === "lecteur") { const d = $("#lecteur"); const v = $("video", d); if (v) v.pause(); try { d.close(); } catch (err) { d.removeAttribute("open"); } return; }
  const rv = e.target.closest("[data-revoir]");
  if (rv) { const c = rv.closest(".video-cadre"), v = c && $("video", c); if (v) { c.classList.remove("fini"); v.currentTime = 0; v.play().catch(() => {}); } return; }
  if (e.target.closest("[data-saspay-panier]")) { ouvrirAchat(offreSaspay("panier", articles().map(l => l.id))); return; }
  if (e.target.closest("[data-fermer-achat]") || e.target.id === "achat") { const d = $("#achat"); try { d.close(); } catch (err) { d.removeAttribute("open"); } return; }
  if (e.target.closest("[data-reverifier]")) { const z = $("#merci"); if (z) z.innerHTML = `<div class="merci-attente"><span class="roue" aria-hidden="true"></span><h1 tabindex="-1">Vérification en cours…</h1></div>`; suivreMerci(0); return; }
  const rg = e.target.closest("[data-regler]");
  if (rg) {
    const L = liensPaiement(), x = L && L[+rg.dataset.regler];
    if (x && ouvrir(x.lien, "paiement-commande")) {
      mesure("debut_achat", { livre: x.id });
      const ligne = rg.closest(".paiement-livre"), st = ligne && $(".statut-ligne", ligne);
      if (ligne) ligne.classList.add("ouvert");
      if (st) st.textContent = "Page de paiement ouverte";
      rg.childNodes[0].nodeValue = "Rouvrir";
      toast("Ouverture de la page de paiement sécurisée");
    }
    return;
  }
  const t = e.target.closest("[data-acheter],[data-ajouter],[data-collection],[data-retirer],[data-vider],[data-filtre],[data-reinit],[data-annuler],[data-effacer]");
  if (!t) return;
  if (t.dataset.filtre !== undefined) {
    filtre = t.dataset.filtre;
    $$(".filtre").forEach(b => b.setAttribute("aria-pressed", b.dataset.filtre === filtre));
    $("#grille").innerHTML = grilleCatalogue(); $("#resultat").textContent = texteResultat(); return;
  }
  if (t.hasAttribute("data-reinit")) { filtre = "Tous"; recherche = ""; router(); return; }
  if (t.dataset.acheter) { if (ajouter(t.dataset.acheter)) location.hash = "commande"; return; }
  if (t.dataset.ajouter) { ajouter(t.dataset.ajouter); return; }
  if (t.hasAttribute("data-collection")) { choisirCollection(); location.hash === "#commande" ? router() : (location.hash = "commande"); return; }
  if (t.dataset.retirer) { panier.ids = panier.ids.filter(i => i !== t.dataset.retirer); sauver(); toast("Livre retiré"); router(); return; }
  if (t.hasAttribute("data-vider")) { panier = { ids: [], collection: false }; sauver(); toast("Collection retirée"); router(); return; }
  if (t.dataset.annuler) { try { const p = JSON.parse(t.dataset.annuler); panier = { ids: (p.ids || []).filter(id => LIVRES.some(l => l.id === id)), collection: !!p.collection }; sauver(); toast("Changement annulé"); router(); } catch (err) {} return; }
  if (t.hasAttribute("data-effacer")) {
    ["pep-panier", "pep-devise", "pep-taux"].forEach(k => stock.ecrire("localStorage", k, null));
    devise = "XOF"; taux = null; majDevise(false);
    ["pep-brouillon", "pep-derniere", "pep-avis"].forEach(k => stock.ecrire("sessionStorage", k, null));
    panier = { ids: [], collection: false }; majCompteur(); toast("Données effacées de cet appareil"); return;
  }
});
document.addEventListener("input", e => {
});
/* Le dock se retire pendant la saisie (clavier ouvert) pour ne pas masquer les champs */
document.addEventListener("focusin", e => { if (e.target.matches("input,select,textarea")) $(".barre-mobile").classList.add("masque"); });
document.addEventListener("focusout", e => { if (e.target.matches("input,select,textarea")) setTimeout(() => { if (!document.activeElement.matches("input,select,textarea")) $(".barre-mobile").classList.remove("masque"); }, 60); });
window.addEventListener("hashchange", router);
document.addEventListener("ended", e => { if (e.target.tagName === "VIDEO") { const c = e.target.closest(".video-cadre"); if (c) { c.classList.add("fini"); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (er) {} } const v = (CFG.vente.videos || []).find(x => e.target.src.endsWith(x.fichier)); mesure("video_terminee", { livre: v && v.livre }); } }, true);
document.addEventListener("play", e => { if (e.target.tagName === "VIDEO") { $$("video").forEach(v => { if (v !== e.target) v.pause(); }); const c = e.target.closest(".video-cadre"); if (c) c.classList.remove("fini"); } }, true);
const entete = document.getElementById("entete");
const surDefilement = () => entete && entete.classList.toggle("defile", scrollY > 24);
window.addEventListener("scroll", surDefilement, { passive: true }); surDefilement();

/* ---------- Chargement ---------- */
vue.innerHTML = `<p class="chargement">Chargement de la bibliothèque…</p>`;
Promise.all([fetch("data/livres.json?v=20261126b", { cache: "no-cache" }).then(r => r.json()), fetch("data/config.json?v=20261126b", { cache: "no-cache" }).then(r => r.json())])
  .then(([l, c]) => {
    /* Tolérance aux fiches saisies depuis la plateforme de gestion */
    const sl = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    l = (l || []).filter(x => x && x.titre).map((x, i) => {
      const y = { ...x };
      y.slug = y.slug || sl(y.titre); y.id = String(y.id || y.slug);
      ["auteurs", "description", "cles", "chapitres"].forEach(k => { y[k] = (Array.isArray(y[k]) ? y[k] : (y[k] ? [y[k]] : [])).filter(Boolean); });
      if (!y.auteurs.length) y.auteurs = ["Docteur B. Silas Gbavou"];
      y.prix = +y.prix || 0; y.pages = +y.pages || 0; y.devise = y.devise || "FCFA";
      return y;
    });
    c.vente = c.vente || {}; c.vente.videos = (c.vente.videos || []).filter(v => v && v.fichier);
    (c.vente.lots || []).forEach(L => { L.ids = (L.ids || []).map(String); });
    TOUS = l; LIVRES = l.filter(x => x.disponible !== false); CFG = c;
    THEMES = [...new Set(LIVRES.map(x => x.theme))];
    if ((CFG.vente.videos || []).some(v => v.fichier)) document.getElementById("nav-videos").hidden = false;
    $("#pied-contacts").innerHTML = CFG.contacts.map(x => `<a href="${esc(x.lien)}" ${x.type === "email" ? "" : 'target="_blank" rel="noopener"'} data-sortie="${x.type}"><span class="pico ${x.type}">${IC[x.type] || ""}</span><span><small>${esc(x.label)}</small>${esc(x.type === "facebook" ? "Page Facebook" : x.valeur)}</span></a>`).join("");
    const pe = document.getElementById("pied-editeur"); if (pe) pe.innerHTML = piedEditeur();
    nettoyer(); majCompteur(); router();
    majDevise(false); if (devise === "USD") actualiserTaux();
  })
  .catch(() => { vue.innerHTML = `<p class="chargement">La bibliothèque n'a pas pu se charger. Rechargez la page.</p>`; });
})();

/* Haut de page : anneau de progression de lecture */
(() => {
  const b = document.querySelector("[data-haut]"); if (!b) return;
  let f = 0;
  const maj = () => { f = 0; const h = document.documentElement, max = h.scrollHeight - innerHeight; b.style.setProperty("--prog", max > 0 ? Math.min(1, scrollY / max) : 0); };
  addEventListener("scroll", () => { if (!f) f = requestAnimationFrame(maj); }, { passive: true });
  addEventListener("resize", maj); maj();
})();

/* Vitrine 3D : profondeur au survol (ordinateur) */
(() => {
  if (!matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  let f = 0;
  document.addEventListener("pointermove", e => {
    const v = e.target.closest && e.target.closest(".vitrine"); if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (f) return; f = requestAnimationFrame(() => { f = 0; const r = v.getBoundingClientRect();
      v.style.setProperty("--mx", ((e.clientX - r.left) / r.width - .5).toFixed(3)); v.style.setProperty("--my", ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
  });
  document.addEventListener("pointerout", e => { const v = e.target.closest && e.target.closest(".vitrine"); if (v && !v.contains(e.relatedTarget)) { v.style.setProperty("--mx", 0); v.style.setProperty("--my", 0); } });
})();
