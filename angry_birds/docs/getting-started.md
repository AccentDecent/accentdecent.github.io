# Getting Started

This is a hands-on tour. By the end you'll have built a two-level game with a
custom block, a custom bird that has a **scripted ability**, and a boss fight,
then exported it and put it online. Total time: about 30 minutes.

You don't need to write any code until the "custom bird" step — and even then
it's a few lines.

> **Setup.** For the smoothest ride, run a local server in the project folder and
> open the editor from `http://localhost:8000/editor.html`:
>
> ```bash
> python -m http.server
> ```
>
> Double-clicking `editor.html` also works (it falls back to the embedded example
> game), but a server avoids all `file://` quirks. See the README's *How to run*.

---

## 1. Open the editor

Open **`editor.html`**. You'll see:

- a **canvas** in the middle (your level),
- a **palette** of placeable items (blocks, birds, pigs, bosses) on one side,
- **property panels** for the selected entity and for the level/game settings,
- a **toolbar** with Test-Play, Play, Save, Load, and Export.

The editor loads with a starter level. Let's build our own from scratch. Use the
**level list** (the panel that manages levels) and its **Add Level** button, then
select the new level so the canvas is (nearly) empty.

---

## 2. Place blocks, birds, and pigs

Building a level is: **pick a palette item, then click the canvas to drop it.**

1. **Pick "Wood Beam"** in the palette. Click a few times on the right side of
   the canvas to stack a small tower. Each click drops a block at its default
   size.
2. **Select** any placed block (click it). Its property panel lets you change
   **x/y**, **width/height**, **angle** (in degrees), **shape**, and **texture**.
   Drag the block to move it; use the rotate/resize handles or the number fields
   to fine-tune. Rotate a couple of beams to 90° to make uprights.
3. **Add a pig.** Pick **"Minion Pig"** and click *inside* your tower — that's the
   thing to knock over/pop. Give it `hp: 100` (the default) for now.
4. **Add birds.** Pick **"Red"** and click anywhere — bird placement position is
   only symbolic. **Birds always load at the slingshot and launch in array
   order**, so the click location doesn't matter; what matters is *how many* and
   *which types*, top to bottom. Add a Red, then a Chuck (Yellow), then a Bomb.

At any time you can **select → move / rotate / resize / delete** any entity, and
**duplicate** whole levels from the level list.

> **Coordinates:** +x is right, +y is **down**. Angles are in **degrees**. The
> ground line (`world.groundY`) is where things rest.

---

## 3. Set the level settings

Open the **level settings** panel and set:

| Setting | What it does | Try |
|---|---|---|
| **Name** | Level title. | `Wooden Warmup` |
| **Background** | Sky/scenery preset. | `sky` |
| **Gravity** | World gravity vector; `y: 1` = normal down. | `{ x: 0, y: 1 }` |
| **Ground line** (`world.groundY`) | Y of the ground. | `550` |
| **World bounds** (`world.left/right`) | Playable extent. | `left: -400, right: 2200` |
| **Camera start / zoom** | Where the view opens. | `{ x: 150, y: 400 }`, zoom `1` |
| **Slingshot** | Where birds launch from. | `{ x: 180, y: 430 }` |
| **Star thresholds** | Score cutoffs for 1★/2★/3★. | `[10000, 30000, 60000]` |
| **Intro / Outro story** | Optional story cards before/after. | leave blank |

These map one-to-one to the level JSON (see
[json-format.md](json-format.md)).

---

## 4. Test-play

Hit **Test-Play** (plays the *current* level in place) to try it. Drag back from
the slingshot to aim — the band pulls up to `maxDragDistance` (130px) and launch
speed scales with drag. **Tap while a bird is in the air** to trigger its ability
(Chuck speeds up, Bomb explodes, etc.).

Tune until it feels right: move the pig, add blocks, change bird order. The
**Play** button (versus Test-Play) opens `play.html` running your whole game as a
player would see it — handed off via `localStorage`.

Clear all pigs to win; run out of birds first and you lose. Unused birds are
worth `10000` points each, so leaving birds in the bag earns more stars.

---

## 5. Add a second level

1. In the level list, click **Add Level** (or **Duplicate** to clone your first
   one as a starting point).
2. Select it and build a different scene — maybe a `stone` tower on a `sunset`
   background with a `helmet` pig.
