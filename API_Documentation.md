# API Marchand GeniusPay

Intégrez les paiements mobiles (Wave, Orange Money, MTN Money) et par carte dans vos applications en quelques minutes.

## Base URL

```
http://geniuspay.ci/api/v1/merchant
```

### 🧪 Sandbox
Testez votre intégration sans frais. Les transactions sont simulées.

### 🚀 Production
Transactions réelles. Activez le mode live dans vos paramètres.

---

## Authentification

Toutes les requêtes doivent inclure vos clés API dans les headers HTTP.

| Header | Description |
|--------|-------------|
| `X-API-Key` | Votre clé publique (`pk_sandbox_...` ou `pk_live_...`) |
| `X-API-Secret` | Votre clé secrète (`sk_sandbox_...` ou `sk_live_...`) |
| `Content-Type` | `application/json` |

### Exemple avec cURL

```bash
curl -X POST http://geniuspay.ci/api/v1/merchant/payments \
  -H "X-API-Key: pk_sandbox_xxxxxxxx" \
  -H "X-API-Secret: sk_sandbox_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "customer": {"phone": "+221771234567"}}'
```

---

## 🚀 Démarrage rapide - 2 lignes de code

La façon la plus simple d'intégrer GeniusPay. Créez un paiement et redirigez votre client vers notre page de checkout sécurisée où il choisira son moyen de paiement.

### ✨ Intégration minimale

```php
// 1. Créer le paiement (sans spécifier payment_method)
$response = Http::withHeaders([
    'X-API-Key' => 'pk_live_xxx',
    'X-API-Secret' => 'sk_live_xxx',
])->post('http://geniuspay.ci/api/v1/merchant/payments', [
    'amount' => 15000,
    'description' => 'Commande #123',
]);

// 2. Rediriger vers la page de checkout GeniusPay
return redirect($response['data']['checkout_url']);
```

**Avantages :**
- ✅ **Rapide** : Intégration en 2 lignes, aucune logique de paiement à gérer
- ✅ **Sécurisé** : Page de checkout hébergée et sécurisée par GeniusPay
- ✅ **Tous les moyens** : Wave, Orange, MTN, Moov, Cartes bancaires

> 💡 **Comment ça marche ?**
> En omettant le paramètre `payment_method`, GeniusPay génère une URL vers notre page de checkout personnalisée. Votre client y choisira son moyen de paiement préféré. Une fois le paiement effectué, il sera redirigé et vous recevrez un webhook.

---

## Endpoints API

### POST /payments - Initier un paiement

Crée une nouvelle transaction et retourne une URL de paiement.

#### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `amount` | number | ✓ | Montant en XOF (min: 200) |
| `currency` | string | - | Devise : `XOF`, `EUR` ou `USD` (défaut: XOF). Les clients hors zone XOF paient l'équivalent converti dans leur devise locale (XAF, KES, GHS…) via le gateway adapté |
| `payment_method` | string | - | `wave`, `paystack`, `orange_money`, `mtn_money`, `card`, `pawapay`, `stripe`… Sans `payment_method`, le client choisit sur la page de checkout |
| `country` | string | - | Code ISO-2 du pays du client (`CM`, `KE`…). Alias de `customer.country` — détermine les moyens de paiement affichés au checkout (ex. M-Pesa pour `KE`) |
| `customer.name` | string | - | Nom du client |
| `customer.email` | string | - | Email du client |
| `customer.phone` | string | - | Téléphone du client |
| `customer.country` | string | - | Code ISO-2 du pays du client |
| `mmo_provider` | string | - | Provider mobile money explicite (ex. `MPESA_KEN`, `MTN_MOMO_CMR`). Sinon détecté via le numéro |
| `external_reference` | string | - | Votre référence métier (ex. `order-1234`). Sert aussi de clé d'idempotence |
| `description` | string | - | Description du paiement (max 500 car.) |
| `success_url` | string | - | URL de redirection après succès |
| `error_url` | string | - | URL de redirection après échec |
| `metadata` | object | - | Données personnalisées |

#### Idempotence

Pour rejouer une création sans risquer un double paiement (timeout réseau, retry), envoyez **soit** le header `Idempotency-Key: <valeur-unique>`, **soit** le champ `external_reference`. Si une transaction existe déjà avec cette clé pour votre compte, l'API retourne la transaction existante (`200`, `data.idempotent_replay: true`) au lieu d'en créer une nouvelle.

```bash
curl -X POST https://geniuspay.ci/api/v1/merchant/payments \
  -H "X-API-Key: pk_live_xxx" \
  -H "Idempotency-Key: order-1234-attempt-1" \
  -d '{"amount": 15000, "external_reference": "order-1234"}'
```

#### Requête

```json
{
  "amount": 15000,
  "country": "CM",
  "description": "Commande #12345",
  "external_reference": "order-12345",
  "customer": {
    "name": "Amadou Diallo",
    "email": "amadou@example.com",
    "phone": "+237699123456",
    "country": "CM"
  },
  "metadata": {
    "order_id": "12345"
  }
}
```

