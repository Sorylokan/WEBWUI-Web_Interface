# 🧩 FICHE CONCEPT — ÉVOLUTION WEBWUI

NOTE IMPORTANTE : CETTE FICHE EST PUREMENT INDICATIVE ET NE CONSTITUE PAS UNE REFERENCE ABSOLUE.
---

# 📘 PARTIE 1 — EXPLICATIVE

## 🎯 Objectif

Faire évoluer l’interface actuelle de la WEBWUI (outil desktop connecté à Streamer.bot via WebSocket local) vers une expérience plus fluide, plus claire et plus intuitive, **sans supprimer de fonctionnalités existantes**.

Il ne s’agit pas d’un redesign esthétique, mais d’un **défrichage UX** :

> Clarifier les parcours sans appauvrir l’outil.

---

## 🧠 Constat actuel

### Points forts

* Interface fonctionnelle
* Architecture déjà structurée (header + builder + preview + logs)
* État système visible (connexion WS, status dot, etc.)
* Outil travaillé et complet

### Points de friction

* Sensation de densité visuelle
* Workflow perçu comme fragmenté
* Construction de l’embed séparée de sa représentation finale
* Potentiel d’intégration Streamer.bot sous-exploité

---

## 🚀 Vision d’évolution

Transformer l’outil de :

> Formulaire + aperçu

vers :

> Éditeur visuel d’embed orienté Streamer.bot

L’objectif est de réduire la friction mentale entre édition et résultat, tout en conservant la puissance existante.

---

# 🔁 Axe 1 — Fusion Builder / Preview

## 🎯 But

Réduire la séparation entre :

* Édition (abstraite)
* Résultat (concret)

## 💡 Concept

### Mode Édition (par défaut)

* Preview centrale
* Édition inline de tous les éléments :

  * Titre cliquable
  * Description éditable
  * Fields ajoutables et modifiables directement
* Placeholders gris pour éléments optionnels :

  * Message content
  * Fields vides
  * Image (zone texte lien)
  * Footer
* Contrôles visibles au hover / focus
* Moins de champs persistants affichés en permanence

👉 L’utilisateur construit directement dans le rendu.

---

### Mode Rendu Final

Bouton : `View as Discord`

* Aucun élément éditable
* Rendu strict et non modifiable
* Simulation réaliste du message final
* Masquage automatique des zones vides et placeholders

Séparation claire entre construction et validation.

---

# 🧩 Axe 2 — Intégration Streamer.bot renforcée

## 🎯 But

Rendre l’outil cohérent avec son écosystème réel.

## 💡 Idée

Support plus visible des variables Streamer.bot :

* Icône contextuelle `{}` ou `SB` à côté des champs compatibles
* Tooltip rapide au hover
* Modal détaillée au clic contenant :

  * Variables disponibles
  * Exemples d’usage
  * Snippets copiables

Principe fondamental :

> Aucune surcharge permanente.
> L’aide reste contextuelle et optionnelle.

---

# 🌿 Axe 3 — Défrichage visuel

## 🎯 But

Réduire la sensation de “fouillis” sans retirer de fonctionnalités.

## Moyens

* Sections collapsables
* Mode “Advanced”
* Espacement plus clair des blocs majeurs
* Réduction de la densité de contrôles visibles simultanément
* Priorisation visuelle des actions principales

---

# 🧠 Philosophie UX

### ❌ Ne pas faire

* Transformer l’outil en landing marketing
* Ajouter des éléments décoratifs inutiles
* Simplifier au point de retirer de la puissance

### ✅ Faire

* Fluidifier
* Contextualiser
* Réduire la fragmentation
* Maintenir l’aspect “outil desktop”

---

# 🎛 Positionnement final souhaité

L’interface doit ressembler à :

> Un éditeur spécialisé pour Streamer.bot
> Pas à un simple formulaire web.

Elle doit transmettre :

* Maîtrise
* Fluidité
* Puissance maîtrisée
* Environnement de production

---

# 📌 Résumé en une phrase

Évolution de la WEBWUI vers un éditeur visuel d’embed intégré à Streamer.bot, fusionnant édition et preview, tout en clarifiant l’interface et en contextualisant les aides avancées.

---

---

# 🛠 PARTIE 2 — TECHNIQUE

---

## 🔹 Rôle de `structure.html`

Le fichier `structure.html` :

