# Clés API pour 0xSeq

Ce guide décrit comment permettre à un développeur de créer une clé API pour accéder au backend 0xSeq. Une clé API est un secret d'authentification : elle identifie une intégration, mais ne doit pas lui donner automatiquement accès à toutes les opérations financières.

> **Contexte 0xSeq :** le projet utilise déjà JWT pour l'authentification des utilisateurs. Pour éviter que l'authentification JWT et les clés API se disputent l'en-tête `Authorization: Bearer`, ce guide utilise l'en-tête dédié `X-API-Key` pour les clés API.

## 1. Cycle de vie d'une clé

1. Le développeur se connecte à 0xSeq.
2. Il demande la création d'une clé et choisit un nom, par exemple `Application mobile`.
3. Le serveur génère un secret avec un générateur cryptographiquement sûr.
4. Le serveur enregistre le propriétaire, le nom, les permissions et l'empreinte du secret, jamais le secret en clair.
5. La clé complète est renvoyée une seule fois. Le développeur doit la conserver dans un gestionnaire de secrets.
6. Pour chaque appel, le serveur retrouve la clé à partir de son empreinte, vérifie son état et applique ses permissions.

Exemple de clé affichée une seule fois :

```text
0xs_live_k3H...secret...
```

## 2. Modèle Django

Voici une structure de départ. `scopes` représente les permissions accordées à la clé. `expires_at`, `revoked_at` et `last_used_at` facilitent son expiration, sa révocation et son suivi.

```python
import secrets

from django.conf import settings
from django.db import models


class APIKey(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    name = models.CharField(max_length=100)
    prefix = models.CharField(max_length=20, db_index=True)
    key_hash = models.CharField(max_length=64, unique=True)
    scopes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    @staticmethod
    def generate_secret():
        return "0xs_live_" + secrets.token_urlsafe(32)
```

- `user` est le propriétaire de la clé.
- `name` aide le développeur à reconnaître son intégration.
- `prefix` permet d'identifier une clé sans exposer le secret complet.
- `key_hash` contient uniquement l'empreinte SHA-256 du secret.
- `scopes` liste les actions autorisées, par exemple `payments:read`.
- `revoked_at` non nul signifie que la clé a été révoquée.

Ce modèle décrit la structure des données, mais ne suffit pas à lui seul : il faut aussi coder la création, l'authentification, les permissions et les tests. Après l'ajout ou la modification de ce modèle, il faudra créer puis appliquer une migration Django.

## 3. Générer et stocker le secret

Le module Python `secrets` est fait pour produire des valeurs imprévisibles adaptées aux secrets. Au moment de créer une clé, le serveur peut générer le secret, calculer son empreinte et enregistrer seulement cette empreinte :

```python
import hashlib

raw_key = APIKey.generate_secret()
key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

api_key = APIKey.objects.create(
    user=request.user,
    name=name,
    prefix=raw_key[:20],
    key_hash=key_hash,
    scopes=["payments:read"],
)

# Renvoyer raw_key au développeur une seule fois.
```

Une clé générée aléatoirement avec suffisamment d'entropie n'est pas un mot de passe choisi par un humain : SHA-256 convient pour retrouver son empreinte. Il faut néanmoins ne jamais journaliser ni afficher à nouveau le secret complet.

## 4. Envoyer une clé dans une requête

Une application cliente peut transmettre sa clé dans un en-tête dédié :

```http
GET /api/payments/
X-API-Key: 0xs_live_VOTRE_CLE
```

Le backend doit ensuite :

1. lire l'en-tête et extraire la clé;
2. calculer son empreinte SHA-256;
3. retrouver la clé correspondante en base;
4. vérifier qu'elle n'est ni révoquée ni expirée;
5. vérifier le scope demandé;
6. appliquer les permissions et le contrôle d'accès aux ressources;
7. autoriser ou refuser la requête.

Dans ce projet, JWT est configuré sur `Authorization: Bearer`. Si l'on choisit plutôt d'envoyer les clés API avec ce même en-tête, une classe d'authentification personnalisée devra distinguer les clés `0xs_live_...` des JWT. L'en-tête `X-API-Key` évite cette ambiguïté.

## 5. Clé API, scopes et paiements

Une clé peut recevoir des permissions limitées, par exemple :

- `payments:read` : consulter les paiements autorisés;
- `payments:create` : créer une demande de paiement;
- `payments:refund` : demander un remboursement, si cette opération est permise par les règles métier.

Une clé avec `payments:read` ne doit pas pouvoir créer un paiement ni libérer des fonds. Même avec un scope valide, le backend doit vérifier que le propriétaire de la clé a le droit d'accéder au paiement demandé. Une clé API identifie une intégration; elle ne remplace pas les règles de propriété et les permissions métier.

Pour 0xSeq, il faut aussi définir clairement quel compte est associé à une clé et à quel titre il peut initier un paiement. Il ne faut pas déduire automatiquement que toute requête authentifiée a le droit d'agir comme acheteur ou vendeur.

## 6. Gestion et sécurité

Une vraie gestion de clés devrait prévoir :

- la création et le nommage de plusieurs clés;
- l'affichage du secret complet une seule fois;
- la révocation immédiate d'une clé;
- des scopes limités au besoin réel;
- une date d'expiration configurable;
- la date de dernière utilisation;
- une limitation du débit et une journalisation sans secret;
- la vérification que l'utilisateur ne gère que ses propres clés.

En production, toutes les requêtes doivent passer par HTTPS. Le secret ne doit jamais être stocké dans le code source, envoyé par URL ou écrit dans les journaux.

## 7. Architecture conseillée pour 0xSeq

Dans le cas présent, l'objectif est de permettre aux développeurs d'intégrer **l'API de 0xSeq**. Les clés sont donc créées et gérées par 0xSeq pour des intégrations appartenant à ses utilisateurs.

À distinguer d'une autre architecture : une plateforme où les développeurs utilisent 0xSeq pour générer et gérer des clés destinées à leurs propres projets. Cette seconde option ferait de 0xSeq un service de gestion de clés et demanderait une conception différente.

Séparer les responsabilités :

- `User` représente le compte et le propriétaire;
- `APIKey` authentifie une intégration et porte ses scopes;
- `Paiement` représente une opération financière et garde ses propres règles d'accès et de transition d'état.

## 8. Ordre d'implémentation

1. Ajouter le modèle `APIKey`.
2. Créer et appliquer la migration.
3. Construire une API de création qui affiche le secret une seule fois.
4. Ajouter une classe d'authentification DRF pour `X-API-Key`.
5. Ajouter des permissions qui vérifient les scopes et le propriétaire des paiements.
6. Ajouter la révocation, l'expiration, les tests et la limitation du débit.

Cette fonctionnalité doit être testée avant de protéger des opérations financières réelles. Une clé API ne déplace pas de fonds à elle seule et ne doit jamais pouvoir contourner les autorisations du modèle `Paiement`.
