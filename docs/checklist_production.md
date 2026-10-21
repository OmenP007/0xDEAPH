# Checklist Finale de Mise en Production (Live) • 0xSeq

Ce guide récapitule les étapes nécessaires pour déployer 0xSeq sur un serveur de production en toute sécurité.

---

## 1. Préparation du Serveur & Dépendances
- [ ] Serveur Linux (Ubuntu 22.04 LTS ou Debian 12 recommandé).
- [ ] Docker et Docker Compose installés (`docker compose version` >= 2.20).
- [ ] Nom de domaine configuré avec enregistrement DNS A pointant vers l'IP publique du serveur (ex: `api.votredomaine.com`).
- [ ] Pare-feu configuré (ports ouverts : `80`, `443`, et port SSH sécurisé).

---

## 2. Configuration des Secrets d'Environnement (`.env`)
- [ ] Dupliquer `.env.production.example` vers `.env` sur le serveur :
  ```bash
  cp .env.production.example .env
  ```
- [ ] Générer une clé secrète Django robuste :
  ```bash
  python3 -c 'import secrets; print(secrets.token_urlsafe(50))'
  ```
- [ ] Définir `DEBUG=False`.
- [ ] Renseigner `ALLOWED_HOSTS` avec votre domaine exact et l'IP du serveur.
- [ ] Vérifier `DB_ENGINE=sqlite3` (la base locale `db.sqlite3` sera automatiquement persistée).

---

## 3. Bascule GeniusPay en Live (Production Réelle)
- [ ] Passer `GENIUS_PAY_SANDBOX=False`.
- [ ] Renseigner vos clés GeniusPay de production :
  - `GENIUS_PAY_API` (`pk_live_...`)
  - `GENIUS_PAY_SECRET` (`sk_live_...`)
- [ ] Renseigner le secret de signature webhook de production fourni dans votre dashboard GeniusPay :
  - `GENIUS_PAY_WEBHOOK_SECRET` (`whsec_...`)
- [ ] Dans le tableau de bord GeniusPay, enregistrer l'URL publique de webhook :
  `https://api.votredomaine.com/api/webhooks/geniuspay/`
- [ ] Tester un appel webhook depuis le dashboard GeniusPay et vérifier que la signature HMAC SHA-256 est validée (code HTTP 200).

---

## 4. Monitoring d'Erreurs Sentry & Observabilité
- [ ] Créer un projet Django sur [Sentry.io](https://sentry.io).
- [ ] Copier le DSN fourni et renseigner `SENTRY_DSN` dans le `.env`.
- [ ] Toutes les erreurs non capturées (API, requêtes Webhooks, workers Celery) remonteront instantanément sur votre tableau de bord Sentry avec alertes par email ou Slack.

---

## 5. Démarrage des Conteneurs Docker
- [ ] Construire et lancer la pile applicative :
  ```bash
  docker compose up -d --build
  ```
- [ ] Vérifier que tous les services sont en cours d'exécution :
  ```bash
  docker compose ps
  ```
- [ ] Consulter les logs des conteneurs :
  ```bash
  docker compose logs -f web
  docker compose logs -f celery_worker
  docker compose logs -f celery_beat
  ```

---

## 6. Activation du Certificat SSL HTTPS (Certbot Let's Encrypt)
- [ ] Générer le premier certificat SSL via Certbot :
  ```bash
  docker run -it --rm \
    -v $(pwd)/certbot_etc:/etc/letsencrypt \
    -v $(pwd)/certbot_var:/var/www/certbot \
    certbot/certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d api.votredomaine.com
  ```
- [ ] Remplacer `api.votredomaine.com` dans `nginx/conf.d/ssl.conf.template`, puis renommer le fichier :
  ```bash
  mv nginx/conf.d/ssl.conf.template nginx/conf.d/ssl.conf
  ```
- [ ] Recharger Nginx pour appliquer le HTTPS :
  ```bash
  docker compose exec nginx nginx -s reload
  ```

---

## 7. Sauvegardes Automatiques de la Base SQLite
- [ ] Configurer un cron job sur la machine hôte pour sauvegarder quotidiennement `db.sqlite3` vers un stockage distant ou chiffré (S3, rsync) :
  ```bash
  # Exemple cron quotidien à 02h00 :
  0 2 * * * cp /chemin/vers/0xSeq/db.sqlite3 /backups/0xseq_db_$(date +\%F).sqlite3
  ```

---

## 8. Transition future vers PostgreSQL 16 (Quand le volume augmentera)
- [ ] Exporter les données de SQLite :
  ```bash
  docker compose exec web python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission > datadump.json
  ```
- [ ] Démarrer le conteneur PostgreSQL :
  ```bash
  docker compose --profile postgres up -d postgres
  ```
- [ ] Passer `DB_ENGINE=postgresql` dans `.env`.
- [ ] Migrer et charger les données :
  ```bash
  docker compose exec web python manage.py migrate
  docker compose exec web python manage.py loaddata datadump.json
  ```