3. Reorder levels by dragging in the level list. The game plays levels in list
   order; `settings.startLevel` picks which one opens first.

That's a campaign: multiple levels in one game file.

---

## 6. Add a custom block (material)

Open **Create Custom Material**. A material is just data — no code required. Fill
in:

| Field | Meaning | Example |
|---|---|---|
| **id** | Unique key you'll reference. | `crystal` |
| **name** / **icon** | Display label + emoji. | `Crystal`, `💎` |
| **shape** | `rect`/`circle`/`triangle`/`triangle_r`/`trapezoid`. | `rect` |
| **hardness** | Hit points. | `24` |
| **density** | Mass per area = weight. | `0.003` |
| **friction** / **restitution** | Grip / bounciness. | `0.2` / `0.3` |
| **breakable** | Can it be destroyed? | `true` |
| **color** / **stroke** / **particle** | Vector-art colors. | `#7ef`, `#39c`, `#cff` |
| **score** | Points when destroyed. | `800` |
| **size** | Default `{ w, h }`. | `{ w: 40, h: 40 }` |

Save it. Your new **Crystal** now appears in the block palette — place it like any
built-in. (You can also give it a **texture**; see step 9.) Want an exploding
crate? Add `explosive: { radius: 140, force: 0.22 }`. Want it to float? Give it
`buoyancy` above ~`0.0016`.

The equivalent JSON, stored under the game's `customMaterials`:

```json
"customMaterials": {
  "crystal": {
    "name": "Crystal", "icon": "💎", "shape": "rect",
    "hardness": 24, "density": 0.003, "friction": 0.2, "restitution": 0.3,
    "breakable": true, "color": "#7ef", "stroke": "#39c", "particle": "#cff",
    "score": 800, "size": { "w": 40, "h": 40 }
  }
}
```

---

## 7. Add a custom bird with a scripted ability

Open **Create Custom Bird**. Set the visuals (name, icon, radius, density,
restitution, colors), then set **ability** to **`custom`** and paste an
**ability script** into the box (the editor has a template picker to start you
off).

An ability script is a JS body. It runs with the full `ctx` API plus:

- `ctx.bird` — the active bird's **track** (`ctx.bird.body`, `ctx.bird.ref`),
- locals `bird`, `data` (your `abilityData` params), and `Matter`.

Here's a **"gravity bomb"** bird: pull nearby objects toward the bird, then pop.

```js
// abilityScript for a custom bird
const p = ctx.bird.body.position;
ctx.shake(6, 300);
for (const t of ctx.all()) {
  if (t === ctx.bird) continue;
  const d = ctx.dist(p.x, p.y, t.body.position.x, t.body.position.y);
  if (d < 260 && d > 1) {
    ctx.applyForce(t, (p.x - t.body.position.x) / d * 0.05,
                      (p.y - t.body.position.y) / d * 0.05);
  }
}
ctx.after(600, () => {
  ctx.explode(ctx.bird.body.position.x, ctx.bird.body.position.y, 150, 0.3);
  ctx.remove(ctx.bird);
});
```

Save the bird, then add it to a level's bird list. Test-play, launch it, and
trigger the ability with **Space**, **E**, or a **tap** on the playfield (or the
on-screen Ability button). The bird queue in the top-right shows the upcoming
birds, largest = the one loaded next.

> **Custom pigs, bosses, and backgrounds too.** The right-hand panel also has
> **Custom Pig**, **Custom Boss**, and **Custom Background** creators that work
> exactly like the block and bird ones. The boss creator takes a **Phases (JSON)**
> list and buttons to attach `onUpdate` / `onPhaseChange` scripts.

The equivalent JSON under `customBirds`:

```json
"customBirds": {
  "singularity": {
    "name": "Singularity", "icon": "🕳️",
    "radius": 16, "density": 0.007, "restitution": 0.3,
    "color": "#222", "stroke": "#000",
    "ability": "custom",
    "abilityData": {},
    "abilityScript": "const p = ctx.bird.body.position; ctx.shake(6,300); /* ...as above... */"
  }
}
```

