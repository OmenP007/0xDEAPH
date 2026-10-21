#!/bin/sh
set -e

echo "=== [0xSeq] Démarrage du conteneur ==="

# Application automatique des migrations
echo "-> Application des migrations de base de données..."
python manage.py migrate --noinput

# Rassemblement des fichiers statiques
echo "-> Collecte des fichiers statiques..."
python manage.py collectstatic --noinput --clear || true

echo "=== [0xSeq] Initialisation terminée. Lancement de la commande : $@ ==="
exec "$@"
