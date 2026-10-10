# FlashBoard BCPST — v0.2 (iPhone uniquement)

Application web installable (PWA), gratuite et conçue pour l'iPhone. Aucun Mac ni backend requis.

## Ce qui est inclus

- Référentiel extrait du PDF `BCPST_referentiel_complet_suivi_2026-2027.pdf` : **116 chapitres et 1 187 notions**.
- Matières : Maths (343 items), Physique-Chimie (366), SVT (341), Outils implicites (137).
- Chaque item : score de maîtrise **0–10**, résultats cumulés aux exercices, erreurs récurrentes, historique des dates et prochaine révision.
- Planning automatiquement recalculé sur 14 jours pour les **chapitres activés**, en tenant compte des examens et du temps disponible.
- Séance d'exercices ChatGPT préparée par un bouton de copie des consignes, avec identifiants de notions.
- Import de bilans en **JSON**, soit par fichier `.json`, soit par copier-coller, avec **aperçu et confirmation** avant modification.
- Export/restauration de sauvegarde ; les anciennes données V0.1 (clé `flashboard-pwa-v1`) **restent intactes et exportables** depuis les réglages lorsqu'elles existent.
- Cache hors ligne après la première ouverture HTTPS, sans serveur de données.

## Mettre à jour ton site GitHub `Tracker` depuis l'iPhone

1. **Important :** si tu as déjà utilisé la V0.1 pour de vraies révisions, commence par **Réglages → Exporter en JSON** dans cette ancienne version. Sauvegarde ce fichier dans *Fichiers* sur ton iPhone.
2. Télécharge le ZIP **FlashBoard-BCPST-v0.2.zip** depuis ChatGPT dans l'application Fichiers.
3. Décompresse le ZIP d'une simple pression. Ouvre le dossier extrait.
4. Connecte-toi sur Safari à ton dépôt GitHub **Tracker** ; va dans l'onglet **Code** et sur la branche `main`.
5. Ouvre **Add file → Upload files** (au besoin dans le menu `…`, ou demande le site pour ordinateur dans Safari).
6. Téléverse **tous les fichiers du dossier décompressé**, pas le ZIP ni le dossier parent. Les fichiers `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js` doivent remplacer les anciennes versions. **Ajoute impérativement `referentiel.json`**, nouveau fichier essentiel. Le fichier `README.md` peut également être mis à jour.
7. Clique sur **Commit changes**. Attends que GitHub Pages reconstruise le site ; vérifie le déploiement dans **Settings → Pages**.
8. Ouvre ton URL déjà utilisée pour Tracker, par exemple `https://arnd064.github.io/Tracker/` si ton identifiant est `Arnd064`. Recharge la page dans Safari ; si nécessaire, ferme complètement l'application FlashBoard et ouvre-la à nouveau pour activer le nouveau service worker. L'application devrait afficher **BCPST · 2026–2027** en haut.
9. Sur Safari, **Partager → Sur l'écran d'accueil** si l'icône n'a pas déjà été installée.

**Important :** GitHub Pages publie les fichiers du site, pas tes progrès. Les scores, sessions et examens restent stockés localement sur cet iPhone, dans le stockage du site. Ne partage pas les bilans personnels dans les fichiers du dépôt public. Sauvegarde régulièrement tes données.

## Les fichiers à la racine

```text
index.html
styles.css
app.js
referentiel.json
manifest.webmanifest
sw.js
icon-192.png
icon-512.png
apple-touch-icon.png
README.md                (documentation seulement)
```

## Utilisation — la première fois

