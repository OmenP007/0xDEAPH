# 0xSeq — État des Mises à Jour & Feuille de Route d'Implémentation

Ce document récapitule les fonctionnalités déployées sur 0xSeq et le journal d'avancement pas-à-pas de l'architecture bidirectionnelle (Offres, Paylinks, Rôles Contextuels, Snapshots immuables et OTP de livraison).

---

## 🏆 Statut Global du Projet

* **Suite de tests automatisés :** 103/103 validés (100% succès)
* **Devise :** FCFA (XOF)
* **Taux de commission :** 1.00%
* **Limite GeniusPay :** l'API documentée fournit le checkout et le refund, mais pas le payout vendeur. La libération crédite donc le portefeuille interne du vendeur ; le cashout Mobile Money reste confirmé par un administrateur.
* **Sécurité & Pentest :** Verrouillage pessimiste atomique, Anti-replay webhooks, Rate limiting, Headers stricts (CSP, HSTS).
* **Déploiement :** Docker Compose (Django Gunicorn, Redis 7, Celery Worker, Celery Beat, Nginx SSL, SQLite3 persistant).

---

## 📌 Checklist Pas-à-Pas : Architecture Bidirectionnelle & Paylinks

> Ce tableau sert de jalon pour suivre l'avancement exact des itérations.

| Jalon | Tâche Technique | Statut |
| :--- | :--- | :---: |
| **1.1** | Création du modèle `Offer` (Code `OFF-XXXX`, Titre, Montant FCFA, `delivery_terms`, Vendeur) | `[FAIT]` |
| **1.2** | Évolution du modèle `Paiement` (`offer`, `item_title`, `item_description`, `initiator_role`, `delivery_otp`) | `[FAIT]` |
| **1.3** | Création et application des migrations Django (`0007_...`) | `[FAIT]` |
| **2.1** | Sérialiseurs `OfferSerializer` & `OfferPublicSerializer` (avec badge KYC vendeur) | `[FAIT]` |
| **2.2** | Sérialiseur `OfferCheckoutSerializer` (commande directe via Paylink sans ID vendeur) | `[FAIT]` |
| **2.3** | Endpoint Vendeur : `POST /api/offers/` & `GET /api/offers/` (Gestion des offres) | `[FAIT]` |
| **2.4** | Endpoint Public Paylink : `GET /api/offers/{code}/` (Consultation sans friction) | `[FAIT]` |
| **2.5** | Endpoint Checkout : `POST /api/offers/{code}/checkout/` (Initiation séquestre automatique) | `[FAIT]` |
| **2.6** | Endpoint OTP Livraison : `POST /api/payments/{id}/confirm-delivery/` (Socle validé ; gestion avancée du cycle OTP reportée à plus tard) | `[FAIT (Socle)]` |
| **3.1** | Rédaction et validation de la suite de tests unitaires pour le flux Offre/Paylink/OTP | `[FAIT]` |
| **3.2** | Validation globale de non-régression (Suite complète de tests passants : 103/103) | `[FAIT]` |

---

## 🔮 Évolutions Futures & Chantiers Reportés (Roadmap)

### 1. Gestion Avancée du Cycle de Vie de l'OTP de Livraison `[REPORTÉ / PROCHAINE ÉTAPE]`
Le socle technique minimal est d'ores et déjà en place (génération du champ `delivery_otp`, masquage vendeur, et validation `confirm-delivery` à temps constant). La gestion opérationnelle complète sera développée plus tard :
- **Passerelle d'envoi SMS / WhatsApp :** Intégration d'une API tierce (Orange SMS, Twilio, etc.) pour expédier le code OTP directement sur le numéro mobile de l'acheteur dès la prise en charge du colis.
- **Expiration & Régénération :** Durée de vie limitée de l'OTP, bouton de renvoi/renouvellement par l'acheteur, et verrouillage automatique après 3 tentatives infructueuses (protection anti-bruteforce).
- **Espace Livreur Tiers :** Interface web mobile éphémère (sans création de compte obligatoire) permettant à un coursier ou transporteur indépendant de saisir le code client lors de la remise en main propre.
- **Signature & Alternative de Secours :** Procédure de déblocage manuel en cas de problème de réseau ou d'indisponibilité du SMS (validation directe depuis l'espace client ou réclamation conjointe).

### 2. Décaissement Externe Automatisé `[EN ATTENTE DU FOURNISSEUR]`
- La libération d'un séquestre crédite désormais le portefeuille interne du vendeur (`BLOCKED` → `RELEASED`), et l'auto-release Celery est actif.
- Le vendeur peut demander un retrait Wave / Orange Money / MTN MoMo ; le mouvement reste `PENDING` jusqu'à confirmation administrateur.
- Reste à automatiser le virement externe avec une API officielle de payout (GeniusPay ou prestataire agréé).

---

