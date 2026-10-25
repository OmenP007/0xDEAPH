# 0xSeq (0xEscrow) • Paiements & workflow de livraison

[![Django](https://img.shields.io/badge/Django-6.1-0C4B33?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.18-A30000?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![Celery](https://img.shields.io/badge/Celery-5.6-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-55%2F55%20Passing-success?style=for-the-badge)](https://github.com/)

**0xSeq** est un backend de paiement et de suivi de livraison pour l'e-commerce en **FCFA (XOF)**.

> **Limite actuelle de l'intégration financière :** la documentation GeniusPay fournie couvre la création de paiements checkout et les remboursements, mais pas la mise sous séquestre ni le payout vers un vendeur. `BLOCKED` est donc un état interne; les fonds ne sont pas garantis comme détenus par 0xSeq. Les actions de libération et l'auto-release restent bloquées. Ne pas utiliser comme séquestre de production avant d'avoir un endpoint payout officiel et un accord de conservation des fonds.

---

## 🚀 Fonctionnalités Clés

### 1. Cycle de Séquestre & Automatisation
- **Machine à états transactionnelle stricte :** `CREATED` ➔ `BLOCKED` ➔ `RELEASED` / `REFUNDED` / `DISPUTED`.
- **État de paiement :** `CREATED` puis `BLOCKED` après confirmation du webhook GeniusPay; cet état est local et ne signifie pas que GeniusPay détient les fonds en escrow.
- **Payout :** indisponible avec les endpoints actuellement documentés; les demandes de libération et l'auto-release ne changent pas le statut en `RELEASED`.
- **Remboursement :** endpoint GeniusPay documenté sur la référence de transaction, disponible pour les paiements admissibles.

### 2. Architecture Bidirectionnelle & Liens de Paiement (Paylinks)
- **Initiateur flexible :** Les transactions peuvent être initiées soit par l'acheteur, soit directement par le vendeur via une offre.
- **Paylinks Vendeur (Social Commerce) :** Génération de références uniques et opaques (`OFF-XXXX-XXXX`) prêtes à être partagées sur WhatsApp, Facebook Marketplace, TikTok ou Instagram.
- **Zéro risque d'erreur de destinataire :** L'acheteur ne saisit aucun numéro de compte ou de téléphone Mobile Money. Le backend Django rattache automatiquement le paiement au vendeur vérifié associé à l'offre.
- **Instantané Immuable (Price & Terms Snapshot) :** Le titre, la description et le prix en FCFA sont figés dans `Paiement` au moment de la commande pour empêcher toute falsification ultérieure par le vendeur.
- **Badge de Confiance KYC Public :** La consultation publique d'un Paylink (`GET /api/offers/{code}/`) expose le statut KYC vérifié du vendeur sans authentification préalable.
- **Validation de Livraison Sécurisée (OTP Livreur) :** Génération d'un code secret à 6 chiffres (`delivery_otp`) transmis à l'acheteur. La libération des fonds s'opère soit directement par l'acheteur, soit par le vendeur/livreur saisissant ce code OTP *(le socle d'API est validé ; l'expédition par passerelle SMS/WhatsApp et la politique d'expiration seront intégrées plus tard)*.

### 3. Modèle Économique & Commissions en FCFA
- **Devise officielle :** FCFA (code standard `XOF` / zone UEMOA).
- **Commission 0xSeq de 1% :** Prélèvement automatique de 1.00% par transaction (`fee_amount = amount * 0.01`).
- **Net Vendeur :** Montant net calculé au franc près (`net_amount = amount - fee_amount`).
- *Exemple :* Pour un achat de **100 000 FCFA**, les frais s'élèvent à **1 000 FCFA** et le vendeur perçoit **99 000 FCFA**.

### 4. Module KYC (Know Your Customer)
- **Multi-documents :** CNI, Passeport, Permis de conduire (`POST /api/kyc/`).
- **Workflow de conformité :** `NONE` ➔ `PENDING` ➔ `APPROVED` ou `REJECTED` motivé.
- **Validation administrative :** Endpoint dédié pour validation par les administrateurs (`POST /api/kyc/{id}/review/`).

### 5. Gestion Complète des Litiges (Disputes)
- **Ouverture de litige :** L'acheteur peut signaler un litige (`POST /api/payments/{id}/dispute/`) lorsque les fonds sont bloqués.
- **Gel conservatoire :** Annulation immédiate du compte à rebours d'auto-release.
- **Arbitrage Administrateur :** Décision souveraine (`POST /api/disputes/{id}/resolve/`) vers la libération au vendeur (`release`) ou le remboursement intégral à l'acheteur (`refund`).

### 6. Passerelle GeniusPay & Webhooks Sécurisés
- **Initiation de séquestre :** Synchronisation directe avec l'API Merchant GeniusPay.
- **Validation cryptographique HMAC SHA-256 :** Vérification stricte de l'en-tête `X-Webhook-Signature` (`hash_hmac('sha256', $timestamp . '.' . $payload, $secret)`).
- **Protection Anti-Replay :** Validation temporelle de l'en-tête `X-Webhook-Timestamp` (fenêtre max de 5 min).
- **Gestion de l'Idempotence :** Modèle `WebhookEventLog` indexant les `event_id` pour ignorer les doublons sans effet de bord.

### 7. Portail Développeurs & Clés API
- **Espace Développeur Dédié :** Inscription (`/api/developer/register/`) et authentification JWT séparée (`/api/developer/token/`).
- **Clés API Sécurisées :** Préfixe en clair (`0xs_live_...`), secret affiché une seule fois et empreinte SHA-256 stockée en base.
- **En-tête `X-API-Key` :** Permet aux sites e-commerce externes d'appeler l'API sans passer par JWT.

---

## 🛡️ Sécurité & Durcissement Pentest (OWASP)

Le backend a fait l'objet d'un audit de sécurité et de tests d'intrusion complets ([Rapport détaillé](docs/security_audit.md)) :
- **Anti-Race Condition :** Verrouillage pessimiste en base (`select_for_update()`) sous `db_transaction.atomic()`.
- **Anti-Replay Attack :** `WebhookTimestampValidationMiddleware` rejetant les webhooks de plus de 300 secondes.
- **Rate Limiting Multicouche (`ScopedRateThrottle`) :**
  - Authentification : 10 req/min
  - Opérations financières sensibles : 5 req/min
  - Webhooks entrants : 60 req/min
  - Requêtes anonymes : 20 req/min
- **En-têtes HTTP de Sécurité (`SecurityHeadersMiddleware`) :**
  - `X-Frame-Options: DENY` (anti-clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy` & `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` désactivant les APIs non utilisées.
- **Anti-SSRF/XSS sur les URLs KYC :** Validation stricte des protocoles autorisés (`https://` et `/media/`).
- **Protection des Erreurs :** Masquage systématique des stack traces et erreurs 500 en production.
- **Permissions de fichiers :** Droits `600` (`-rw-------`) appliqués sur `.env` et `db.sqlite3`.

---

## 🛠️ Stack Technique

- **Langage & Framework :** Python 3.12+ (compatible Python 3.14) • Django 6.1 • Django REST Framework
- **Authentification :** JWT (`djangorestframework-simplejwt`) & Clés API (`APIKeyAuthentication`)
- **Tâches d'Arrière-Plan :** Celery 5.6 & Celery Beat adossés à Redis 7
- **Bases de Données :** SQLite3 par défaut (volume persistant) • Compatible PostgreSQL 16
- **Serveurs & Déploiement :** Gunicorn • Nginx SSL Reverse Proxy • Docker Compose

---

## ⚙️ Démarrage Local Rapide

### 1. Préparer l'environnement virtuel

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```
Renseignez vos clés dans le fichier `.env` (clés GeniusPay, SECRET_KEY, etc.).

### 3. Migrations et lancement du serveur de développement

```bash
python manage.py migrate
python manage.py runserver
```

### 4. Lancer les workers Celery en local (optionnel)

```bash
# Terminal 1 : Worker
celery -A config worker --loglevel=info

# Terminal 2 : Scheduler Beat (purge périodique des journaux)
celery -A config beat --loglevel=info
```

---

## 🐳 Déploiement Production (Docker Compose)

La configuration `docker-compose.yml` orchestre l'ensemble de la pile de production :
- `web` : Django servi par Gunicorn (3 workers, 2 threads) adossé à SQLite persistant.
- `celery_worker` : Traitement asynchrone des tâches.
- `celery_beat` : Ordonnanceur périodique (purge des journaux d'idempotence; aucun payout n'est planifié).
- `redis` : Cache et courtier de messages.
- `nginx` : Reverse proxy HTTP/HTTPS avec support Let's Encrypt / Certbot.
- `postgres` : Conteneur PostgreSQL 16 prêt à l'emploi via profil `--profile postgres`.

```bash
# Lancer la pile complète
docker compose up -d --build

# Consulter les logs en direct
docker compose logs -f web celery_worker celery_beat
```

Consultez le guide [docs/checklist_production.md](docs/checklist_production.md) pour la bascule en production Live (certificats SSL, monitoring Sentry, clés réelles).

---

## 📚 Endpoints Principaux & Documentation

| Endpoint | Méthode | Rôle Requis | Description |
|---|---|---|---|
| `/api/health/` | `GET` | Public | Point de contrôle de disponibilité |
| `/api/register/` | `POST` | Public | Inscription utilisateur standard (client / vendeur) |
| `/api/token/` | `POST` | Public | Obtention de token JWT |
| `/api/token/refresh/` | `POST` | Public | Rafraîchissement de token JWT |
| `/api/developer/register/` | `POST` | Public | Inscription espace développeur |
| `/api/developer/token/` | `POST` | Public | Connexion JWT développeur |
| `/api/offers/` | `GET` / `POST` | Vendeur | Liste et création d'offres de vente (Paylinks `OFF-XXXX`) |
| `/api/offers/{code}/` | `GET` | Public | Consultation publique d'un Paylink avec badge KYC vendeur |
| `/api/offers/{code}/checkout/` | `POST` | Acheteur | Commande directe sur Paylink (instantané immuable + séquestre) |
| `/api/payments/` | `GET` / `POST` | Client / Vendeur | Liste et création de séquestre (commission 1% FCFA) |
| `/api/payments/{id}/` | `GET` | Parties prenantes | Consultation détaillée d'un séquestre |
| `/api/payments/{id}/release/` | `POST` | Acheteur | Non disponible tant que GeniusPay ne documente pas le payout |
| `/api/payments/{id}/refund/` | `POST` | Administrateur | Remboursement de l'acheteur |
| `/api/payments/{id}/dispute/` | `POST` | Acheteur | Ouverture d'un litige suspendant le timer |
| `/api/payments/{id}/confirm-delivery/` | `POST` | Acheteur / Livreur | Vérification OTP; ne libère pas les fonds sans payout provider |
| `/api/payments/auto-release/` | `POST` | Administrateur | Désactivé tant qu'un endpoint payout n'est pas documenté |
| `/api/disputes/{id}/resolve/` | `POST` | Administrateur | Arbitrage souverain du litige (`release` ou `refund`) |
| `/api/kyc/` | `GET` / `POST` | Authentifié | Consultation et soumission de pièce d'identité |
| `/api/kyc/{id}/review/` | `POST` | Administrateur | Validation ou rejet motivé d'un dossier KYC |
| `/api/keys/` | `GET` / `POST` | Développeur | Création et consultation des clés API |
| `/api/keys/{id}/revoke/` | `DELETE` | Développeur | Révocation immédiate d'une clé API |
| `/api/webhooks/geniuspay/` | `POST` | Public / GeniusPay | Réception idempotente des notifications HMAC GeniusPay |

### Documentation Interactive & Spécifications :
- **Swagger UI :** `http://127.0.0.1:8000/api/schema/swagger/`
- **ReDoc :** `http://127.0.0.1:8000/api/schema/redoc/`
- **Documentation HTML officielle :** `http://127.0.0.1:8000/docs/index.html`
- **Roadmap & Architecture Future :** `http://127.0.0.1:8000/docs/future_update.html`
- **Audit de Sécurité Pentest :** [`docs/security_audit.md`](docs/security_audit.md)
- **Checklist Déploiement Live :** [`docs/checklist_production.md`](docs/checklist_production.md)

---

## 🧪 Tests Automatisés

Le projet comprend une suite complète de **55 tests d'intégration et unitaires**, couvrant la totalité des flux critiques (authentification, séquestres, litiges, auto-release, webhooks, paylinks, snapshots et OTP) :

```bash
python manage.py test escrow
```

```text
Ran 55 tests in 119.2s
OK
Destroying test database for alias 'default'...
```

---

## 📄 Licence & Droits

Développé par l'équipe **0xSeq** © 2026. Tous droits réservés.
