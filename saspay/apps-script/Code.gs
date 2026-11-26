/* Providence Éditions Prestige — envoi automatique des e-mails de livraison (Gmail du propriétaire).
 * Toutes les 10 minutes : demande au serveur les commandes payées non encore servies, envoie l'e-mail,
 * puis marque la commande. Aucun mot de passe ni clé : le serveur vérifie le jeton d'identité Google.
 * Installation : exécuter une fois installer(). */
const SERVEUR = "https://providence-paiement.providence-editions.workers.dev";

function envoyerLivraisons() {
  const verrou = LockService.getScriptLock();
  if (!verrou.tryLock(5000)) return;
  try {
    const jeton = ScriptApp.getIdentityToken();
    const r = UrlFetchApp.fetch(SERVEUR + "/api/envois", { headers: { Authorization: "Bearer " + jeton }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) { console.warn("Liste indisponible : " + r.getResponseCode()); return; }
    const commandes = JSON.parse(r.getContentText()).commandes || [];
    commandes.forEach(function (c) {
      if (MailApp.getRemainingDailyQuota() < 1) return;
      MailApp.sendEmail({
        to: c.email,
        name: "Providence Éditions Prestige",
        replyTo: "providenceeditionsprestige@gmail.com",
        subject: "Vos livres — Providence Éditions Prestige (réf. " + c.ref + ")",
        htmlBody: html_(c),
        body: texte_(c)
      });
      UrlFetchApp.fetch(SERVEUR + "/api/envois/fait", { method: "post", contentType: "application/json",
        headers: { Authorization: "Bearer " + jeton }, payload: JSON.stringify({ id: c.id }), muteHttpExceptions: true });
    });
  } finally { verrou.releaseLock(); }
}

function echap_(s) { return String(s).replace(/[&<>"']/g, function (x) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x]; }); }

function html_(c) {
  const liste = c.livres.map(function (t) { return '<li style="margin:6px 0">' + echap_(t) + "</li>"; }).join("");
  return '<div style="background:#F3F8FF;padding:24px 12px;font-family:\'Plus Jakarta Sans\',Arial,sans-serif;color:#12243A">' +
    '<div style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #D7E4F2;border-radius:20px;overflow:hidden">' +
    '<div style="background:linear-gradient(90deg,#103FA8,#1450D2 60%,#08A4D6);padding:18px 26px;color:#fff;font-weight:800;letter-spacing:.06em;font-size:13px">PROVIDENCE ÉDITIONS PRESTIGE</div>' +
    '<div style="padding:26px">' +
    '<h1 style="font-size:22px;margin:0 0 10px">Merci, ' + echap_(c.nom) + '. Vos livres vous attendent.</h1>' +
    '<p style="margin:0 0 6px;line-height:1.6">Votre paiement est confirmé. Voici ' + (c.livres.length > 1 ? "vos ouvrages" : "votre ouvrage") + ' :</p>' +
    '<ul style="padding-left:20px;line-height:1.5">' + liste + '</ul>' +
    '<p style="margin:24px 0"><a href="' + echap_(c.lien) + '" style="background:#1450D2;background:linear-gradient(180deg,#1450D2,#103FA8);color:#ffffff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px;display:inline-block">Télécharger mes livres</a></p>' +
    '<p style="font-size:13px;color:#4C6178;line-height:1.6;margin:0">Conservez cet e-mail : ce lien personnel vous permet de retélécharger vos livres à tout moment. Il vous est réservé ; merci de ne pas le transmettre.<br>Référence de commande : <b>' + echap_(c.ref) + '</b> · Assistance : providenceeditionsprestige@gmail.com · WhatsApp +229 01 67 96 00 94</p>' +
    '</div></div></div>';
}

function texte_(c) {
  return "Merci, " + c.nom + ". Votre paiement est confirmé.\n\nVos livres : " + c.livres.join(" ; ") +
    "\n\nTéléchargez-les ici (lien personnel) : " + c.lien + "\n\nRéférence : " + c.ref + "\nProvidence Éditions Prestige — providenceeditionsprestige@gmail.com";
}

/* À exécuter une seule fois : crée le déclenchement toutes les 10 minutes. */
function installer() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("envoyerLivraisons").timeBased().everyMinutes(10).create();
  envoyerLivraisons();
}