#### Réponse 201

```json
{
  "success": true,
  "data": {
    "id": 456,
    "reference": "MTX-A1B2C3D4E5",
    "external_reference": "order-12345",
    "amount": 15000,
    "fees": 450,
    "net_amount": 14550,
    "status": "pending",
    "checkout_url": "https://geniuspay.ci/checkout/MTX-A1B2C3D4E5",
    "payment_url": "https://wave.com/...",
    "gateway": "wave",
    "environment": "live",
    "expires_at": "2025-12-09T10:30:00.000000Z"
  }
}
```

> La référence à stocker est `reference` (format `MTX-XXXXXXXXXX` en production, `SANDBOX-…`/`SANDBOX_…` en sandbox). Le lien de paiement expire après **24 heures**.

### POST /payments/{reference}/refund - Rembourser un paiement

Rembourse un paiement complété. En sandbox, la transaction passe à `refunded` et l'événement `payment.refunded` est émis.

#### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `amount` | number | - | Montant partiel en XOF. Sans `amount` = remboursement total |
| `reason` | string | - | Motif du remboursement |

#### Réponse 200

```json
{
  "success": true,
  "message": "Refund processed",
  "data": {
    "reference": "MTX-A1B2C3D4E5",
    "status": "refunded",
    "refund_reference": "TXN-R9F8E7D6C5",
    "amount_refunded": 15000,
    "currency": "XOF",
    "environment": "live"
  }
}
```

> Seules les transactions `completed` peuvent être remboursées (`409 REFUND_NOT_ALLOWED` sinon). L'appel est idempotent : rejouer un remboursement déjà effectué retourne le même résultat.

---

### GET /payments - Lister les paiements

#### Paramètres de query

| Paramètre | Description |
|-----------|-------------|
| `status` | Filtrer par statut (`pending`, `completed`, `failed`) |
| `from` | Date de début (YYYY-MM-DD) |
| `to` | Date de fin (YYYY-MM-DD) |
| `per_page` | Résultats par page (défaut: 20, max: 100) |

#### Réponse 200

```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "reference": "MTX-A1B2C3D4E5",
      "amount": 15000,
      "status": "completed",
      "created_at": "2025-12-08T10:30:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 150
  }
}
```

---

### GET /payments/{reference} - Récupérer un paiement

Récupère les détails d'une transaction spécifique.

#### Réponse 200

```json
{
  "success": true,
  "data": {
    "id": 456,
    "reference": "MTX-A1B2C3D4E5",
    "amount": 15000,
    "fees": 450,
    "net_amount": 14550,
    "status": "completed",
    "payment_method": "wave",
    "customer": {
      "name": "Amadou Diallo",
      "phone": "+221771234567"
    },
    "created_at": "2025-12-08T10:30:00.000000Z",
    "completed_at": "2025-12-08T10:32:15.000000Z"
  }
}
```

---

### GET /account - Informations du compte

Récupère les informations de votre compte marchand.

#### Réponse 200

```json
{
  "success": true,
  "data": {
    "id": "uuid-merchant",
    "name": "Ma Boutique",
    "email": "contact@maboutique.com",
    "status": "active",
    "created_at": "2025-01-01T00:00:00.000000Z"
  }
}
```

---

### GET /account/balance - Solde du compte

Récupère le solde de votre compte.

#### Réponse 200

```json
{
  "success": true,
  "data": {
    "available": 1250000,
    "pending": 75000,
    "total": 1325000,
    "currency": "XOF"
  }
}
```

---

## Webhooks

Recevez des notifications en temps réel sur les événements de vos paiements.

### Endpoints Webhooks

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/webhooks` | Lister les webhooks |
| POST | `/webhooks` | Créer un webhook |
| PUT | `/webhooks/{id}` | Modifier un webhook |
| DELETE | `/webhooks/{id}` | Supprimer un webhook |
| POST | `/webhooks/{id}/test` | Tester un webhook |

### Événements webhook

| Événement | Description |
|-----------|-------------|
| `payment.initiated` | Paiement initié |
| `payment.success` | Paiement réussi |
| `payment.failed` | Paiement échoué |
| `payment.cancelled` | Paiement annulé |
| `payment.refunded` | Paiement remboursé |

### Payload webhook

```json
{
  "event": "payment.success",
  "timestamp": "2025-12-08T10:32:15.000000Z",
  "data": {
    "transaction": {
      "id": 456,
      "reference": "MTX-A1B2C3D4E5",
      "amount": 15000,
      "status": "completed",
      "customer": {
        "name": "Amadou Diallo",
        "phone": "+221771234567"
      },
      "metadata": {
        "order_id": "12345"
      }
    },
    "merchant": {
      "id": "uuid-merchant",
      "name": "Ma Boutique"
    },
    "environment": "sandbox"
  }
}
```

---

## Sécurité des webhooks

> ⚠️ **Important** : Ne traitez jamais un webhook sans vérifier sa signature.

### Headers webhook

| Header | Description |
|--------|-------------|
| `X-Webhook-Signature` | Signature HMAC-SHA256 de `timestamp + "." + payload` |
| `X-Webhook-Timestamp` | Timestamp Unix utilisé pour la signature |
| `X-Webhook-Event` | Type d'événement |
| `X-Webhook-Environment` | `sandbox` ou `live` |

Chaque webhook possède son propre secret (`whsec_…`), affiché une seule fois à sa création — régénérable depuis le dashboard ou via `POST /webhooks/{id}/regenerate-secret`.

### Vérification PHP

```php
function verifySignature($payload, $timestamp, $signature, $secret) {
    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    return hash_equals($expected, $signature);
}

