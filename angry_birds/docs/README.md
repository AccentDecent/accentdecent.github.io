# Angry Birds Framework

A browser-based, data-driven **"Angry Birds" game maker**. Build physics puzzle
levels in a visual editor, script custom birds, bosses, and cutscenes in plain
JavaScript, bundle everything into a single JSON "game," and ship it as a
self-contained web page. No build step, no dependencies beyond the bundled
[Matter.js](https://brm.io/matter-js/) physics engine — just vanilla JS and HTML.

If you loved knocking down towers and popping pigs, this is the toolkit for
making your *own* version of that, complete with custom materials, birds with
scripted abilities, multi-phase bosses, and a story campaign.

---

## Feature list

- **Impulse-based physics** powered by Matter.js. Collision damage scales with
  mass and speed, just like the original — a fast, heavy hit does more damage.
- **Visual editor** (`editor.html`): place, move, rotate, resize, and delete
  blocks / birds / pigs / bosses by clicking a canvas.
- **Everything is a definition.** Blocks (`material`), `bird`, `pig`, `boss`, and
  `background` types all live in a registry. Games ship their own custom
  definitions, which can even **override built-ins by id**.
- **19 built-in materials** (wood, stone, ice, glass, sand, steel, gold, TNT,
  balloon, rubber, trampoline, …), **8 birds**, **5 pigs**, **2 bosses**, and
  **7 backgrounds** — ready to use, ready to remix.
- **Built-in bird abilities**: speed boost, split, explode, egg drop, boomerang,
  inflate, freeze — plus fully **custom, scripted abilities**.
- **Multi-phase bosses** with built-in behaviors (charge, shoot, summon, rage,
  overheat) and scriptable hooks (`onSpawn`, `onUpdate`, `onPhaseChange`,
  `onDeath`) and per-phase camera moves.
- **A complete scripting layer.** Level and global scripts hook into lifecycle
  events and get a rich `ctx` API to spawn, damage, apply forces, run camera
  cutscenes, show messages, keep score, and more.
- **Campaigns & story.** A game is a list of levels plus intro/outro story text.
  Progress (stars & score) is saved to `localStorage`.
- **Custom textures** uploaded as data-URIs, assignable to any type.
- **One-click export**: save a `game.json`, or export a **single self-contained
  HTML file** that inlines the engine, art, and game data and runs from
  `file://` anywhere.
- **Tunable feel.** Every "magic number" (gravity, launch power, damage
  coefficients, scoring) lives in `AB.TUNING` and can be overridden per game.

---

## Project layout

```
angry_birds/
  index.html          launcher / home page
  editor.html         the full level + game editor
  play.html           the player — loads a game JSON and plays it, no editor UI

  engine/             the framework (load these <script>s in THIS order)
    matter.min.js     bundled Matter.js physics engine
    core.js           registry, built-in definitions, TUNING, normalize/validate
    assets.js         texture loading & caching
    camera.js         AB.Camera — focus/follow/pan/zoom/cutscene/shake
    physics.js        world, bodies, collisions, damage model, FX
    abilities.js      AB.Abilities — built-in + custom bird abilities
    entities.js       entity/track construction from definitions
    renderer.js       canvas drawing of the world and entities
    scripting.js      AB.Scripting — builds ctx, compiles & runs hooks
    boss.js           AB.Boss — phase behaviors + boss script hooks
    game.js           AB.Game — the level runtime & main loop
    campaign.js       AB.Campaign — game loading, level flow, save slots

  editor/editor.js    editor logic

  css/                stylesheets

  data/
    game.json         a complete example game (levels, custom birds, a boss, story)
    example-game.js   the same game as a JS global (window.AB_EXAMPLE_GAME) so the
                      site works from file:// without fetch()
    levels/*.json     standalone example levels

  docs/               these documentation files
```

### The docs

| File | What it covers |
|------|----------------|
| [`README.md`](README.md) | This overview. |
| [`getting-started.md`](getting-started.md) | Hands-on tutorial: build a level, a custom block, a scripted bird, a boss, then export and host. |
| [`json-format.md`](json-format.md) | Complete GAME and LEVEL JSON schema and every definition type's fields. |
| [`scripting.md`](scripting.md) | The scripting guide: hooks, the `ctx` API, abilities, bosses, camera/cutscenes, worked examples. |
| [`api-reference.md`](api-reference.md) | Terse lookup table of every `ctx.*` member, `AB.Camera.*` method, and `AB.*` global. |

---

## Core concepts

- **Definitions & the registry.** A `material` (block type), `bird`, `pig`,
  `boss`, or `background` is a plain data object stored in `AB.Registry`. Lookups
  prefer a game's *custom* definitions over the built-in *base* ones, so you can
  override any built-in simply by defining a new one with the same id.

- **A GAME (a "campaign")** = custom definitions + a list of LEVELS + story text,
  all in one JSON file. Games are played with `play.html` via `AB.Campaign`.
  Progress is saved to `localStorage` keyed by the game's `id`.

- **A LEVEL** = a scene of placed entities (blocks, birds, pigs, bosses) plus
  settings (background, gravity, world bounds, camera, slingshot, star
  thresholds) plus scripts.

- **The physics/damage model** is impulse-based: collision damage ≈
  `reducedMass × relativeSpeed × coefficient`, so faster and heavier hits do more
  damage. A material's `density` gives its "weight"; a block's `hardness` is its
  hit points. Impacts below `AB.TUNING.minImpact` deal no damage (resting
  contact). See `json-format.md` for the coefficients.

- **Tracks.** At runtime every live entity is a **track**: `{ id, body, ref }`,
  where `body` is the Matter.js body and `ref` holds gameplay state. Scripts
  work with tracks. See `scripting.md`.

---

## How to run

Because browsers block `fetch()` of local JSON from `file://`, the **best
experience is a tiny static server**. From the project folder:

```bash
python -m http.server
# then open one of:
#   http://localhost:8000/index.html    the launcher
#   http://localhost:8000/editor.html   the editor
#   http://localhost:8000/play.html     the player
```

Any static file server works (`npx serve`, `php -S localhost:8000`, a VS Code
Live Server extension, etc.).

**Opening the HTML files directly (double-click, `file://`) still works** for the
common paths:

- The editor and player fall back to the **embedded example game**
  (`data/example-game.js` → `window.AB_EXAMPLE_GAME`) when `fetch()` is blocked.
- The editor hands the current game off to `play.html` through `localStorage`, so
  the in-editor **Play** button works from `file://`.
- A **self-contained exported HTML** file always works from `file://` — it inlines
  everything.

### Publishing

Upload the **whole folder** to any static host — GitHub Pages, Netlify, Vercel,
Cloudflare Pages, an S3 bucket, etc. There is nothing to compile.

### Shipping only the game (no editor)

You have two options:

1. **Ship the runtime + your data.** Copy `play.html`, the entire `engine/`
   folder, and your `game.json` to your host. Point players at
   `play.html?game=game.json` (or however your copy of `play.html` is wired to
   load it).
2. **Ship one file.** In the editor, choose **Export → Self-Contained HTML**.
   This inlines the engine, your textures, and the game data into a single
   `.html` file that runs anywhere, even from `file://`. Hand that one file to
   anyone.

---

## Next steps

- New here? Start with **[getting-started.md](getting-started.md)** and build your
  first level in a few minutes.
- Want to hand-author or understand game files? See
  **[json-format.md](json-format.md)**.
- Ready to script custom birds, bosses, and cutscenes? Read
  **[scripting.md](scripting.md)** and keep **[api-reference.md](api-reference.md)**
  open in another tab.
