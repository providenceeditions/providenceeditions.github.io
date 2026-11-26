# SasPay — état de l'intégration

Mise à jour : 26 novembre 2026 — Claude Opus 5.5. Aucun secret dans ce fichier.

## En place (vérifié)
- **Serveur** : Cloudflare Worker `providence-paiement` → https://providence-paiement.providence-editions.workers.dev
  (compte Cloudflare gratuit de silasgbavou@gmail.com). Code source : `saspay/backend/worker.js`.
- **Base** D1 `providence-commandes` (schéma `saspay/backend/schema.sql`) ; **coffre** KV privé `providence-livres`.
- **14 PDF** copiés depuis Google Drive dans le KV privé ; tailles identiques aux fichiers Drive. Téléchargement refusé sans commande payée (403 vérifié).
- **Secrets Cloudflare** : `SASPAY_API_KEY` (clé live, portée « Encaissement » uniquement, collée par le propriétaire), `SASPAY_WEBHOOK_SECRET` (collé par le propriétaire). Jamais dans Git.
- **Webhook SasPay** : URL `…/api/saspay/webhook`, actif, événements transaction créée / réussie / échouée / annulée. Signature fausse → 401 (vérifié).
- **Session de paiement réelle créée** (sans débit) : page SasPay correcte, 4 000 XOF, frais +140 XOF (payés par le client), Mobile Money Bénin (Celtiis, Moov, MTN) ; carte bancaire **non activée** côté SasPay.
- Tâche planifiée toutes les 15 min : rattrapage des paiements dont le navigateur s'est fermé.

## Conformité à l'OpenAPI officiel (lu le 26/11/2026)
- Serveurs : `sandbox-api.saspay.me` (sk_test_) / `api.saspay.me` (sk_live_).
- Livraison seulement si `GET /checkout-sessions/{id}/status/` → `status=PAID` et `transaction_status=SUCCESS`, montant/devise contrôlés par `GET /checkout-sessions/{id}/`, puis `GET /payments/{transaction_id}/verify/` (`charged`, `net_amount` enregistrés).
- Le webhook `transaction.success` ne contient pas la référence de commande : il déclenche la revérification des commandes en attente récentes.

## Boutique (branche `feature/saspay-paiement-livraison`)
- Interrupteur `data/config.json → vente.saspay.actif` : **false**. Aperçu propriétaire : `https://providenceeditions.github.io/?saspay=essai`.
- Fenêtre « Recevoir mon ouvrage » (nom + e-mail), redirection dans le même onglet, page `#merci` (vérification serveur, boutons « Télécharger mon livre »), panier réglé en une fois.
- Tests : serveur 10/10 (simulés), interface 28/28, carrousel 55/55, site 52/52.

## Reste à faire
1. Mise en ligne de la branche (accord du propriétaire).
2. Achat réel de faible montant par le propriétaire en mode essai → contrôle de la livraison.
3. E-mail de livraison automatique (Brevo gratuit) : code prêt, clé non configurée.
4. Activation de la carte bancaire auprès de SasPay (option).
5. Bascule `actif: true`, puis retrait de Maketou après validation.
