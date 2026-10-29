# Rapport d'Audit de Sécurité & Pentest • 0xSeq Escrow Platform

**Date :** 22 Octobre 2026  
**Auditeur :** Antigravity Security Team (Posture Pentester / Red & Blue Team)  
**Périmètre :** Backend Django, DRF, Webhooks GeniusPay, Tâches Celery, Base de données SQLite3, Conteneurisation Docker & Nginx, Architecture Paylinks & OTP de livraison.  
**Statut Global :** ✅ **SÉCURISÉ & CONFORME PRODUCTION** (55/55 Tests Unitaires & d'Intégration Validés).

---

## 1. Synthèse Exécutive

Une évaluation approfondie de la surface d'attaque du projet **0xSeq** a été menée selon les standards **OWASP Top 10 (2021)** et **OWASP API Security Top 10 (2023)**. 

Quatorze vecteurs de vulnérabilités potentielles ont été audités, corrigés et validés par des tests automatisés :

| Réf | Catégorie de Risque | Gravité Initiale | Statut | Solution Appliquée |
| :--- | :--- | :---: | :---: | :--- |
| **SEC-01** | **Race Condition / Double Déblocage** (Concurrence de requêtes) | **CRITIQUE** | ✅ Corrigé | Verrouillage pessimiste (`select_for_update()`) sous transaction atomique. |
| **SEC-02** | **Attaque par Rejeu de Webhooks** (Replay Attack) | **ÉLEVÉE** | ✅ Corrigé | Middleware de validation du timestamp (fenêtre max de 5 min) + table d'idempotence. |
| **SEC-03** | **Fuite de Données Sensibles & Logs** (Info Disclosure) | **MOYENNE** | ✅ Corrigé | Suppression des `print()`, handler d'erreurs 500 anonymisé, logging sécurisé. |
| **SEC-04** | **Attaques par Force Brute & DoS** | **ÉLEVÉE** | ✅ Corrigé | Limitation stricte du débit (`ScopedRateThrottle`) + contrôle de taille des clés API. |
| **SEC-05** | **SSRF / XSS Stocké via KYC** | **ÉLEVÉE** | ✅ Corrigé | Validation stricte des protocoles autorisés (`https://`, `/media/`) sur `document_url`. |
| **SEC-06** | **Absence d'En-têtes de Sécurité HTTP** | **MOYENNE** | ✅ Corrigé | Middleware d'en-têtes stricts (`CSP`, `HSTS`, `X-Frame-Options: DENY`, `nosniff`). |
| **SEC-07** | **Permissions de Fichiers & Fuite de Secrets** | **ÉLEVÉE** | ✅ Corrigé | Restriction `chmod 600` sur `.env` et `db.sqlite3`, durcissement de `.gitignore`. |
| **SEC-08** | **Bypass de Signature Webhook en Production** | **CRITIQUE** | ✅ Corrigé | Blocage du serveur au démarrage si `GENIUS_PAY_WEBHOOK_SECRET` est absent en prod. |
| **SEC-09** | **Exposition & Fuite du Code OTP Secret** (Fuite API & Logs) | **CRITIQUE** | ✅ Corrigé | Masquage de `delivery_otp` pour le vendeur/tiers (réservé acheteur), suppression des logs. |
| **SEC-10** | **Clé Secrète Django par Défaut** (`django-insecure-...`) | **CRITIQUE** | ✅ Corrigé | Génération d'un secret aléatoire haute entropie (`secrets.token_urlsafe(64)`). |
| **SEC-11** | **Race Condition sur Litiges & Paylinks** | **ÉLEVÉE** | ✅ Corrigé | Encapsulation de `PaiementDisputeView` et `OfferCheckoutView` sous `select_for_update()`. |
| **SEC-12** | **Concurrence Auto-Release Celery & Webhooks** | **ÉLEVÉE** | ✅ Corrigé | Verrouillage transactionnel pessimiste par identifiant dans `auto_release_expired_escrows` et `handle_webhook_event`. |
| **SEC-13** | **Élévation de Privilèges & Création d'Offres Sans Rôle** | **ÉLEVÉE** | ✅ Corrigé | Blocage du rôle `developer` à l'inscription publique, validation du rôle vendeur sur `/api/offers/`. |
| **SEC-14** | **Attaque par Canal Auxiliaire (Timing Attack) sur OTP** | **MOYENNE** | ✅ Corrigé | Validation de livraison avec `secrets.compare_digest()` à temps constant et transport HTTPS strict. |

---

## 2. Détail des Vulnérabilités & Correctifs Appliqués

### 🔴 SEC-01 : Race Condition & Double Déblocage Financier
* **Vecteur d'attaque :** Un acheteur malveillant ou un script envoyant simultanément deux requêtes `POST /api/payments/{id}/release/` pouvait provoquer une exécution concurrente avant que le statut du paiement ne soit enregistré en base, déclenchant deux appels de déblocage vers GeniusPay.
* **Correction implémentée :**
  * Dans `PaiementReleaseView`, `PaiementRefundView` et `DisputeDetailResolveView`, les opérations financières sont désormais encapsulées dans un bloc `db_transaction.atomic()` avec verrouillage pessimiste au niveau de la base :
    ```python
    with db_transaction.atomic():
        paiement_locked = Paiement.objects.select_for_update().get(pk=paiement.pk)
        if not paiement_locked.can_transition_to("RELEASED"):
            raise ValidationError("Statut modifié concurremment.")
        # Appel API GeniusPay & sauvegarde transactionnelle
    ```

---

### 🟠 SEC-02 : Attaque par Rejeu sur les Webhooks GeniusPay (Replay Attack)
* **Vecteur d'attaque :** Un attaquant interceptant une trame webhook légitime (`payment.success` ou `cashout.completed`) pouvait la renvoyer ultérieurement pour forcer une ré-évaluation d'état.
* **Correction implémentée :**
  1. **Contrôle d'âge du timestamp (`WebhookTimestampValidationMiddleware`) :** Tout webhook entrant dont le timestamp diffère de plus de 300 secondes (5 minutes) par rapport à l'heure du serveur est immédiatement rejeté avec un code HTTP 400.
  2. **Table d'Idempotence `WebhookEventLog` :** L'identifiant unique de chaque webhook (`id` / `event_id`) est persisté dès sa première réception. Tout appel ultérieur portant le même identifiant est reconnu comme `DUPLICATE` et neutralisé sans ré-exécution métier.

---

### 🟡 SEC-03 : Fuite de Données & Traces d'Erreurs Internes (CWE-209)
* **Vecteur d'attaque :** Des instructions `print()` dans `GeniusPayWebhookView` affichaient le corps brut des requêtes et les signatures dans la console standard. De plus, une exception inattendue risquait de propager une stack trace complète avec les chemins du serveur.
* **Correction implémentée :**
  1. Remplacement de tous les `print()` par des logs structurés via `logging.getLogger("escrow")`.
  2. Création d'un handler d'exception personnalisé (`escrow/exceptions.py`) qui intercepte toute erreur 500 en production (`DEBUG=False`) et masque les détails techniques derrière un message générique sécurisé.
  3. Masquage des chemins d'authentification sensibles (`/api/token/`, `/api/register/`) dans les journaux d'accès HTTP.

---

### 🟠 SEC-04 : Force Brute, Énumération & Déni de Service (DoS)
* **Vecteur d'attaque :** Requêtes répétitives sur les endpoints d'authentification (`/api/token/`, `/api/register/`) ou envoi de headers géants pour saturer le hachage SHA-256 de `APIKeyAuthentication`.
* **Correction implémentée :**
  1. Mise en place de `ScopedRateThrottle` avec des quotas stricts dans `config/settings.py` :
     * `auth` : 10 requêtes / minute.
     * `sensitive` (libération, remboursement) : 5 requêtes / minute.
     * `webhook` : 60 requêtes / minute.
     * `anon` : 20 requêtes / minute.
  2. Dans `escrow/authentication.py`, limitation stricte de la longueur de la clé API (`len(raw_key) <= 256`) et validation immédiate du préfixe `0xs_live_` avant tout hachage cryptographique.

---

### 🟠 SEC-05 : SSRF & XSS Stocké via les Justificatifs KYC
* **Vecteur d'attaque :** Un utilisateur soumettant un profil KYC pouvait injecter des schémas malveillants (`javascript:...`, `data:...`, `file:///etc/passwd`) dans le champ `document_url`.
* **Correction implémentée :**
  * Dans `KYCVerificationSerializer`, validation personnalisée rejetant formellement les pseudo-protocoles dangereux (`javascript:`, `data:`, `file:`, `vbscript:`) et n'autorisant que `https://` ou `/media/`.

---

### 🟡 SEC-06 : En-têtes HTTP de Sécurité & Isolation Navigateur
* **Vecteur d'attaque :** Risques de clickjacking (iframe malveillante), MIME-sniffing, et fuite d'informations de navigation via le Referer.
* **Correction implémentée :**
  * Création du middleware `SecurityHeadersMiddleware` qui injecte sur chaque réponse HTTP :
    * `X-Frame-Options: DENY` (anti-clickjacking absolu).
    * `X-Content-Type-Options: nosniff`.
    * `Referrer-Policy: strict-origin-when-cross-origin`.
    * `Permissions-Policy` (désactivation de la caméra, micro, géolocalisation).
    * `Content-Security-Policy` restrictif pour les pages de documentation HTML.
    * Suppression des bannières serveur (`Server: 0xSeq`, suppression de `X-Powered-By`).

---

### 🔴 SEC-07 & SEC-08 : Gestion des Secrets & Rigueur Production
* **Corrections appliquées :**
  1. Permissions Unix des fichiers `.env` et `db.sqlite3` fixées à `600` (`-rw-------`).
  2. Fichier `.gitignore` renforcé interdisant strictement les dumps SQL, `.env*`, certificats SSL et sessions Celery.
  3. Vérification au démarrage de Django : si `DEBUG=False` et que `GENIUS_PAY_WEBHOOK_SECRET` est vide, Django refuse de démarrer pour empêcher le traitement de faux webhooks non signés.
  4. Cookies de session et CSRF configurés avec `HttpOnly=True`, `SameSite="Strict"` et `Secure=True` (en HTTPS).

---

### 🔴 SEC-09 : Fuite & Exposition de l'OTP Secret de Livraison (API & Logs)
* **Vecteur d'attaque :**
  1. Le code `delivery_otp` (secret à 6 chiffres destiné uniquement à l'acheteur) figurait dans `read_only_fields` de `PaiementSerializer`, le rendant visible au vendeur et aux tiers via `GET /api/payments/` et `GET /api/payments/{id}/`.
  2. L'OTP était consigné en clair dans les logs serveurs lors du checkout (`[Paylink] Achat initié... (OTP: XXXXXX)`).
* **Correction implémentée :**
  1. Dans `PaiementSerializer.to_representation()`, l'OTP est désormais **strictement masqué** pour tout utilisateur qui n'est pas l'acheteur de la transaction (`request.user != instance.buyer`).
  2. Suppression immédiate de la variable `delivery_otp` de toutes les instructions `logger.info()`.

---

### 🔴 SEC-10 : Utilisation de la Clé Secrète Django par Défaut
* **Vecteur d'attaque :** La clé `SECRET_KEY` dans `.env` débutait par le préfixe non sécurisé `django-insecure-`, exposant l'ensemble des sessions et tokens JWT signés.
* **Correction implémentée :** Remplacement par un secret cryptographique généré aléatoirement de 64 octets en base64 URL-safe (`secrets.token_urlsafe(64)`).

---

### 🟠 SEC-11 : Concurrence sur Litiges & Paylinks (Double Vente & Double Litige)
* **Vecteur d'attaque :**
  1. L'ouverture de litige (`PaiementDisputeView`) s'exécutait hors transaction atomique, permettant l'ouverture concurrente de litiges multiples.
  2. Le checkout Paylink (`OfferCheckoutView`) lisait l'offre sans verrou, autorisant des ordres concurrents sur le même inventaire.
* **Correction implémentée :**
  * Encapsulation complète sous `with db_transaction.atomic():` avec verrouillage pessimiste `select_for_update()` dans `PaiementDisputeView` et `OfferCheckoutView`.

---

### 🟠 SEC-12 : Concurrence sur l'Auto-Release Celery & Webhooks
* **Vecteur d'attaque :** Exécution concurrente de la tâche planifiée Celery Beat `auto_release_expired_escrows` ou webhooks GeniusPay simultanés pouvant entraîner un double virement ou une incohérence de statut.
* **Correction implémentée :**
  * Verrouillage pessimiste atomique par paiement (`select_for_update()`) dans `auto_release_expired_escrows` et `handle_webhook_event`.

---

### 🟠 SEC-13 : Élévation de Privilèges & Création Frauduleuse d'Offres
* **Vecteur d'attaque :**
  1. Un utilisateur lambda pouvait spécifier `role="developer"` lors de son inscription publique via `/api/register/` et accéder indûment aux clés API.
  2. N'importe quel compte authentifié pouvait créer des offres de vente sans disposer du statut vendeur.
* **Correction implémentée :**
  1. `UserRegistrationSerializer.validate_role` interdit désormais strictement l'attribution des rôles `deaph` et `developer` (réservé à `/api/developer/register/`).
  2. `OfferListCreateView.post` vérifie formellement que l'initiateur possède le rôle `seller`, `member` ou `admin`.

---

### 🟡 SEC-14 : Timing Attack sur OTP & Transport Sécurisé KYC
* **Vecteur d'attaque :**
  1. La comparaison d'OTP utilisait l'opérateur standard `!=`, sensible aux attaques par analyse de temps de réponse (timing side-channel).
  2. `validate_document_url` acceptait `http://` pour les pièces d'identité KYC (vulnérabilité à l'interception MitM).
* **Correction implémentée :**
  1. Comparaison à temps constant via `secrets.compare_digest(otp_provided, paiement.delivery_otp)`.
  2. Rejet formel des URLs en `http://` pour les justificatifs KYC : `https://` ou `/media/` obligatoires.

---

## 3. Résultats des Tests de Non-Régression

Tous les tests unitaires et d'intégration ont été exécutés avec succès :
```bash
Ran 55 tests in 119.2s
OK
Destroying test database for alias 'default'...
```
* **Tests Authentification & Rôles :** Inscription client/vendeur, rejet de `deaph` et `developer` sur le registre public, rotation des tokens JWT.
* **Tests Paiements & Séquestres :** Calcul de commission 1% au franc près en FCFA, transitions autorisées, isolation des accès propriétaire/admin.
* **Tests Concurrence & Déblocage :** Verrouillage pessimiste atomique sur libération, litiges, remboursements et webhooks.
* **Tests Paylinks & Offres Vendeur :** Création réservée aux vendeurs, consultation publique avec badge KYC, snapshots immuables.
* **Tests OTP & Livraison Sécurisée :** Masquage de `delivery_otp` pour le vendeur, validation temps-constant via OTP ou confirmation directe acheteur.
* **Tests Webhooks :** Validation de signature HMAC SHA-256 avec/sans timestamp, idempotence, neutralisation des rejeux.
* **Tests GeniusPay & Tâches de Fond :** Simulation de l'API GeniusPay (checkout, refund, lecture), libération des séquestres vers le portefeuille interne et purge quotidienne de l'idempotence via Celery.

---

## 4. Recommandations Continues pour l'Équipe DevOps

1. **Renouvellement des Secrets :** Utiliser des clés de production distinctes pour chaque environnement et faire tourner les tokens GeniusPay tous les 6 à 12 mois.
2. **Reverse Proxy Nginx :** Toujours faire transiter le trafic derrière Nginx avec terminaison TLSv1.3 et certificats Let's Encrypt à jour.
3. **Surveillance SIEM :** Surveiller les alertes de log `[Security]` émises par `escrow.middleware` (notamment les codes HTTP 400 sur `/api/webhooks/`).
