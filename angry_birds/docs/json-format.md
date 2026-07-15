# JSON Format Reference

This is the complete reference for the two file types the framework reads —
**GAME** and **LEVEL** — plus every **definition** type they contain. It matches
what `AB.normalizeGame` / `AB.normalizeLevel` accept (they fill in any missing
field with a default, so most fields are optional).

All coordinates are **world coordinates**: `+x` is right, `+y` is **down**.
Angles are in **degrees**. Colors are any CSS color string.

- [Game object](#game-object)
- [Level object](#level-object)
- [Placed entities](#placed-entities-inside-a-level)
- [Material (block) definition](#material-block-definition)
- [Bird definition](#bird-definition)
- [Pig definition](#pig-definition)
- [Boss definition](#boss-definition)
- [Background definition](#background-definition)
- [Script object](#script-object)
- [Built-in ids at a glance](#built-in-ids-at-a-glance)

---

## Game object

A **game** (a "campaign") bundles custom definitions, a list of levels, and story
text into one file. It is what `play.html` / `AB.Campaign` loads.

```json
{
  "format": "ab-game",
  "version": "2.0.0",
  "id": "my-first-game",
  "title": "My Angry Birds Game",
  "author": "",
  "description": "",
  "settings": { "tuning": {}, "startLevel": 0, "allowLevelSelect": true },
  "story": { "intro": "text shown before the game", "outro": "text shown after finishing" },
  "textures": { "wood": "data:image/png;base64,...", "myKey": "assets/textures/foo.png" },
  "customMaterials":   { "id": { /* material def */ } },
  "customBirds":       { "id": { /* bird def */ } },
  "customPigs":        { "id": { /* pig def */ } },
  "customBosses":      { "id": { /* boss def */ } },
  "customBackgrounds": { "id": { /* background def */ } },
  "globalScripts": [ { "hook": "onUpdate", "code": "..." } ],
  "levels": [ /* level objects */ ]
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `format` | string | `"ab-game"` | Marks the file as a game. |
| `version` | string | engine version | Game format version. |
| `id` | string | *(none)* | **Stable id used for the save slot.** Set this before publishing so player progress (stars/score in `localStorage`) survives updates. |
| `title` | string | `"My Angry Birds Game"` | Shown in menus. |
| `author` | string | `""` | Credit. |
| `description` | string | `""` | Blurb. |
| `settings` | object | see below | Game-wide settings. |
| `story` | object | `{}` | `intro` (before the game) and `outro` (after finishing) text. |
| `textures` | object | `{}` | Map of **texture key → URL or data-URI**. Referenced by any def's/placement's `texture` field. |
| `customMaterials` | object | `{}` | Map of **id → [material def](#material-block-definition)**. |
| `customBirds` | object | `{}` | Map of **id → [bird def](#bird-definition)**. |
| `customPigs` | object | `{}` | Map of **id → [pig def](#pig-definition)**. |
| `customBosses` | object | `{}` | Map of **id → [boss def](#boss-definition)**. |
| `customBackgrounds` | object | `{}` | Map of **id → [background def](#background-definition)**. |
| `globalScripts` | array | `[]` | [Script objects](#script-object) that run in **every** level, in addition to that level's own scripts. |
| `levels` | array | `[]` | The [level objects](#level-object), played in list order. |

### `settings`

| Field | Type | Default | Description |
|---|---|---|---|
| `tuning` | object | `{}` | Overrides for any [`AB.TUNING`](#abtuning-constants) value. Applied at load. |
| `startLevel` | number | `0` | Index of the level that opens first. |
| `allowLevelSelect` | boolean | `true` | Whether players may pick levels. |

**Custom definitions override built-ins.** If a `customMaterials`/`customBirds`/…
entry uses the same id as a built-in (e.g. `wood`, `red`), your version wins for
that game. Every custom definition is available to every level in the game.

---

## Level object

A **level** is one playable scene: placed entities plus settings plus scripts.

```json
{
  "id": "level_x",
  "name": "Untitled Level",
  "background": "sky",
  "gravity": { "x": 0, "y": 1 },
  "world": { "left": -400, "right": 2200, "groundY": 550 },
  "camera": { "start": { "x": 150, "y": 400 }, "zoom": 1 },
  "slingshot": { "x": 180, "y": 430 },
  "birds":  [ { "type": "red", "ability": "optional-override", "abilityData": {}, "abilityScript": "optional", "texture": "optional" } ],
  "pigs":   [ { "type": "normal", "x": 700, "y": 500, "hp": 100, "texture": "optional" } ],
  "blocks": [ { "type": "wood", "x": 700, "y": 500, "width": 88, "height": 22, "angle": 0, "shape": "rect", "texture": "optional" } ],
  "bosses": [ { "type": "king_pig_boss", "x": 1000, "y": 480, "hp": 2400, "script": "optional onUpdate override" } ],
  "props":  [ { "type": "steel", "x": 0, "y": 0, "width": 10, "height": 10 } ],
  "starThresholds": [10000, 30000, 60000],
  "scripts": [ { "hook": "onLevelStart", "code": "...", "name": "optional" } ],
  "intro": "story card shown before the level (optional)",
  "outro": "story card shown after clearing (optional)",
  "nextLevel": null
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | string | auto | Unique level id. |
| `name` | string | `"Untitled Level"` | Level title. |
| `background` | string | `"sky"` | Id of a [background](#background-definition) (built-in or custom). |
| `gravity` | `{x,y}` | `{ x: 0, y: 1 }` | World gravity direction/strength. `y:1` = normal down. |
| `world` | object | `{ left:-400, right:2200, groundY:550 }` | Playable bounds and ground line. |
| `camera` | object | `{ start:{x:150,y:400}, zoom:1 }` | Opening camera position and zoom. |
| `slingshot` | `{x,y}` | `{ x: 180, y: 430 }` | Where birds launch from. |
| `birds` | array | `[]` | Bird load-out, launched in **array order**. See [bird placement](#bird-placement). |
| `pigs` | array | `[]` | Placed [pigs](#pig-placement). |
| `blocks` | array | `[]` | Placed [blocks](#block-placement). |
| `bosses` | array | `[]` | Placed [bosses](#boss-placement). |
| `props` | array | `[]` | Static, immovable, decorative blocks. Same shape as blocks, but never move and (typically) aren't scored. |
| `starThresholds` | `[n,n,n]` | `[10000, 30000, 60000]` | Score cutoffs for **[1★, 2★, 3★]**. |
| `scripts` | array | `[]` | [Script objects](#script-object) for this level. |
| `intro` | string / null | `null` | Story card shown before the level. |
| `outro` | string / null | `null` | Story card shown after clearing. |
| `nextLevel` | string / null | `null` | Id of the level to go to next (otherwise the campaign advances in list order). |

### `world`

| Field | Type | Meaning |
|---|---|---|
| `left` / `right` | number | Horizontal bounds of the playable area. |
| `groundY` | number | Y of the ground surface; entities rest here. |

Bodies drifting more than `AB.TUNING.outOfBoundsMargin` (600px) past the camera
bounds are culled.

---

## Placed entities (inside a level)

These live inside a level's arrays. They reference a definition by `type` and add
per-placement data. Any per-placement field overrides the definition's default.

### Block placement

```json
{ "type": "wood", "x": 700, "y": 500, "width": 88, "height": 22, "angle": 0, "shape": "rect", "texture": "optional" }
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Material id (built-in or custom). |
| `x`, `y` | number | Center position. |
| `width`, `height` | number | Size (defaults to the material's `size`). |
| `angle` | number | Rotation in **degrees**. |
| `shape` | string | Override shape: `rect`/`circle`/`triangle`/`triangle_r`/`trapezoid`. |
| `texture` | string | Texture key override. |

`props` use the same fields but are static and immovable.

### Pig placement

```json
{ "type": "normal", "x": 700, "y": 500, "hp": 100, "texture": "optional" }
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Pig id. |
| `x`, `y` | number | Center position. |
| `hp` | number | Hit points (defaults to the pig def's `hp`). |
| `texture` | string | Texture key override. |

### Boss placement

```json
{ "type": "king_pig_boss", "x": 1000, "y": 480, "hp": 2400, "script": "optional onUpdate override" }
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Boss id. |
| `x`, `y` | number | Center position. |
| `hp` | number | Starting/max HP (defaults to the boss def's `hp`). |
| `script` | string | Optional `onUpdate` script body that overrides/augments the boss's AI for this placement. |

### Bird placement

```json
{ "type": "red", "ability": "optional-override", "abilityData": {}, "abilityScript": "optional", "texture": "optional" }
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Bird id. |
| `ability` | string | Override the bird's ability (built-in id or `"custom"`). |
| `abilityData` | object | Params passed to the ability. |
| `abilityScript` | string | JS body used when `ability` is `"custom"`. |
| `texture` | string | Texture key override. |

> **Important:** a bird placement's `x`/`y` are **ignored** — every bird loads at
> the level's `slingshot` and is launched in **array order**, top to bottom. So
> the bird list is really a *load-out queue*, not a layout.

---

## Definitions

A **definition** is the template for a type. Built-in definitions ship with the
engine; games add their own under the `custom*` maps. When a definition and a
placement both set a field (e.g. `hp`, `texture`), the **placement wins**.

### Material (block) definition

The template for a block type.

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name. |
| `icon` | string (emoji) | Palette icon. |
| `shape` | string | `rect` \| `circle` \| `triangle` \| `triangle_r` \| `trapezoid`. |
| `hardness` | number | **Hit points.** Use a very large number (or `Infinity` in code) — and/or `breakable: false` — for indestructible. |
| `density` | number | Mass per area = **weight**. Heavier blocks hit harder and are harder to shove. |
| `friction` | number | Surface grip, `0..1+`. |
| `restitution` | number | Bounciness, `0..1+`. |
| `breakable` | boolean | Whether it can be destroyed. |
| `explosive` | `{ radius, force }` | If set, the block **detonates when destroyed**, dealing an explosion of this radius/force. |
| `buoyancy` | number | If greater than the gravity scale (~`0.0016`), the block **floats up** (balloons). |
| `color` | string | Fill color (vector art). |
| `stroke` | string | Outline color. |
| `particle` | string | Debris/particle color. |
| `texture` | string | Default texture key. |
| `score` | number | Points awarded when destroyed. |
| `size` | `{ w, h }` | Default dimensions. |

```json
{
  "name": "Crystal", "icon": "💎", "shape": "rect",
  "hardness": 24, "density": 0.003, "friction": 0.2, "restitution": 0.3,
  "breakable": true, "color": "#7ef", "stroke": "#39c", "particle": "#cff",
  "score": 800, "size": { "w": 40, "h": 40 }
}
```

**Built-in material ids:** `wood`, `wood_block`, `wood_plank`, `wood_tri`,
`stone`, `stone_block`, `stone_ball`, `ice`, `ice_block`, `glass`, `sand`,
`steel`, `steel_block`, `gold`, `tnt`, `balloon`, `rubber`, `trampoline`.

A few notable built-ins: `steel`/`steel_block`/`trampoline` are `breakable:false`
(indestructible); `tnt` is `explosive` (`{ radius:140, force:0.22 }`); `balloon`
has `buoyancy: 0.003` (floats); `gold` is worth `5000`; `trampoline` has
`restitution: 1.9` (super bouncy).

### Bird definition

The template for a bird type.

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name. |
| `icon` | string (emoji) | Palette icon. |
| `description` | string | Flavor / tooltip text. |
| `radius` | number | Body radius. |
| `density` | number | Weight. |
| `restitution` | number | Bounciness. |
| `color` | string | Fill color. |
| `stroke` | string | Outline color. |
| `texture` | string | Default texture key. |
| `ability` | string | A built-in ability id, or the string `"custom"`. |
| `abilityData` | object | Params passed to the ability (e.g. `{ multiplier: 2.6 }`). |
| `abilityScript` | string | JS body run when `ability === "custom"`. |

```json
{
  "name": "Chuck (Yellow)", "icon": "🟡",
  "radius": 16, "density": 0.0075, "restitution": 0.3,
  "color": "#fdd835", "stroke": "#f57f17",
  "ability": "speed_boost", "abilityData": { "multiplier": 2.6 },
  "description": "Rockets forward when tapped."
}
```

**Built-in ability ids** (with their `abilityData` params):

| Ability | Params | Effect |
|---|---|---|
| `none` | — | No special power. |
| `speed_boost` | `multiplier` | Multiplies current velocity (dash). |
| `split` | `count`, `spread` | Splits into `count` smaller birds fanned by `spread` radians. |
| `explode` | `radius`, `force` | Detonates. **Also auto-triggers on hard impact.** |
| `egg_drop` | `radius`, `force` | Drops an explosive egg and recoils upward. |
| `boomerang` | `multiplier` | Reverses direction to strike from behind. |
| `inflate` | `radius`, `push` | Grows and shoves nearby bodies outward. |
| `freeze` | `radius` | Turns nearby breakable blocks brittle/icy. |

**Built-in bird ids:** `red`, `chuck`, `blues`, `bomb`, `matilda`, `boomer`,
`terence`, `ice_bird`.

See [scripting.md](scripting.md#bird-abilities) for writing a `"custom"` ability
and for `AB.Abilities.register`.

### Pig definition

The template for a pig type.

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name. |
| `icon` | string (emoji) | Palette icon. |
| `radius` | number | Body radius. |
| `density` | number | Weight. |
| `hp` | number | Hit points. |
| `color` | string | Fill color. |
| `stroke` | string | Outline color. |
| `texture` | string | Default texture key. |
| `score` | number | Points awarded when popped. |
| `armor` | number | Damage reduction, `0..1` (e.g. `0.5` halves incoming damage). |

```json
{ "name": "Helmet Pig", "icon": "🪖", "radius": 20, "density": 0.006,
  "hp": 220, "color": "#63c74d", "stroke": "#3e8e2f", "score": 8000, "armor": 0.5 }
```

**Built-in pig ids:** `normal`, `helmet`, `big`, `king`, `tiny`.

### Boss definition

The template for a boss — a large enemy driven by **phases** and optional
**script hooks**.

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name. |
| `icon` | string (emoji) | Icon. |
| `radius` | number | Body radius. |
| `density` | number | Weight. |
| `hp` | number | Total / max HP. |
| `color` | string | Fill color. |
| `stroke` | string | Outline color. |
| `texture` | string | Texture key. |
| `score` | number | Points awarded when killed. |
| `phases` | array | Ordered list of [phase objects](#phase-object) (high → low threshold). |
| `onSpawn` | string | JS body run once when the boss spawns. |
| `onUpdate` | string | JS body run every frame (in addition to the current phase's built-in behavior). |
| `onPhaseChange` | string | JS body run whenever a phase threshold is crossed. |
| `onDeath` | string | JS body run when the boss dies. |

Boss script hooks receive a `ctx` where `ctx.boss` is the boss **track** and
`ctx.store` is the boss's private variable bag (`=== boss.ref.vars`). See
[scripting.md](scripting.md#boss-scripting).

#### Phase object

```json
{ "name": "Enraged", "hpThreshold": 0.25, "behavior": "rage",
  "color": "#e53935",
  "camera": { "x": 1000, "y": 400, "zoom": 0.9, "ms": 900 },
  "onEnter": "ctx.shake(12,500);" }
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Phase name (shown when it changes). |
| `hpThreshold` | number | Fraction `0..1`. The phase activates when `hp/maxHp` drops **to or below** it. Index 0 is the start and should be `1.0`. |
| `behavior` | string | Built-in behavior id (see below). |
| `color` | string | Boss color while in this phase. |
| `camera` | `{ x, y, zoom, ms }` | Automatic camera move on entering the phase. |
| `onEnter` | string | JS body run when the phase begins. |

**Built-in boss behavior ids:**

| Behavior | What it does |
|---|---|
| `idle` | Do nothing. |
| `charge` | Moves toward the active bird. |
| `shoot` | Fires projectiles at the bird. |
| `summon` | Spawns tiny pigs. |
| `rage` | Random explosions + hops. |
| `overheat` | Periodic explosive pulse around itself. |

**Built-in boss ids:** `king_pig_boss`, `mecha_pig`.

Example — the built-in `king_pig_boss`:

```json
{
  "name": "King Pig", "icon": "👹", "radius": 52, "density": 0.014,
  "hp": 2400, "color": "#d4a017", "stroke": "#8b6914", "score": 60000,
  "phases": [
    { "name": "Smug",    "hpThreshold": 1.0,  "behavior": "charge", "color": "#d4a017" },
    { "name": "Angry",   "hpThreshold": 0.6,  "behavior": "summon", "color": "#e08a17" },
    { "name": "Enraged", "hpThreshold": 0.25, "behavior": "rage",   "color": "#e53935" }
  ]
}
```

### Background definition

A background is just a set of gradient colors and flags — no geometry.

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name. |
| `top` | string | Sky gradient top color. |
| `bottom` | string | Sky gradient bottom color. |
| `groundTop` | string | Ground gradient top color. |
| `groundBottom` | string | Ground gradient bottom color. |
| `cloud` | string | Cloud color. |
| `clouds` | boolean | Draw clouds? |
| `stars` | boolean | Draw stars? |

```json
{ "name": "Night", "top": "#141a4e", "bottom": "#283593",
  "groundTop": "#37474f", "groundBottom": "#263238",
  "cloud": "rgba(255,255,255,0.12)", "stars": true }
```

**Built-in background ids:** `sky`, `sunset`, `night`, `space`, `desert`, `cave`,
`snow`.

---

## Script object

Used in a level's `scripts` array and a game's `globalScripts` array.

```json
{ "hook": "onLevelStart", "code": "ctx.message('Go!', 1500);", "name": "greeting" }
```

| Field | Type | Description |
|---|---|---|
| `hook` | string | One of the lifecycle hooks (see below). |
| `code` | string | A **JS function body** receiving `(ctx, dt)`. |
| `name` | string | Optional label (shown in error messages / the editor). |

**Available hooks:** `onLevelStart`, `onUpdate`, `onBirdLaunch`, `onBirdLand`,
`onBirdLost`, `onBlockDestroyed`, `onPigKilled`, `onBossSpawn`,
`onBossPhaseChange`, `onBossKilled`, `onExplosion`, `onVictory`, `onDefeat`.

Every hook's event data is on `ctx.event`; state persists on `ctx.store`. Full
details and per-hook `event` shapes are in
[scripting.md](scripting.md#hooks).

---

## `AB.TUNING` constants

`settings.tuning` in a game overrides any of these. Defaults:

| Key | Default | Meaning |
|---|---|---|
| `gravityScale` | `0.0016` | Matter gravity scale (fall speed). |
| `fixedStep` | `16.667` ms | Physics timestep (`1000/60`). |
| `maxSubSteps` | `5` | Max catch-up steps per frame. |
| `launchPower` | `0.16` | Launch speed per px of drag. |
| `maxDragDistance` | `130` | Max slingshot pull (px). |
| `dmgBirdToBlock` | `0.9` | Bird → block damage coefficient. |
| `dmgBirdToPig` | `1.8` | Bird → pig. |
| `dmgBirdToBoss` | `1.1` | Bird → boss. |
| `dmgBlockToPig` | `0.55` | Block → pig. |
| `dmgBlockToBlock` | `0.18` | Block → block. |
| `dmgFallToPig` | `0.5` | Falling impact → pig. |
| `minImpact` | `2.2` | Impacts below this deal no damage (resting contact). |
| `scoreUnusedBird` | `10000` | Points per unused bird at level end. |
| `debrisLifetime` | `6000` | ms a fragment/projectile lives before cleanup. |
| `outOfBoundsMargin` | `600` | px beyond camera bounds before a body is culled. |

**Damage model:** `impact = reducedMass × relativeSpeed`; `damage = impact ×
coefficient` (from the table above). So faster + heavier = more damage, and light
resting contacts (below `minImpact`) do nothing.

```json
"settings": { "tuning": { "launchPower": 0.2, "dmgBirdToPig": 2.4 } }
```

---

## Built-in ids at a glance

| Kind | Ids |
|---|---|
| **Materials** | `wood`, `wood_block`, `wood_plank`, `wood_tri`, `stone`, `stone_block`, `stone_ball`, `ice`, `ice_block`, `glass`, `sand`, `steel`, `steel_block`, `gold`, `tnt`, `balloon`, `rubber`, `trampoline` |
| **Birds** | `red`, `chuck`, `blues`, `bomb`, `matilda`, `boomer`, `terence`, `ice_bird` |
| **Bird abilities** | `none`, `speed_boost`, `split`, `explode`, `egg_drop`, `boomerang`, `inflate`, `freeze` |
| **Pigs** | `normal`, `helmet`, `big`, `king`, `tiny` |
| **Bosses** | `king_pig_boss`, `mecha_pig` |
| **Boss behaviors** | `idle`, `charge`, `shoot`, `summon`, `rage`, `overheat` |
| **Backgrounds** | `sky`, `sunset`, `night`, `space`, `desert`, `cave`, `snow` |

---

## Minimal complete example

```json
{
  "format": "ab-game",
  "version": "2.0.0",
  "id": "starter",
  "title": "Starter",
  "settings": { "tuning": {}, "startLevel": 0, "allowLevelSelect": true },
  "story": { "intro": "Pop the pig!", "outro": "You win!" },
  "levels": [
    {
      "name": "One Pig",
      "background": "sky",
      "slingshot": { "x": 180, "y": 430 },
      "birds": [ { "type": "red" }, { "type": "chuck" } ],
      "pigs":  [ { "type": "normal", "x": 900, "y": 520 } ],
      "blocks": [
        { "type": "wood", "x": 860, "y": 520, "width": 22, "height": 88, "angle": 0 },
        { "type": "wood", "x": 940, "y": 520, "width": 22, "height": 88, "angle": 0 },
        { "type": "wood", "x": 900, "y": 470, "width": 120, "height": 22, "angle": 0 }
      ],
      "starThresholds": [10000, 30000, 60000]
    }
  ]
}
```
