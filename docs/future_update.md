# 0xSeq — État des Mises à Jour & Feuille de Route

Ce document récapitule les fonctionnalités déployées sur 0xSeq et la feuille de route des évolutions futures.

---

## ✅ Fonctionnalités Implémentées & Validées

### 1. Commission de Séquestre (1% en FCFA)
- **Devise :** FCFA (XOF).
- **Taux :** 1.00% par transaction (`commission_rate = 0.0100`).
- **Prélèvement automatique :** `fee_amount` (1% du montant brut) et `net_amount` (montant reversé au vendeur) calculés au franc près.
- **Exemple :** Sur une vente de **100 000 FCFA**, les frais s'élèvent à **1 000 FCFA** et le vendeur perçoit **99 000 FCFA**.
- **Validation comptable :** Traçabilité complète enregistrée sur le modèle `Paiement`.

### 2. Délais de Séquestre & Libération Automatique (3 Jours)
- **Timer de sécurité :** Dès qu'un paiement passe à `BLOCKED`, `auto_release_at` est fixé à `now + 3 jours`.
- **Mécanisme d'Auto-Release :** Service `auto_release_expired_escrows()` et endpoint `POST /api/payments/auto-release/` pour débloquer automatiquement les fonds expirés.
- **Suspension en cas de litige :** Tout litige ouvert annule immédiatement la libération automatique.

### 3. Module KYC (Know Your Customer)
- **Modèle `KYCVerification` :** Prise en charge des CNI, Passeports et Permis de conduire.
- **Endpoint Utilisateur :** `GET /api/kyc/` et `POST /api/kyc/` (statuts `PENDING`, `APPROVED`, `REJECTED`).
- **Endpoint Administrateur :** `POST /api/kyc/{id}/review/` pour acceptation ou refus motivé.
- **Méthode helper :** `user.is_kyc_approved()` sur le modèle `User`.

### 4. Gestion des Litiges (Disputes)
- **Modèle `Dispute` :** Statuts `OPEN`, `UNDER_REVIEW`, `RESOLVED_RELEASE`, `RESOLVED_REFUND`.
- **Ouverture par l'acheteur :** `POST /api/payments/{id}/dispute/`.
- **Arbitrage administrateur :** `POST /api/disputes/{id}/resolve/` permettant de trancher et déclencher le remboursement (`refund`) ou la libération (`release`).

### 5. Clés API & Intégrations Développeurs
- **Modèle `APIKey` :** Préfixe en clair (`0xs_live_...`), secret affiché une seule fois, empreinte SHA-256 stockée en base.
- **Authentification DRF :** Classe `APIKeyAuthentication` via l'en-tête `X-API-Key: 0xs_live_...`.
- **Gestion :** Endpoints `GET /api/keys/`, `POST /api/keys/`, `DELETE /api/keys/{id}/revoke/`.
- **Espace dédié :** `POST /api/developer/register/` et `POST /api/developer/token/`.

### 6. Webhooks GeniusPay
- **Endpoint :** `POST /api/webhooks/geniuspay/`
- **Sécurité :** Vérification de signature HMAC SHA-256 (`X-GeniusPay-Signature`).
- **Événements supportés :** `payment.success`, `cashout.completed`, `payment.refunded`, etc.

---

## 🔮 Prochaines Évolutions (Roadmap v2)

### 1. Notifications Push & Alertes Mobiles (SMS / WhatsApp)
- Envoi de notifications SMS/WhatsApp lors des étapes clés :
  - Dépôt réussi des fonds sous séquestre.
  - Avis d'expédition de la commande.
  - Virement des fonds sur le compte Mobile Money / bancaire du vendeur.
  - Alerte d'ouverture de litige.
- Providers recommandés : Termii, Twilio ou WhatsApp Cloud API.

### 2. Workers Celery & Beat en Production
- Actuellement, la libération automatique peut être exécutée via `POST /api/payments/auto-release/`.
- Déploiement d'un conteneur worker Celery et d'un scheduler Celery Beat pour exécuter cette tâche automatiquement toutes les heures sans intervention humaine.

### 3. Webhooks Sortants pour Partenaires E-Commerce
- Permettre aux marchands d'enregistrer leur propre URL de webhook dans l'espace développeur afin de recevoir en temps réel les changements de statut de leurs commandes.
