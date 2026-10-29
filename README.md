# Application Sky Business (Android et iPhone)

Application mobile de [Sky Business](https://skybusiness.ci) : voitures à vendre, location, import, immobilier,
pièces détachées, messagerie avec les vendeurs et l'assistant IA, cotations de location.

Elle utilise directement le site WordPress (extension **sky-business**, API `/wp-json/sky/v1/…`) :
mêmes comptes, mêmes annonces, mêmes messages que sur le site.

## Fabrication

- **Android** : automatique à chaque modification (onglet *Actions* → « Android »).
  Le fichier `.apk` (installation directe) et le fichier `.aab` (Google Play) sont déposés dans la branche `builds`.
- **iPhone** : nécessite le compte développeur Apple (étape suivante).

### Secrets du dépôt (Settings → Secrets and variables → Actions)

| Nom | Contenu |
| --- | --- |
| `GOOGLE_SERVICES_JSON` | contenu du fichier `google-services.json` de Firebase (notifications) |
| `SKY_UPLOAD_KEYSTORE_B64` | clé d'envoi Google Play, encodée en base64 |
| `SKY_KEYSTORE_PASSWORD`, `SKY_KEY_ALIAS`, `SKY_KEY_PASSWORD` | mots de passe et alias de la clé d'envoi |

Sans ces secrets, l'application est fabriquée quand même (signature de test, sans notifications).

## Développement

```bash
npm install
npx expo start            # aperçu
npx tsc --noEmit          # vérification du code
```

Adresse du site : `extra.sites` dans `app.config.js` (la première qui répond est utilisée,
puis l'adresse indiquée par le site lui-même).
