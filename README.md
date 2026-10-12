# 0xSeq

0xSeq est une application de paiement avec séquestre destinée aux particuliers et aux entreprises. Elle vise à sécuriser les transactions en ligne et à renforcer la confiance entre les parties. Le projet est actuellement un backend Django en cours de développement.

## Fonctionnalités prévues

- Authentification et gestion des comptes
- Gestion et suivi des paiements sous séquestre
- Tableau de bord de suivi des transactions
- API pour les intégrations externes et les clés d'accès

## Stack actuelle

- Python 3.10+
- Django
- SQLite en développement
- PostgreSQL disponible pour les environnements partagés ou de production

## Démarrage

Depuis la racine du dépôt, créez et activez un environnement virtuel :

```bash
python -m venv .venv
source .venv/bin/activate
```

Sous Windows PowerShell, activez-le avec `.venv\Scripts\Activate.ps1`.

Installez les dépendances et préparez la configuration locale :

```bash
pip install -r requirements.txt
cp .env.example .env
```

Générez ensuite une clé secrète et renseignez-la dans `.env` :

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Appliquez les migrations et lancez le serveur :

```bash
python manage.py migrate
python manage.py runserver
```

L'API de vérification est disponible sur `http://127.0.0.1:8000/api/health/` et l'administration Django sur `http://127.0.0.1:8000/admin/`.

## Base de données

SQLite est utilisée par défaut et ne demande aucune configuration supplémentaire. Pour PostgreSQL, installez et démarrez PostgreSQL, puis modifiez `.env` :

```dotenv
DB_ENGINE=postgresql
POSTGRES_DB=0xseq
POSTGRES_USER=0xseq
POSTGRES_PASSWORD=change-me
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## Structure

```text
.
├── config/             # Configuration Django, ASGI, WSGI et routes
├── escrow/             # Application métier séquestre
│   ├── migrations/
│   ├── models.py
│   ├── urls.py
│   └── views.py
├── manage.py
├── requirements.txt
└── .env.example
```

## Langues

Le français est la langue par défaut. Le middleware de langue Django est activé et l'anglais reste disponible.
