# Guide de dépannage

## `npm install` échoue avec `ECONNRESET`

Cette erreur indique que `npm` n'arrive pas à télécharger les dépendances depuis le registre public. Elle apparaît
souvent dans les environnements fermés (laboratoires, SI sécurisés) où l'accès à internet est coupé ou passe par un proxy
HTTP/HTTPS authentifié.

### 1. Vérifier la connectivité sortante

```bash
npm ping
```

- Si la commande retourne `npm notice PING https://registry.npmjs.org/`, la connexion est fonctionnelle et le problème est ailleurs.
- Si la commande échoue avec `ECONNRESET`, c'est bien un blocage réseau : contactez l'administrateur ou utilisez un proxy approuvé.

### 2. Configurer le proxy de l'entreprise

Lorsque l'accès HTTP(s) doit passer par un proxy, indiquez-le explicitement à npm :

```bash
npm config set proxy http://utilisateur:motdepasse@proxy.mondomaine.fr:3128
npm config set https-proxy http://utilisateur:motdepasse@proxy.mondomaine.fr:3128
```

Adaptez évidemment l'URL, les identifiants et le port à votre infrastructure. Pour des proxys qui réécrivent les certificats
HTTPS, récupérez le certificat racine de l'entreprise et ajoutez-le à `NODE_EXTRA_CA_CERTS` avant de lancer `npm install`.

### 3. Nettoyer un cache corrompu / paramètres hérités

Un cache npm ou des paramètres hérités peuvent provoquer des coupures intempestives :

```bash
npm cache clean --force
npm config delete proxy
npm config delete https-proxy
npm config set registry https://registry.npmjs.org/
```

Relancez ensuite `npm install`. Si vous êtes hors-ligne par conception (machines isolées), privilégiez un mirroir interne
ou une installation manuelle des dépendances (copie de `node_modules` depuis une machine connectée).

### 4. Vérifier les scripts post-installation

Certaines dépendances exécutent des téléchargements supplémentaires pendant `npm install` (par exemple pour récupérer un binaire).
Passez l'installation en mode verbeux pour identifier le paquet fautif :

```bash
npm install --verbose
```

Ensuite, consultez la documentation de ce paquet pour voir s'il propose un mode « offline » ou une variable d'environnement
pour forcer l'utilisation d'un artefact local.

### 5. En dernier recours : installation depuis un cache local

1. Sur une machine ayant accès à internet, exécutez `npm ci` pour télécharger toutes les dépendances.
2. Copiez le dossier `node_modules` et `package-lock.json` sur la machine isolée.
3. Lancez directement `npm run dev` / `npm run server` sans relancer `npm install`.

Cette méthode n'est pas idéale mais permet d'avancer dans les environnements totalement déconnectés.