## ✅ Fonctionnalités Antérieures Déjà Implémentées & Validées

### 1. Commission de Séquestre (1% en FCFA) `[FAIT]`
- **Devise :** FCFA (XOF).
- **Taux :** 1.00% par transaction (`commission_rate = 0.0100`).
- **Prélèvement automatique :** `fee_amount` (1% du montant brut) et `net_amount` (montant reversé au vendeur) calculés au franc près.
- **Validation comptable :** Traçabilité complète enregistrée sur le modèle `Paiement`.

### 2. Délais de Séquestre & Libération Automatique `[FAIT]`
- Le champ `auto_release_at` calcule l'échéance interne ; à expiration, la tâche Celery libère le séquestre vers le portefeuille du vendeur.
- Les litiges `DISPUTED` sont exclus et restent arbitrés manuellement.
- Le virement externe (Wave / Orange / MTN) reste une demande de retrait confirmée par un administrateur.

### 3. Module KYC (Know Your Customer) `[FAIT]`
- **Modèle `KYCVerification` :** CNI, Passeport, Permis de conduire.
- **Endpoints :** `GET /api/kyc/` et `POST /api/kyc/` (statuts `PENDING`, `APPROVED`, `REJECTED`).
- **Validation admin :** `POST /api/kyc/{id}/review/` avec motif de rejet.

### 4. Gestion des Litiges (Disputes) `[FAIT]`
- **Modèle `Dispute` :** Statuts `OPEN`, `UNDER_REVIEW`, `RESOLVED_RELEASE`, `RESOLVED_REFUND`.
- **Ouverture par l'acheteur :** `POST /api/payments/{id}/dispute/`.
- **Arbitrage administrateur :** `POST /api/disputes/{id}/resolve/` sous verrou pessimiste atomique (`select_for_update()`).

### 5. Clés API & Intégrations Développeurs `[FAIT]`
- **Modèle `APIKey` :** Préfixe `0xs_live_...`, empreinte SHA-256 en base, secret transmis une seule fois.
- **Authentification DRF :** Classe `APIKeyAuthentication` (`X-API-Key`).
- **Endpoints :** `GET /api/keys/`, `POST /api/keys/`, `DELETE /api/keys/{id}/revoke/`.
- **Espace dédié :** `POST /api/developer/register/` et `POST /api/developer/token/`.

### 6. Webhooks GeniusPay `[FAIT]`
- **Endpoint :** `POST /api/webhooks/geniuspay/`
- **Sécurité :** Vérification HMAC SHA-256 (`hash_hmac('sha256', $timestamp . '.' . $payload, $secret)`).
- **Anti-Replay :** `WebhookTimestampValidationMiddleware` (fenêtre max de 5 min).
- **Idempotence :** Modèle `WebhookEventLog` avec purge programmée Celery Beat (`task_purge_old_idempotency_logs`).

### 7. DevOps & Conteneurisation Production `[FAIT]`
- `Dockerfile` Python 3.12-slim optimisé.
- `docker-compose.yml` (Gunicorn, Celery Worker, Celery Beat, Redis 7, Nginx SSL, SQLite persistant).
- `docs/checklist_production.md` et `docs/security_audit.md`.

### 8. Architecture Bidirectionnelle & Paylinks Vendeur `[FAIT]`
- **Modèle `Offer` :** Référence publique unique et opaque `OFF-XXXX-XXXX`, montant strict en FCFA, conditions de livraison, horodatage.
- **Instantané immuable (`item_title`, `item_description`) :** Au moment où l'acheteur procède au checkout (`POST /api/offers/{code}/checkout/`), le titre et les conditions convenus sont immédiatement figés dans la transaction `Paiement` pour empêcher toute modification ultérieure par le vendeur.
- **Zéro saisie de compte ou téléphone :** L'acheteur ne saisit aucun identifiant vendeur. Le backend Django associe directement le paiement au vendeur vérifié de l'offre.
- **Badge KYC Vendeur en consultation publique :** `GET /api/offers/{code}/` retourne les statuts `seller_kyc_approved` (bool) et `seller_kyc_status` (`APPROVED`, `UNVERIFIED`, etc.) pour rassurer l'acheteur sur WhatsApp, TikTok ou Facebook.
- **OTP de Livraison Sécurisé (`delivery_otp`) :** Code secret à 6 chiffres généré à la création du séquestre. La libération des fonds (`POST /api/payments/{id}/confirm-delivery/`) s'effectue soit directement par l'acheteur après vérification du colis, soit par le vendeur/livreur transmettant l'OTP communiqué par l'acheteur.
- **Contrôles de cohérence stricts :**
  - Un vendeur ne peut pas acheter sa propre offre.
  - Seules les offres actives peuvent être consultées et commandées.
  - Pessimistic locking (`select_for_update()`) lors de la validation de livraison.