1. **Programme** : choisis une matière et clique sur **Suivre** pour chaque chapitre actuellement étudié. Les 1 187 notions sont accessibles ; celles hors chapitres actifs ne surchargent pas le planning.
2. **Planning** : ajoute les examens et ouvre **Réglages** pour définir le nombre de minutes disponibles par jour, un jour de repos et le nombre maximal de nouvelles notions introduites quotidiennement.
3. **Accueil → Préparer ma session** : le texte d'entraînement est copié, avec les identifiants `BCPST-xxxx`. Colle-le dans une conversation ChatGPT. Lance les exercices et réponds ; après la séance, dis `FIN DE SÉANCE`.
4. ChatGPT doit produire **un objet JSON uniquement**, sans balises Markdown, et un score pour chaque notion effectivement évaluée. S'il n'a pas évalué un item, il ne doit pas l'inclure.
5. Dans **Bilans IA**, colle le JSON produit ou utilise le bouton **Choisir un fichier .json**. Clique sur **Vérifier le bilan** puis **Confirmer et recalculer les dates**.
6. Les scores, ratios, erreurs récurrentes et prochaines échéances sont actualisés automatiquement. Vérifie **Suivi**.

### Schéma des bilans

```json
{
  "format": "flashboard.session.v1",
  "session": {
    "id": "seance-2026-10-10-logique-01",
    "date": "2026-10-10",
    "durationMinutes": 30,
    "notes": "Rappel actif de logique"
  },
  "items": [
    {
      "id": "BCPST-0001",
      "mastery": 6,
      "exercisesAttempted": 3,
      "exercisesCorrect": 2,
      "errors": [
        {
          "code": "negation-implication",
          "description": "Confusion sur la négation d'une implication"
        }
      ],
      "evidence": "Deux réponses exactes sur trois ; confusion corrigée ensuite",
      "confidence": "moyenne"
    }
  ]
}
```

Le texte d'entraînement est généré dans FlashBoard et donne à ChatGPT un identifiant de séance unique. Cela prévient les doubles imports. Un bilan contenant un identifiant inconnu, des valeurs incohérentes ou une date future est refusé. Les erreurs restent signalées jusqu'à ce qu'elles soient indiquées comme résolues.

### Barème indicatif sur 10

- 0 : aucune réussite démontrée lors des exercices effectués.
- 1–3 : difficultés importantes et besoin d'aide.
- 4–5 : compréhension partielle, procédures instables.
- 6–7 : restitution correcte de l'essentiel avec quelques erreurs.
- 8–9 : utilisation autonome, peu d'erreurs constatées.
- 10 : maîtrise solidement démontrée sur plusieurs situations.

Ce barème est une **convention de l'application**, et non une mesure scientifique étalonnée. Le score n'est attribué que si ChatGPT a effectivement évalué la notion ; tous les items commencent « Non évalué ».

### Intervalles de révisions initiaux

Selon la maîtrise, un item est proposé après 1, 2, 4, 7, 12, 21 ou 35 jours (majoration prudente lorsque les résultats sont bons plusieurs fois), avec possibilité de rappel avant un examen. Ce sont des **heuristiques personnalisables**, pas des intervalles validés universellement.

La planification fonctionne lorsque l'application est ouverte : sans serveur ni service push, elle **n'envoie pas automatiquement de notifications en arrière-plan** et ne lit pas automatiquement les résultats de ChatGPT, d'Anki ou de Forest.

## Limites connues de cette V0.2

- La planification est indicative et se recalcule à chaque ouverture ou modification. Elle ne réserve pas de créneaux horaires dans un calendrier externe.
- Les progrès issus du PDF précédent sont distincts des nouvelles données. Les anciens enregistrements V0.1 ne sont pas convertis automatiquement en notes du référentiel, car la correspondance entre les chapitres libres et les 1 187 items serait incertaine. Les données V0.1 ne sont pas supprimées.
- La précision des expressions mathématiques issues du texte PDF mérite parfois une vérification sur le document original lorsqu'il contient une formule complexe.
- L'intégration consiste à copier des consignes et importer des bilans JSON : **pas de connexion directe API à ChatGPT ni à Anki/Forest**.
- Si Safari efface les données de site ou si le nom de domaine change, les données locales peuvent être perdues : fais des sauvegardes fréquentes.

## Confidentialité

Aucune bibliothèque externe, aucun tracker, aucune publicité, aucun serveur de télémétrie. Les scores sont dans `localStorage` du site. Les données ne sont envoyées à ChatGPT **que si tu les copies volontairement dans une conversation**.
