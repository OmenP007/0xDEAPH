# TRUST Mobile

Application Flutter de séquestre numérique et de paiement sécurisé.

## Prérequis

- Flutter 3.47+ (Dart 3.10+)
- Android SDK (pour Android) ou Xcode (pour iOS)
- Le backend Django du projet lancé sur le port `8000`

## Configuration de l'API

L'URL du backend est configurable au build :

```bash
# Émulateur Android (valeur par défaut)
flutter run

# Appareil physique / réseau local
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:8000

# iOS Simulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

> Le mode HTTP en clair est activé dans le manifest Android pour le développement.
> Il devra être retiré (HTTPS obligatoire) avant une publication en production.

## Lancer l'application

```bash
flutter pub get
flutter run
```

## Vérifications

```bash
flutter analyze
flutter test
```

## Compiler l'APK Android

```bash
flutter build apk --debug
# Sortie : build/app/outputs/flutter-apk/app-debug.apk
```

> Le build Linux desktop nécessite le paquet système `libsecret-1-dev`
> (`flutter_secure_storage`). Le build Android n'a pas cette dépendance.

## État d'avancement

Branches fonctionnelles :

- Authentification JWT (profil réel via `/api/me/`, refresh token, expiration de session)
- Changement de mot de passe (`/api/me/password/`)
- Liste paginée des paiements / séquestres
- Création d'un séquestre + lien de règlement GeniusPay (copie et ouverture)
- Confirmation de réception acheteur / validation OTP vendeur
- Ouverture de litige
- Paylinks (création, QR code, URL fournie par le backend, ouverture)
- Portefeuille (solde serveur, historique des mouvements, demandes de dépôt/retrait en `PENDING`)
- KYC (`/api/kyc/`) : soumission réelle avec lien HTTPS vers le document
- Clés API développeur (`/api/keys/`) : liste, création avec secret affiché une fois, révocation

Encore en aperçu (non relié) :

- Envoi direct de fichiers KYC (le backend n'accepte aujourd'hui qu'une URL `/media/` ou `https://`)
- Double authentification (2FA), affichée comme « bientôt disponible »

Libération des fonds : GeniusPay n'expose pas d'endpoint de payout. La
libération crédite donc le portefeuille interne du vendeur, qui peut ensuite
demander un retrait Wave / Orange Money / MTN MoMo depuis l'écran Portefeuille.
