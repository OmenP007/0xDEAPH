# 0xSeq — Guide des dépendances Python

Ce document explique le rôle des packages présents dans le `requirements.txt` de 0xSeq, une API d'escrow construite avec Django.

**Objectif :** comprendre chaque dépendance, savoir pourquoi elle est présente et déterminer si elle est réellement nécessaire.

## 1. Les dépendances principales

### Django

Framework web principal. Il gère les modèles, les vues, les migrations, les utilisateurs et les permissions.

**À rechercher :**
- Django Models, Views et Migrations
- Authentification et autorisations
- Transactions de base de données
- Sécurité Django

Documentation : https://docs.djangoproject.com/

### Django REST Framework

Permet de créer l'API REST de 0xSeq afin que d'autres développeurs puissent intégrer les fonctionnalités d'escrow dans leurs applications.

**À rechercher :**
- Serializers
- APIView et ViewSets
- Permissions et authentification
- Validation des données
- Pagination et limitation des requêtes

Documentation : https://www.django-rest-framework.org/

### Psycopg et psycopg-binary

Permettent à Python et Django de communiquer avec PostgreSQL, la base de données du projet.

**À rechercher :**
- Configuration PostgreSQL avec Django
- Transactions SQL
- Clés étrangères et contraintes
- Verrouillage des lignes et concurrence

Documentation : https://www.psycopg.org/psycopg3/docs/

### Django REST Framework Simple JWT et PyJWT

Simple JWT ajoute l'authentification par jetons JWT à Django REST Framework. PyJWT est une bibliothèque de manipulation des jetons JWT et peut être une dépendance indirecte.

**À rechercher :**
- Access tokens et refresh tokens
- Expiration des jetons
- Authentification et autorisation
- Sécurisation des secrets
- Révocation et rotation des jetons

Documentation : https://django-rest-framework-simplejwt.readthedocs.io/

### drf-spectacular

Génère la documentation de l'API au format OpenAPI. Les développeurs pourront ainsi comprendre les endpoints, les paramètres et les réponses de 0xSeq.

**À rechercher :**
- OpenAPI
- Swagger UI
- Documentation des endpoints
- Documentation de l'authentification API

Documentation : https://drf-spectacular.readthedocs.io/

### django-environ

Facilite la lecture des variables d'environnement, notamment pour configurer la base de données et les clés secrètes sans les inscrire directement dans le code.

**À rechercher :**
- Variables d'environnement
- Fichier `.env`
- Fichier `.gitignore`
- Gestion des secrets
- Configuration développement et production

Documentation : https://django-environ.readthedocs.io/

## 2. Tâches en arrière-plan et cache

### Celery

Permet d'exécuter des tâches en arrière-plan, comme l'envoi de notifications, les traitements différés et certaines tâches planifiées.

**À rechercher :**
- Celery Workers
- Tasks et Retries
- Tâches idempotentes
- Gestion des erreurs
- Tâches périodiques

Documentation : https://docs.celeryq.dev/

### Redis

Base de données en mémoire qui peut servir de broker pour Celery ou de système de cache.

Redis ne remplace pas automatiquement PostgreSQL pour conserver les enregistrements financiers de référence.

**À rechercher :**
- Redis
- Broker Celery
- Cache
- Persistance
- Sécurisation de Redis

Documentation : https://redis.io/docs/

### Packages associés à Celery

- `amqp`
- `kombu`
- `billiard`
- `vine`
- `click`
- `click-didyoumean`
- `click-plugins`
- `click-repl`
- `prompt_toolkit`
- `wcwidth`
- `tzlocal`

Plusieurs de ces packages sont des dépendances internes de Celery ou de ses outils en ligne de commande. Il n'est généralement pas nécessaire de les déclarer séparément si le code du projet ne les utilise pas directement.

## 3. Packages liés au réseau et à la sécurité

### cryptography, cffi et pycparser

Ces packages fournissent des fonctionnalités cryptographiques ou des composants utilisés par certaines bibliothèques Python.

**À rechercher :**
- Cryptographie appliquée
- Hachage et signatures
- Gestion des clés
- Stockage sécurisé des secrets
- Utilisation correcte des bibliothèques cryptographiques

Documentation : https://cryptography.io/

### requests, urllib3, certifi, charset-normalizer et idna

Ces bibliothèques sont liées aux requêtes HTTP, aux connexions réseau, aux certificats TLS et à la gestion des noms de domaine et des encodages.

**À rechercher :**
- Requêtes HTTP en Python
- HTTPS et TLS
- Timeouts
- Gestion des erreurs réseau
- Vérification des certificats