> **Tip:** if you'd rather use a built-in power, set `ability` to `speed_boost`,
> `split`, `explode`, `egg_drop`, `boomerang`, `inflate`, or `freeze` and tune it
> through `abilityData`. See [scripting.md](scripting.md#bird-abilities).

---

## 8. Add a boss

Bosses are big enemies with **phases**. Each phase has an HP threshold, a
built-in **behavior**, an optional color, an optional automatic **camera move**,
and an optional `onEnter` script.

Place a boss by picking one in the palette (e.g. **King Pig**) and clicking the
canvas — or add one that's fully your own via the boss editor. A minimal custom
boss:

```json
"customBosses": {
  "sir_oinks": {
    "name": "Sir Oinks-a-Lot", "icon": "🐗",
    "radius": 50, "density": 0.015, "hp": 2000,
    "color": "#b5651d", "stroke": "#7a3f10", "score": 70000,
    "phases": [
      { "name": "Cocky",   "hpThreshold": 1.0,  "behavior": "charge",
        "color": "#b5651d",
        "camera": { "x": 1000, "y": 420, "zoom": 0.9, "ms": 900 } },
      { "name": "Rattled", "hpThreshold": 0.5,  "behavior": "summon",
        "color": "#e08a17" },
      { "name": "Furious", "hpThreshold": 0.2,  "behavior": "rage",
        "color": "#e53935",
        "onEnter": "ctx.shake(14,600); ctx.message('SIR OINKS IS FURIOUS!', 2000);" }
    ]
  }
}
```

Then reference it in a level:

```json
"bosses": [ { "type": "sir_oinks", "x": 1000, "y": 480, "hp": 2000 } ]
```

Phases are listed **high → low threshold**; index 0 (threshold `1.0`) is the
start. When the boss's `hp / maxHp` drops to or below a phase's `hpThreshold`,
that phase activates: its camera move plays, its `onEnter` runs, and the
`onBossPhaseChange` hook fires. For AI beyond the built-in behaviors, add
`onUpdate`/`onSpawn`/`onDeath` script strings — see
[scripting.md](scripting.md#boss-scripting).

Give the boss a level to itself with the drama it deserves: a wide `world`, a
zoomed-out camera start, and an `intro` story card.

---

## 9. (Bonus) Upload a texture

Open the **texture** panel and upload an image. It's stored as a **data-URI**
under the game's `textures` map with a key you choose (e.g. `myWood`). Then set a
type's **texture** field — on a material, bird, pig, or per-placement — to that
key. Because textures are inlined as data-URIs, they travel inside your exported
game with no external files.

```json
"textures": { "myWood": "data:image/png;base64,iVBORw0KGgo..." },
"customMaterials": {
  "fancy_wood": { "name": "Fancy Wood", "shape": "rect", "hardness": 55,
                  "density": 0.0042, "breakable": true, "texture": "myWood" }
}
```

---

## 10. Add story & game settings

Open **game / story settings** and set the game **title**, **author**,
**description**, a story **intro** (shown before the game) and **outro** (after
finishing), plus `settings.startLevel` and whether players can pick levels
(`allowLevelSelect`). Per-*level* `intro`/`outro` cards are set in level
settings.

---

## 11. Export the game

Use the toolbar **Export** menu:

- **Export game.json** — downloads your whole game as one JSON file
  (`format: "ab-game"`). This is the portable, editable source of truth. You can
  re-import it into the editor later, or ship it with `play.html`.
- **Export Self-Contained HTML** — bakes the engine, textures, and game data into
  a **single `.html`** file that plays anywhere, even by double-clicking from
  `file://`. Perfect for sharing.

Use **Save**/**Load** during development to round-trip the game JSON.

---

## 12. Host it

Pick whichever fits:

- **Share one file.** Send the exported self-contained HTML. Done — it runs from
  `file://`.
- **Publish the whole site.** Upload the entire project folder to any static host
  (GitHub Pages, Netlify, Vercel, Cloudflare Pages…). Players use
  `play.html` with your `game.json`; you (and others) can keep using
  `editor.html`.
- **Ship only the game (no editor).** Upload `play.html`, the `engine/` folder,
  and your `game.json`. Point players at `play.html` loading your game.

Progress (stars/score) is saved per game in the player's `localStorage`, keyed by
the game's `id` — so set a stable `id` in game settings before you publish, or
players' saves may not stick across updates.

---

## Where to go next

- **Author or debug game files by hand:** [json-format.md](json-format.md).
- **Go deeper on scripting** — hooks, spawning, forces, cutscenes, worked
  examples: [scripting.md](scripting.md).
- **Quick lookup** of every API member: [api-reference.md](api-reference.md).