* Sert **uniquement de référence démonstrative**
* Illustre la hiérarchie et la disposition des zones (preview, paramètres avancés, fields, etc.)
* Permet de visualiser le concept
* Ne constitue **ni un livrable final ni un prototype fonctionnel complet**
* Ne doit pas être copié tel quel

Il sert à clarifier la direction et préparer la refonte UI.

---

## 🔹 Structure générale attendue

```
HEADER
- Logo / Icon
- WebSocket Status

MAIN LAYOUT
- Panel left: Parameters / Advanced
  - Webhooks
  - Username / Avatar
  - Embed Color
  - Images
  - Fields
  - JSON (collapsable)

- Preview central: Discord-style editable
  - Message content (placeholder grisé)
  - Embed
    - Author
    - Title
    - Description
    - Fields
    - Image / Thumbnail
    - Footer / Timestamp

- Toggle : View as Discord

FOOTER
- Retour visuel / statut / info complémentaire
```

---

## 🔹 Comportements attendus

## 🔹 Principes d'implémentation

* **Conservation de l'existant**
  - Architecture modulaire préservée (`modules/`)
  - Système de synchronisation JSON maintenu
  - Connexion WebSocket inchangée
  - Toutes les fonctionnalités actuelles conservées

* **Changements = présentation uniquement**
  - Réorganisation spatiale des contrôles
  - Preview centrale devient le point focal
  - Paramètres avancés deviennent collapsables/discrets
  - JSON reste actif mais masqué par défaut

---

### 1️⃣ Preview

* Édition inline pour :

  * Message content
  * Titre
  * Description
  * Fields
  * Footer
* Zones grisées indiquant les éléments optionnels
* Apparition de contrôles au hover / focus
* Structure fidèle au rendu Discord
* Desktop-first

---

### 2️⃣ Parameters Panel

* Paramètres avancés :

  * Webhook
  * Username
  * Avatar
  * Couleur embed
  * Images
  * Fields
  * JSON / Raw payload
* Sections collapsables
* Mode “Advanced”
* Densité visuelle maîtrisée

---

### 3️⃣ Mode “View as Discord”

* Masque tous les placeholders
* Masque tous les champs vides
* Désactive toute édition
* Simule le rendu final réel

---

### 4️⃣ Intégration Streamer.bot

* Icône `{}` ou `SB` sur champs compatibles
* Tooltip rapide
* Modal détaillée avec :

  * Variables disponibles
  * Exemples
  * Snippets copiables

---

## 🔹 Style visuel

* Fond sombre (respect du style actuel)
* Accents bleus pour embeds et boutons
* Textes clairs
* Placeholders gris
* Pas d’éléments décoratifs superflus
* Priorité : lisibilité + hiérarchie + efficacité

---

## 🔹 Workflow conseillé pour le développement

1. Créer layout 3 zones (panel gauche / preview / footer)
2. Implémenter édition inline dans la preview
3. Ajouter placeholders conditionnels
4. Ajouter panneau paramètres collapsable
5. Implémenter toggle “View as Discord”
6. Tester compatibilité :

   * Fields
   * Images
   * Footer
   * JSON
   * Variables Streamer.bot
7. Utiliser `structure.html` uniquement comme repère hiérarchique
---

---

# 🔧 PARTIE 3 — IMPLÉMENTATION TECHNIQUE

---

## 🏗️ Architecture existante (à préserver)

### Modules JavaScript (ES6)

```
app-modular.js          → Orchestrateur principal
modules/
  ├── manager.js        → Gestion données, JSON, localStorage, validation
  ├── renderer.js       → Génération HTML preview, parsing Markdown Discord
  ├── ui.js             → Manipulation DOM, events, embeds, fields
  ├── websocket.js      → Communication Streamer.bot via WebSocket
  ├── theme.js          → Dark/Light theme toggle
  └── modals.js         → Système de modales (confirmation, import, etc.)
```

### CSS modulaire

```
styles.css              → Point d'entrée (imports CSS modules)
css/
  ├── tokens.css        → Variables CSS (couleurs, espacements, transitions)
  ├── base.css          → Reset et styles de base
  ├── layout.css        → Grid principale, header, footer
  ├── buttons.css       → Styles boutons
  ├── forms.css         → Inputs, textareas, selects
  ├── tabs.css          → Système d'onglets
  ├── panels.css        → Embeds, fields, preview
  ├── modals.css        → Fenêtres modales
  └── utilities.css     → Classes utilitaires
```

### Points forts à conserver absolument