Documentation : https://requests.readthedocs.io/

## 4. Packages dont la nécessité dépend du projet

### beautifulsoup4, bs4 et soupsieve

Utilisés pour analyser du HTML ou du XML. Ils ne sont généralement pas nécessaires pour une API d'escrow classique, sauf besoin spécifique.

### PyMySQL

Pilote Python pour MySQL/MariaDB. Si 0xSeq utilise PostgreSQL avec Psycopg, vérifier si PyMySQL est réellement nécessaire.

### Pillow

Bibliothèque de traitement d'images. Utile si l'application doit traiter des images ou certains justificatifs.

### python-dateutil, tzdata, asgiref, sqlparse, typing_extensions, packaging, attrs et six

Bibliothèques utilitaires ou dépendances d'autres packages. Leur présence dans `requirements.txt` ne signifie pas nécessairement que le code de 0xSeq les utilise directement.

## 5. Comprendre les dépendances transitives

Une dépendance peut être directe ou indirecte.

- **Dépendance directe :** le code du projet utilise explicitement le package.
- **Dépendance indirecte :** un autre package en a besoin pour fonctionner.

Par exemple, installer Celery peut installer plusieurs bibliothèques supplémentaires nécessaires à son fonctionnement.

`pip freeze` affiche généralement toutes les versions installées dans l'environnement, y compris les dépendances indirectes.

Commandes utiles :

```bash
pip list
pip show Django
pip show celery
pip check
```

## 6. Points essentiels pour une API d'escrow

Une application d'escrow manipule des opérations financières. La sécurité ne dépend donc pas uniquement des packages installés.

Les sujets à étudier sont :

1. **États d'une transaction :** créée, financée, en attente, libérée, remboursée ou contestée.
2. **Intégrité des données :** contraintes en base et transactions atomiques.
3. **Concurrence :** empêcher deux requêtes simultanées de libérer ou rembourser deux fois la même transaction.
4. **Idempotence :** empêcher le traitement répété d'une même opération.
5. **Authentification et autorisations :** vérifier qui peut consulter ou modifier une transaction.
6. **Clés API :** génération sécurisée, stockage approprié, révocation et permissions.
7. **Journal d'audit :** conserver une trace des actions importantes.
8. **Webhooks :** vérifier les signatures, traiter les répétitions et gérer les échecs.
9. **Paiements :** intégrer un prestataire adapté et vérifier les confirmations côté serveur.
10. **Tests de sécurité :** tester les accès non autorisés, les erreurs et les requêtes répétées.
11. **Déploiement :** HTTPS, sauvegardes, gestion des secrets et surveillance.

**Attention :** avant de manipuler de vrais fonds, il faut étudier les obligations légales, réglementaires et contractuelles applicables. Pour le prototype, utiliser l'environnement de test d'un prestataire de paiement.

## 7. Vérifier et nettoyer requirements.txt

Avant de supprimer ou d'ajouter des packages :

1. Identifier les imports réellement utilisés.
2. Distinguer les dépendances directes des dépendances indirectes.
3. Vérifier la compatibilité des versions.
4. Lancer les tests après chaque modification.
5. Garder un environnement virtuel propre.

Commandes utiles :

```bash
# Vérifier l'interpréteur Python utilisé
which python
python --version

# Afficher les packages installés
pip list

# Vérifier les dépendances
pip check

# Exporter les versions installées
pip freeze > requirements.txt
```

Attention : `pip freeze` reflète l'environnement actuel. Si des packages sans rapport avec 0xSeq y ont été installés, ils peuvent aussi apparaître dans le fichier.

## 8. Ressources officielles

- Django : https://docs.djangoproject.com/
- Django REST Framework : https://www.django-rest-framework.org/
- PostgreSQL : https://www.postgresql.org/docs/
- Psycopg : https://www.psycopg.org/psycopg3/docs/
- Simple JWT : https://django-rest-framework-simplejwt.readthedocs.io/
- drf-spectacular : https://drf-spectacular.readthedocs.io/
- Celery : https://docs.celeryq.dev/
- Redis : https://redis.io/docs/
- OWASP API Security Top 10 : https://owasp.org/www-project-api-security/

---

## Ordre d'apprentissage conseillé

1. Python et Django
2. Django REST Framework
3. PostgreSQL et les transactions
4. Authentification et permissions
5. API keys et documentation OpenAPI
6. Sécurité des API
7. Celery et Redis lorsque le projet en a réellement besoin

**Principe de travail :** chaque dépendance ajoutée à 0xSeq doit répondre à un besoin précis que tu comprends.