$payload   = file_get_contents('php://input'); // corps brut, non re-sérialisé
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$timestamp = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'];
$secret    = 'whsec_xxxxxxxx';

if (!verifySignature($payload, $timestamp, $signature, $secret)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($payload, true);
// Traiter l'événement...
```

### Retries

Si votre endpoint renvoie une erreur ou expire, GeniusPay renvoie la notification avec un backoff exponentiel : **1 min → 5 min → 15 min → 1 h → 4 h → 24 h**, jusqu'à `retry_count` tentatives (3 par défaut, configurable à la création du webhook). Au-delà, la livraison passe en échec — l'historique est consultable via `GET /webhooks` et le dashboard. Répondez `2xx` rapidement (< 10 s) et traitez l'événement de façon asynchrone.

---

## Statuts des paiements

| Statut | Description |
|--------|-------------|
| `pending` | En attente de paiement |
| `processing` | En cours de traitement |
| `completed` | Paiement réussi |
| `failed` | Paiement échoué |
| `cancelled` | Paiement annulé |
| `refunded` | Paiement remboursé |

---

## Méthodes de paiement

| Code | Nom | Pays |
|------|-----|------|
| `wave` | Wave | SN, CI, ML, BF |
| `orange_money` | Orange Money | SN, CI, ML, BF |
| `mtn_money` | MTN Mobile Money | CI, BF |
| `card` | Carte bancaire (Visa, Mastercard) | International |

> 💡 **Conseil** : Omettez le paramètre `payment_method` pour laisser le client choisir sur la page de checkout GeniusPay. C'est l'approche recommandée pour maximiser les conversions.

---

## Codes d'erreur

| Code | HTTP | Description |
|------|------|-------------|
| `MISSING_API_KEY` | 401 | Clé API manquante |
| `INVALID_API_KEY` | 401 | Clé API invalide |
| `MERCHANT_INACTIVE` | 403 | Compte désactivé |
| `PAYMENT_INIT_FAILED` | 400 | Échec d'initialisation |
| `TRANSACTION_NOT_FOUND` | 404 | Transaction introuvable |
| `VALIDATION_ERROR` | 422 | Données invalides |

---

## Exemples d'intégration

### Mode Checkout (Recommandé)

Sans `payment_method`, le client choisit son moyen de paiement sur la page GeniusPay.

#### PHP / Laravel

```php
// 🚀 Intégration en 2 lignes
$response = Http::withHeaders([
    'X-API-Key' => 'pk_live_xxx',
    'X-API-Secret' => 'sk_live_xxx',
])->post('http://geniuspay.ci/api/v1/merchant/payments', [
    'amount' => 15000,
    'description' => 'Commande #123',
    // PAS de payment_method = Page checkout GeniusPay
]);

return redirect($response['data']['checkout_url']);
```

#### JavaScript

```javascript
const response = await fetch('http://geniuspay.ci/api/v1/merchant/payments', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_live_xxx',
    'X-API-Secret': 'sk_live_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 15000,
    description: 'Commande #123'
  })
});

const data = await response.json();
window.location.href = data.data.checkout_url;
```

#### Python

```python
import requests

response = requests.post(
    'http://geniuspay.ci/api/v1/merchant/payments',
    headers={
        'X-API-Key': 'pk_live_xxx',
        'X-API-Secret': 'sk_live_xxx',
        'Content-Type': 'application/json'
    },
    json={
        'amount': 15000,
        'description': 'Commande #123'
    }
)

data = response.json()
checkout_url = data['data']['checkout_url']
```

### Mode Direct (Alternatif)

Avec `payment_method` spécifié, redirection directe vers le gateway.

```php
$response = Http::withHeaders([
    'X-API-Key' => 'pk_live_xxx',
    'X-API-Secret' => 'sk_live_xxx',
])->post('http://geniuspay.ci/api/v1/merchant/payments', [
    'amount' => 15000,
    'payment_method' => 'wave', // Redirection directe vers Wave
    'customer' => [
        'phone' => '+221771234567',
    ],
]);

return redirect($response['data']['payment_url']);
```

---

## Support

- **Email** : support@geniuspay.ci
- **Dashboard** : http://geniuspay.ci/dashboard
- **Documentation** : http://geniuspay.ci/docs/api

---

© 2025 GeniusPay. Tous droits réservés.