* ✅ **Validation payload Discord** (limites caractères, formats)
* ✅ **Incremental rendering** (optimisation performance preview)
* ✅ **LocalStorage auto-save avec throttling** (400ms)
* ✅ **Markdown parser Discord** (bold, italic, code, spoilers, etc.)
* ✅ **Modales de confirmation** (suppressions, imports)
* ✅ **Système de thème** (dark/light)

---

## 📐 Répartition Layout : 30% / 70%

### Disposition cible

```
┌─────────────────────────────────────────────────┐
│              HEADER (fixe)                      │
│  Logo | WebSocket | Theme Toggle                │
├───────────────┬─────────────────────────────────┤
│  PANEL LEFT   │     CENTRAL PREVIEW             │
│     30%       │           70%                   │
│               │                                 │
│ Collapsable   │  Discord-style Editable         │
│ - Info Tab    │  - Message content (input)      │
│ - Content Tab │  - Embed preview (inputs)       │
│               │  - Fields inline                │
│ [Save Btn]    │                                 │
│               │  [View as Discord]              │
│               │                                 │
│               │  JSON (collapsed by default)    │
├───────────────┴─────────────────────────────────┤
│              FOOTER (fixe)                      │
└─────────────────────────────────────────────────┘
```

CECI EST UN EXEMPLE

### Changements layout

* **Actuellement** : `grid-template-columns: 1fr 1fr` (50/50)
* **Cible** : `grid-template-columns: 30% 70%` (exemple)
* Panel gauche **fixe** (non collapsable, mais présent et étroit)
* Preview **centrale** et **dominante visuellement**

---

## 🎨 Preview éditable : Approche Inputs Stylisés

### Principe

Transformer la preview de **divs statiques** vers **inputs/textareas stylisés** qui ressemblent visuellement à du texte Discord, mais restent éditables.

### Avantages inputs vs contenteditable

| Critère                  | Inputs stylisés ✅       | contenteditable ⚠️      |
|--------------------------|-------------------------|-------------------------|
| Contrôle valeur          | Total (value)           | Partiel (innerHTML)     |
| Validation               | Native HTML5            | Manuelle                |
| Limites caractères       | maxlength natif         | Script custom           |
| Sync avec JSON           | Simple (input event)    | Complexe (MutationObs)  |
| Accessibilité            | Excellente              | Moyenne                 |
| Compatibilité navigateurs| Parfaite                | Quirks cross-browser    |

### Implémentation technique

#### Message Content

**Avant (statique)** :
```html
<div class="message-content">Texte du message</div>
```

**Après (éditable)** :
```html
<textarea 
  class="message-content editable-input" 
  placeholder="Message content (optional)"
  maxlength="2000"
  data-sync="msgContent"
></textarea>
```

**CSS pour mimétisme Discord** :
```css
.editable-input {
  background: transparent;
  border: 1px dashed transparent;
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.95rem;
  padding: 0.5rem;
  resize: none;
  width: 100%;
}

.editable-input:focus {
  border-color: var(--primary);
  outline: none;
  background: rgba(124, 58, 237, 0.05);
}

.editable-input::placeholder {
  color: var(--text-muted);
  font-style: italic;
  opacity: 0.6;
}
```

#### Embed Title

**Avant** :
```html
<div class="embed-title">Mon titre</div>
```

**Après** :
```html
<input 
  type="text" 
  class="embed-title editable-input"
  placeholder="Embed Title"
  maxlength="256"
  data-sync="embed.title"
>
```

### Mode "View as Discord"

Bouton toggle qui change l'état de l'interface :

**Mode Édition (défaut)** :
- Inputs visibles avec placeholders
- Bordures au focus
- Champs vides affichés en grisé

**Mode "View as Discord"** (readonly) :
- Inputs passent en `readonly`
- Placeholders masqués via CSS
- Champs vides complètement cachés
- Bordures supprimées
- Rendu final "comme sur Discord"

**Implémentation** :
```javascript
function toggleViewMode(isDiscordView) {
  const container = document.querySelector('.preview-container');
  
  if (isDiscordView) {
    container.classList.add('discord-view-mode');
    // Tous les inputs deviennent readonly
    container.querySelectorAll('.editable-input').forEach(input => {
      input.setAttribute('readonly', true);
      // Masquer si vide
      if (!input.value.trim()) {
        input.style.display = 'none';
      }
    });
  } else {
    container.classList.remove('discord-view-mode');
    container.querySelectorAll('.editable-input').forEach(input => {
      input.removeAttribute('readonly');
      input.style.display = '';
    });
  }
}
```

---

## 📂 Fichiers à modifier par phase

### Phase 1 : Restructuration Layout (Axe 1 + 3)

**Objectif** : Passer au layout 40/60 avec panel gauche fixe

| Fichier                | Action                                    | Impact  |
|------------------------|-------------------------------------------|---------|
| `index.html`           | Modifier grid-template-columns            | 🟡 Moyen |
| `css/layout.css`       | Adapter `.main-container` (30/70)         | 🟢 Faible |
| `css/panels.css`       | Ajuster largeurs panel et preview         | 🟢 Faible |
| `css/panels.css`       | JSON collapsé par défaut (`.collapsed`)   | 🟢 Faible |

**Changements** :
- HTML → Grid 40/60
- CSS → Adapter largeurs, espacements
- JSON → Ajouter class `collapsed` par défaut

**Risque** : 🟢 Faible (CSS uniquement, pas de JS)

---

### Phase 2 : Preview Éditable (Cœur Axe 1)

**Objectif** : Remplacer preview statique par inputs stylisés

| Fichier                | Action                                           | Impact   |
|------------------------|--------------------------------------------------|----------|
| `modules/renderer.js`  | Générer inputs au lieu de divs                   | 🔴 Élevé |
| `modules/ui.js`        | Listeners sur inputs preview → sync JSON         | 🔴 Élevé |
| `css/panels.css`       | Styles `.editable-input` (mimétisme Discord)     | 🟡 Moyen |
| `modules/ui.js`        | Bouton "View as Discord" + toggle readonly       | 🟡 Moyen |
| `index.html`           | Ajouter bouton "View as Discord" dans header     | 🟢 Faible |

**Changements** :
- `renderEmbedPreview()` → Génère `<input>` au lieu de `<div>`
- `updatePreview()` → Attach listeners sur inputs
- Nouveau : `toggleViewMode(isDiscordView)`

**Risque** : 🔴 Élevé (logique de rendu à refactorer)

**Mitigation** :
- Conserve système incremental update existant
- Throttling inputs (déjà présent dans `manager.js`)
- Tests progressifs field par field

---

### Phase 3 : Aide Streamer.bot (Axe 2 - Optionnel)

**Objectif** : Ajouter icônes `{}` contextuelles avec modales d'aide

| Fichier                          | Action                                    | Impact   |
|----------------------------------|-------------------------------------------|----------|
| `modules/streamerbot-helper.js`  | Nouveau module pour variables SB          | 🟢 Faible |
| `modules/modals.js`              | Ajouter modal "Variables Streamer.bot"    | 🟢 Faible |
| `css/utilities.css`              | Styles icônes contextuelles               | 🟢 Faible |
| `index.html`                     | Injecter icônes `{}` à côté des champs    | 🟡 Moyen |

**Changements** :
- Nouveau module additionnel (n'affecte pas l'existant)
- Modal statique avec liste variables + exemples
- Icônes injectées dynamiquement

**Risque** : 🟢 Faible (feature additive)

---

## ⚙️ Détails techniques clés

### Synchronisation JSON

**Principe** : Les inputs preview doivent synchroniser avec le même état JSON que le formulaire actuel.

**Approche** :
```javascript
// Dans ui.js
attachPreviewInputListeners() {
  document.querySelectorAll('.editable-input').forEach(input => {
    input.addEventListener('input', () => {
      this.updatePreview(); // Déjà existant
      this.manager.saveToLocalStorage(); // Déjà existant avec throttling
    });
  });
}
```

**Avantage** : Réutilise le système existant (throttling 400ms, validation)

---

### Placeholders conditionnels

Afficher les placeholders uniquement si le champ est vide :

**CSS** :
```css
.editable-input:not(:placeholder-shown) {
  /* Style quand rempli */
}

.editable-input:placeholder-shown {
  /* Style quand vide (placeholder visible) */
  opacity: 0.6;
  font-style: italic;
}

/* Mode "View as Discord" : masquer les vides */
.discord-view-mode .editable-input:placeholder-shown {
  display: none !important;
}
```

---

### Performance : Incremental Update

**Conserver** le système actuel de `renderer.js` :
- `_incrementalUpdate()` → Met à jour uniquement les changements
- Évite de recréer tout le DOM à chaque input

**Adaptation** :
```javascript
// Avant : générait des divs
_updateEmbed(embedEl, embed) {
  const titleEl = embedEl.querySelector('.embed-title');
  if (titleEl.textContent !== embed.title) {
    titleEl.textContent = embed.title;
  }
}

// Après : met à jour des inputs
_updateEmbed(embedEl, embed) {
  const titleInput = embedEl.querySelector('.embed-title');
  if (titleInput.value !== embed.title) {
    titleInput.value = embed.title || '';
  }
}
```

---

## 🎯 Plan de phases détaillé

### Phase 1 : Layout 40/60 (Durée estimée : 2-3h)

1. ✅ Enrichir fiche technique (ce document)
2. 🔄 Modifier `css/layout.css` → grid 40/60
3. 🔄 Ajuster `css/panels.css` → largeurs, espacements
4. 🔄 JSON collapsé par défaut → ajouter class `.collapsed` dans `index.html`
5. ✅ Tests visuels responsive

**Livrable** : Interface avec nouveau layout, fonctionnalités intactes

---

### Phase 2 : Preview Éditable (Durée estimée : 6-8h)

1. 🔄 Créer styles `.editable-input` dans `css/panels.css`
2. 🔄 Modifier `renderer.js` → Générer inputs au lieu de divs
   - `renderEmbedPreview()` → inputs
   - `_renderWebhookHeader()` → inputs pour username
   - Conserver incremental update
3. 🔄 Ajouter listeners dans `ui.js`
   - `attachPreviewInputListeners()`
   - Sync avec JSON via events existants
4. 🔄 Ajouter bouton "View as Discord" dans header
5. 🔄 Créer fonction `toggleViewMode()` dans `ui.js`
6. ✅ Tests :
   - Édition inline fonctionne
   - Sync JSON OK
   - LocalStorage OK
   - Mode Discord view masque les vides

**Livrable** : Preview complètement éditable avec toggle Discord view

---

### Phase 3 : Aide Streamer.bot (Durée estimée : 3-4h)

1. 🔄 Créer `modules/streamerbot-helper.js`
2. 🔄 Ajouter modal variables dans `modals.js`
3. 🔄 Injecter icônes `{}` contextuelles
4. 🔄 Styles icônes dans `css/utilities.css`
5. ✅ Tests aide contextuelle

**Livrable** : Aide Streamer.bot intégrée (optionnel)

---

## 🚨 Risques et mitigations

| Risque                           | Probabilité | Impact | Mitigation                                  |
|----------------------------------|-------------|--------|---------------------------------------------|
| Régression features existantes  | Moyenne     | Élevé  | Tests systématiques après chaque phase      |
| Performance inputs trop lents    | Faible      | Moyen  | Conserver throttling + incremental update   |
| Sync JSON cassé                  | Moyenne     | Élevé  | Réutiliser events existants (input)         |
| Mode Discord view buggé          | Faible      | Faible | Toggle simple CSS (readonly + display:none) |
| Responsive cassé                 | Faible      | Moyen  | Tests multi-tailles après Phase 1           |

---

## ✅ Checklist de validation

### Après Phase 1
- [ ] Layout 40/60 affiché correctement
- [ ] Panel gauche reste fonctionnel (tabs, inputs)
- [ ] Preview visible et centrée
- [ ] JSON collapsé par défaut
- [ ] Responsive fonctionne (mobile cache preview)

### Après Phase 2
- [ ] Tous les champs éditables inline dans preview
- [ ] Placeholders grisés visibles si vide
- [ ] Sync JSON temps réel fonctionne
- [ ] Bouton "View as Discord" toggle correctement
- [ ] Mode Discord masque champs vides
- [ ] LocalStorage sauvegarde OK
- [ ] WebSocket envoi fonctionne
- [ ] Validation payload intacte

### Après Phase 3
- [ ] Icônes `{}` visibles sur champs compatibles
- [ ] Tooltip s'affiche au hover
- [ ] Modal variables s'ouvre au clic
- [ ] Exemples copiables fonctionnent

---

## 📝 Notes de développement

### Ordre des modifications

**Important** : Toujours modifier dans cet ordre pour éviter les régressions :

1. CSS d'abord (layout, styles)
2. HTML ensuite (structure, classes)
3. JavaScript en dernier (logique, events)

### Branches Git recommandées

```
main
├── feature/phase1-layout-40-60
├── feature/phase2-preview-editable
└── feature/phase3-streamerbot-help (optionnel)
```

### Tests à chaque commit

- Connexion WebSocket
- Ajout/suppression embed
- Ajout/suppression field
- Sauvegarde LocalStorage
- Export JSON
- Import JSON
- Test webhook direct
- Preview temps réel