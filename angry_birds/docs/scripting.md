# Scripting Guide

The framework's scripting layer lets you drive gameplay with plain JavaScript:
react to lifecycle events, spawn and destroy things, apply forces, run camera
cutscenes, give birds brand-new powers, and build multi-phase boss fights — all
without touching the engine.

Every script is a **function body** (not a full function — just the statements
inside). The engine compiles it with `new Function` and runs it wrapped in
`try/catch`, so a broken script logs an error but never crashes the game loop.
Scripts are **trusted** (this is a creative tool, not a sandbox).

- [Where scripts live](#where-scripts-live)
- [Hooks](#hooks)
- [The `ctx` API](#the-ctx-api)
- [Tracks](#tracks)
- [Bird abilities](#bird-abilities)
- [Boss scripting](#boss-scripting)
- [Camera & cutscenes](#camera--cutscenes)
- [Global registration](#global-registration)
- [Worked examples](#worked-examples)

Keep [api-reference.md](api-reference.md) open for the one-line lookup of every
member.

---

## Where scripts live

| Location | Runs | Signature |
|---|---|---|
| Level `scripts[]` | For that one level. | `(ctx, dt)` |
| Game `globalScripts[]` | In **every** level (plus each level's own scripts). | `(ctx, dt)` |
| Bird `abilityScript` (`ability:"custom"`) | When that bird's ability fires. | body with `ctx`, `bird`, `data`, `Matter` |
| Boss `onSpawn`/`onUpdate`/`onPhaseChange`/`onDeath` | Boss lifecycle. | `(ctx)` |
| Phase `onEnter` | When a boss enters that phase. | `(ctx)` |
| `AB.Abilities.register(id, fn)` | A reusable named ability. | `(bird, data, ctx)` |
| `AB.Boss.register(name, fn)` | A reusable boss behavior. | `(bossTrack, ctx, dt)` |

Each of the string-based ones is a **JS body**. A level/global script is an object
`{ hook, code, name? }` — see [json-format.md](json-format.md#script-object).

---

## Hooks

A hook fires at a moment in the level's life. Your `code` receives `(ctx, dt)`
where `dt` is milliseconds since the last frame (meaningful mainly in `onUpdate`).
The event payload for the current hook is on **`ctx.event`**.

| Hook | Fires | `ctx.event` |
|---|---|---|
| `onLevelStart` | Once, when the level begins. | `{ level }` |
| `onUpdate` | Every frame. | `null` (use `dt`) |
| `onBirdLaunch` | A bird is fired from the slingshot. | `{ track }` |
| `onBirdLand` | A launched bird comes to rest. | `{ track }` |
| `onBirdLost` | A bird is used up / removed. | `{ track }` |
| `onBlockDestroyed` | A block is destroyed. | `{ track, x, y }` |
| `onPigKilled` | A pig is popped. | `{ track, x, y }` |
| `onBossSpawn` | A boss enters. | `{ track }` |
| `onBossPhaseChange` | A boss crosses a phase threshold. | `{ track, phaseIndex, phase }` |
| `onBossKilled` | A boss dies. | `{ track }` |
| `onExplosion` | Any explosion goes off. | `{ x, y, radius, force }` |
| `onVictory` | The level is cleared. | `{ score }` |
| `onDefeat` | The level is failed. | `{ score }` |

### State that persists

Scripts run repeatedly, so keep data on **`ctx.store`** — a per-runner object
shared across all of a level's hook calls (and stable between frames). Never rely
on top-level `let`/`const` to persist; each call re-runs the body fresh.

```js
// onUpdate: count how long we've been playing, act once at 3s.
ctx.store.t = (ctx.store.t || 0) + dt;
if (!ctx.store.warned && ctx.store.t > 3000) {
  ctx.store.warned = true;
  ctx.message('Hurry up!', 1500);
}
```

> `ctx.vars` is also available as a general-purpose bag; for level/global hooks
> the primary persistent store is `ctx.store`.

---

## The `ctx` API

Every script gets a `ctx` object. Here is the whole surface, grouped. (See
[api-reference.md](api-reference.md) for the terse table.)

### Live references

| Member | What it is |
|---|---|
| `ctx.game` | The live `AB.Game` (current level runtime). |
| `ctx.campaign` | The live `AB.Campaign`. |
| `ctx.physics` | The physics world (`AB.Physics`). |
| `ctx.camera` | The camera (`AB.Camera`) — full API. |
| `ctx.Matter` | The Matter.js library. |
| `ctx.store` | Per-runner persistent state object. |
| `ctx.vars` | General-purpose variable bag. |
| `ctx.event` | The event payload for the current hook. |
| `ctx.time` | Milliseconds since the level started. |
| `ctx.PI`, `ctx.TAU` | `Math.PI` and `2π`. |

### Queries

| Call | Returns |
|---|---|
| `ctx.birds()` | Array of live bird tracks. |
| `ctx.pigs()` | Array of live pig tracks. |
| `ctx.blocks()` | Array of live block tracks. |
| `ctx.bosses()` | Array of live boss tracks. |
| `ctx.all()` | Array of **all** live tracks. |
| `ctx.count(kind)` | Count of a kind: `'bird'`\|`'pig'`\|`'block'`\|`'boss'`. |
| `ctx.activeBird()` | The bird currently in play (or falsy). |
| `ctx.nearest(x, y, kind?)` | Nearest track to `(x,y)`, optionally of a kind. |
| `ctx.pos(track)` | `{ x, y }` of a track's body, or `null`. |

### Spawning (each returns a track)

| Call | Spawns |
|---|---|
| `ctx.spawnBird(x, y, type, opts?)` | A bird. |
| `ctx.spawnPig(x, y, type, opts?)` | A pig. |
| `ctx.spawnBlock(x, y, type, opts?)` | A block. `opts` may include `width`, `height`, `angle`, `shape`, `texture`. |
| `ctx.spawnBoss(x, y, type, opts?)` | A boss. |
| `ctx.spawnProjectile(x, y, vx, vy, opts?)` | A projectile with velocity. `opts`: `damage`, `color`, `radius`, `ttl`. |

### Movement & forces

| Call | Effect |
|---|---|
| `ctx.applyForce(track, fx, fy)` | Add a force vector. |
| `ctx.setVelocity(track, vx, vy)` | Set velocity directly. |
| `ctx.push(track, angleRad, power)` | Force along an angle (radians). |
| `ctx.moveTo(track, x, y)` | **Teleport** to `(x,y)`. |
| `ctx.setStatic(track, bool)` | Freeze/unfreeze a body (immovable when static). |
| `ctx.damage(track, amount)` | Deal damage (routes to pig/block/boss). |
| `ctx.remove(track)` | Mark dead and remove from the world. |

### FX

| Call | Effect |
|---|---|
| `ctx.explode(x, y, radius, force)` | Explosion that pushes and damages. |
| `ctx.burst(x, y, color, count?, speed?)` | A quick particle burst. |
| `ctx.particle(x, y, color, size?, life?, vx?, vy?)` | One particle. |
| `ctx.shake(intensity, ms)` | Screen shake. |

### Camera convenience

| Call | Effect |
|---|---|
| `ctx.focus(x, y, zoom, ms)` | Smoothly move the camera. |
| `ctx.follow(track, zoom?)` | Trail a track. |
| `ctx.cutscene(frames, onDone?)` | Play a camera sequence. |
| `ctx.zoomTo(z, ms)` | Zoom to a level. |

The full camera API is on `ctx.camera` — see [Camera & cutscenes](#camera--cutscenes).

### Game flow

| Call | Effect |
|---|---|
| `ctx.addScore(n)` | Add to the score. |
| `ctx.message(text, ms?)` | Transient on-screen text. |
| `ctx.win()` | End the level as a victory. |
| `ctx.lose()` | End the level as a defeat. |
| `ctx.setGravity(x, y)` | Change world gravity. |

### Timers

| Call | Effect |
|---|---|
| `ctx.after(ms, fn)` | Run `fn` after a delay (wrapped in try/catch). |

### Math & util

| Call | Returns |
|---|---|
| `ctx.random(min, max)` | Random float in `[min, max)`. |
| `ctx.randInt(min, max)` | Random integer in `[min, max]`. |
| `ctx.clamp(v, lo, hi)` | `v` clamped. |
| `ctx.lerp(a, b, t)` | Linear interpolation. |
| `ctx.dist(x1, y1, x2, y2)` | Euclidean distance. |
| `ctx.deg(degrees)` | Degrees → radians. |
| `ctx.rad2deg(r)` | Radians → degrees. |
| `ctx.now()` | Milliseconds since level start. |
| `ctx.log(...args)` | `console.log` with an `[AB script]` prefix. |

---

## Tracks

A **track** is the runtime handle for a live entity:

```
track = { id, body, ref }
```

- **`track.body`** — the Matter.js body. Useful fields:
  `track.body.position` (`{x,y}`), `.velocity` (`{x,y}`), `.angle` (radians),
  `.mass`, `.density`, `.isStatic`.
- **`track.ref`** — gameplay state. Common fields: `ref.kind`
  (`'bird'`/`'pig'`/`'block'`/`'boss'`/…), `ref.type` (the def id), `ref.hp`,
  `ref.maxHp`, `ref.alive`, `ref.radius`, `ref.def` (the definition object).

Query functions hand you tracks; spawn functions return them; movement/damage
functions take them.

```js
// Nudge every pig upward a little.
for (const pig of ctx.pigs()) ctx.applyForce(pig, 0, -0.02 * pig.body.mass);
```

---

## Bird abilities

A bird's `ability` is either a **built-in id** or the string **`"custom"`**.

### Built-in abilities

Set `ability` to one of these and tune via `abilityData`:

| Ability | `abilityData` | Effect |
|---|---|---|
| `none` | — | Nothing. |
| `speed_boost` | `{ multiplier }` (≈2.6) | Multiplies current velocity. |
| `split` | `{ count, spread }` (3, 0.26) | Splits into `count` minis fanned by `spread` rad. |
| `explode` | `{ radius, force }` (120, 0.26) | Detonates. **Also auto-fires on hard impact.** |
| `egg_drop` | `{ radius, force }` (95, 0.16) | Drops an explosive egg; bird recoils up. |
| `boomerang` | `{ multiplier }` (2.4) | Reverses direction to hit from behind. |
| `inflate` | `{ radius, push }` (40, 0.12) | Grows and shoves neighbors outward. |
| `freeze` | `{ radius }` (110) | Turns nearby breakable blocks brittle/icy. |

Abilities fire when the player **taps** while the bird is airborne (and each bird
fires at most once).

### Custom abilities (scripted)

Set `ability: "custom"` and provide an **`abilityScript`** (a JS body). It runs
with the normal `ctx` **plus**:

- `ctx.bird` — the active bird's track (also available as local `bird`, and as
  `ctx.self`),
- `data` — your `abilityData` object,
- `Matter` — the Matter.js library.

```js
// Simple custom ability: blast a hole and vanish.
ctx.explode(ctx.bird.body.position.x, ctx.bird.body.position.y, 200, 0.4);
ctx.remove(ctx.bird);
```

A richer example — a **gravity well** that sucks things in, then pops:

```js
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

Use `data` to make it tunable via `abilityData`:

```js
const p = ctx.bird.body.position;
const r = data.radius || 200, force = data.force || 0.4;
ctx.explode(p.x, p.y, r, force);
ctx.burst(p.x, p.y, data.color || '#ff5252', 20);
ctx.remove(ctx.bird);
```

### Reusable named abilities

Register once (e.g. from a `globalScript`), then reference by id from any bird's
`ability`:

```js
// In a globalScript (onLevelStart is fine — registration is idempotent).
AB.Abilities.register('gravity_well', (bird, data, ctx) => {
  const p = bird.body.position;
  for (const t of ctx.all()) {
    if (t === bird) continue;
    const d = ctx.dist(p.x, p.y, t.body.position.x, t.body.position.y) || 1;
    if (d < (data.radius || 260))
      ctx.applyForce(t, (p.x - t.body.position.x) / d * 0.05,
                        (p.y - t.body.position.y) / d * 0.05);
  }
  ctx.after(600, () => { ctx.explode(p.x, p.y, 150, 0.3); ctx.remove(bird); });
});
```

Now a bird def can use `"ability": "gravity_well"` (with optional `abilityData`).

---

## Boss scripting

Bosses combine **phases** (each with a built-in `behavior`) and **script hooks**.
The built-in behavior for the current phase runs every frame, and your `onUpdate`
runs **in addition to it** — so you can layer custom AI on top of, or instead of,
a built-in.

### The boss `ctx`

Boss scripts (`onSpawn`, `onUpdate`, `onPhaseChange`, `onDeath`, and phase
`onEnter`) receive a `ctx` where:

- **`ctx.boss`** — the boss track,
- **`ctx.store`** — the boss's private variable bag (this is the same object as
  `ctx.boss.ref.vars`, so state you keep here is per-boss).

### Boss track fields

The boss track exposes gameplay state under `ctx.boss.ref`:

| Field | Meaning |
|---|---|
| `boss.ref.hp` | Current HP. |
| `boss.ref.maxHp` | Max HP. |
| `boss.ref.phaseIndex` | Current phase index. |
| `boss.ref.phases` | The phase array. |
| `boss.ref.behaviorTimer` | ms accumulated in the current behavior (advances each frame). |
| `boss.ref.attackCooldown` | ms until the next attack (decremented each frame). |
| `boss.ref.vars` | Private state bag (`=== ctx.store`). |
| `boss.body.position` | `{ x, y }`. |

A common pattern: gate attacks on `attackCooldown`, then reset it.

```js
// Boss onUpdate: bombard the player on a cooldown.
const boss = ctx.boss;
if (boss.ref.attackCooldown <= 0) {
  const target = ctx.activeBird() || ctx.birds()[0];
  if (target) {
    const dx = target.body.position.x - boss.body.position.x;
    const dy = target.body.position.y - boss.body.position.y;
    const d = Math.hypot(dx, dy) || 1;
    ctx.spawnProjectile(boss.body.position.x, boss.body.position.y,
                        dx / d * 11, dy / d * 11, { color: '#e53935' });
  }
  boss.ref.attackCooldown = 1600;
}
```

### Built-in behaviors

Assign one to a phase's `behavior`:

| Behavior | Effect |
|---|---|
| `idle` | Nothing. |
| `charge` | Moves toward the active bird. |
| `shoot` | Fires projectiles at the bird. |
| `summon` | Spawns tiny pigs. |
| `rage` | Random explosions + hops. |
| `overheat` | Periodic explosive pulse around itself. |

### Reusable named behaviors

Register a behavior once, then reference it by name from a phase's `behavior`:

```js
AB.Boss.register('orbit', (boss, ctx, dt) => {
  boss.ref.behaviorTimer += dt;
  const t = boss.ref.behaviorTimer;
  const cx = 1000, cy = 320, R = 140;
  const tx = cx + Math.cos(t / 1400) * R;
  const ty = cy + Math.sin(t / 1400) * R * 0.5;
  ctx.applyForce(boss, (tx - boss.body.position.x) * 0.0012,
                       (ty - boss.body.position.y) * 0.0012);
});
```

### Phases, thresholds & camera

Phases are listed **high → low** by `hpThreshold`. Index 0 (threshold `1.0`) is
the start. When `hp/maxHp` drops **to or below** a phase's threshold, that phase
activates: its optional `camera { x, y, zoom, ms }` move plays automatically, its
`onEnter` runs, and the `onBossPhaseChange` hook fires with
`ctx.event = { track, phaseIndex, phase }`.

```json
"phases": [
  { "name": "Calm",  "hpThreshold": 1.0, "behavior": "shoot",
    "camera": { "x": 1000, "y": 380, "zoom": 0.9, "ms": 900 } },
  { "name": "Panic", "hpThreshold": 0.4, "behavior": "rage",
    "onEnter": "ctx.shake(12,600); ctx.message(ctx.boss.ref.def.name + ' panics!', 1800);" }
]
```

---

## Camera & cutscenes

`ctx.camera` (also `AB.Camera`) controls the view. Convenience shortcuts live
directly on `ctx` (`ctx.focus`, `ctx.follow`, `ctx.zoomTo`, `ctx.cutscene`,
`ctx.shake`).

| Method | Effect |
|---|---|
| `camera.focus(x, y, zoom, ms)` | Smoothly move to a point and zoom. |
| `camera.follow(track, zoom?)` | Continuously trail a body. |
| `camera.free(zoom?)` | Stop following. |
| `camera.panTo(x, y, ms)` | Pan without changing zoom. |
| `camera.zoomTo(z, ms)` | Zoom only. |
| `camera.cutscene(frames, onDone?)` | Play a sequence of frames. |
| `camera.shake(intensity, ms)` | Screen shake. |

Coordinates are **world** coordinates. **Zoom**: `1` = default, `>1` zoom in,
`<1` zoom out.

A **cutscene** is an array of frames; each frame is
`{ x, y, zoom, ms, hold }` — `ms` is the travel time to that frame and `hold` is
extra dwell time once there. Pass an `onDone` callback to run when it finishes.

```js
// onLevelStart: sweep across the level, then follow the first bird.
ctx.cutscene([
  { x: 1400, y: 300, zoom: 0.7, ms: 1400, hold: 400 },
  { x: 800,  y: 340, zoom: 0.9, ms: 1200 },
  { x: ctx.game.slingshot.x + 200, y: 380, zoom: 1, ms: 1000 }
], () => ctx.follow(ctx.activeBird()));
```

---

## Global registration

These `AB.*` functions add or override definitions and register reusable
abilities/behaviors at runtime. Call them from any script (a `globalScript` is a
good spot). Because custom definitions win over built-ins with the same id, you
can **override** a built-in on the fly.

| Call | Effect |
|---|---|
| `AB.defineMaterial(id, def)` | Add/override a material. |
| `AB.defineBird(id, def)` | Add/override a bird. |
| `AB.definePig(id, def)` | Add/override a pig. |
| `AB.defineBoss(id, def)` | Add/override a boss. |
| `AB.defineBackground(id, def)` | Add/override a background. |
| `AB.Abilities.register(id, fn)` | Register a reusable ability, `fn = (bird, data, ctx) => {}`. |
| `AB.Boss.register(name, fn)` | Register a reusable boss behavior, `fn = (bossTrack, ctx, dt) => {}`. |
| `AB.material(id)` | Look up a material def. |
| `AB.birdDef(id)` | Look up a bird def. |
| `AB.pigDef(id)` | Look up a pig def. |
| `AB.bossDef(id)` | Look up a boss def. |
| `AB.background(id)` | Look up a background def. |

```js
// globalScript, onLevelStart: define a bouncy "jelly" block for every level.
AB.defineMaterial('jelly', {
  name: 'Jelly', icon: '🟪', shape: 'rect',
  hardness: 20, density: 0.002, friction: 0.4, restitution: 1.2,
  breakable: true, color: '#c17ee0', stroke: '#8e44ad', score: 300,
  size: { w: 44, h: 44 }
});
```

---

## Worked examples

### 1. Timed bonus rain

```js
// Level scripts: onLevelStart
ctx.message('Survive 5 seconds for a gift!', 2000);

// Level scripts: onUpdate
ctx.store.t = (ctx.store.t || 0) + dt;
if (!ctx.store.gift && ctx.store.t > 5000) {
  ctx.store.gift = true;
  for (let i = 0; i < 4; i++)
    ctx.spawnBlock(400 + i * 120, 0, 'gold', { width: 56, height: 24 });
  ctx.burst(700, 100, '#ffe38a', 30);
}
```

### 2. Reward accuracy: bonus score for direct pig hits

```js
// onPigKilled: ctx.event = { track, x, y }
const b = ctx.activeBird();
if (b) {
  const d = ctx.dist(b.body.position.x, b.body.position.y, ctx.event.x, ctx.event.y);
  if (d < 40) { ctx.addScore(2000); ctx.message('Direct hit! +2000', 1200); }
}
```

### 3. Low-gravity moon level

```js
// onLevelStart
ctx.setGravity(0, 0.35);
ctx.message('Low gravity — lead your shots!', 2000);
```

### 4. Moving platform (from the built-in template)

```js
// onUpdate — creates the platform once, then oscillates it.
ctx.store.t = (ctx.store.t || 0) + dt;
const plat = ctx.store.plat || (ctx.store.plat =
  ctx.spawnBlock(900, 300, 'steel', { width: 140, height: 18 }));
ctx.setStatic(plat, true);
ctx.moveTo(plat, 900 + Math.sin(ctx.store.t / 900) * 180, 300);
```

### 5. Boss enrage on phase change

```js
// onBossPhaseChange: ctx.event = { track, phaseIndex, phase }
const boss = ctx.event.track;
ctx.shake(12, 500);
ctx.explode(boss.body.position.x, boss.body.position.y, 120, 0.15);
ctx.message(boss.ref.def.name + ' is now ' + ctx.event.phase.name + '!', 2000);
for (let i = 0; i < 3; i++)
  ctx.spawnPig(boss.body.position.x + ctx.random(-90, 90),
               boss.body.position.y - 40, 'tiny');
```

### 6. Air-strike custom bird ability

```js
// abilityScript — rain three exploding eggs.
const p = ctx.bird.body.position;
for (let i = -1; i <= 1; i++) {
  const proj = ctx.spawnProjectile(p.x + i * 40, p.y - 20, i * 3, 4,
                                   { radius: 8, color: '#fff' });
  proj.ref.onExpire = (t) => ctx.explode(t.body.position.x, t.body.position.y, 80, 0.18);
  proj.ref.ttl = 900;
}
ctx.setVelocity(ctx.bird, ctx.bird.body.velocity.x * 0.4, -6);
```

### 7. Win/lose your own way

```js
// onUpdate: instant-win if all pigs are gone AND no boss remains.
if (ctx.count('pig') === 0 && ctx.count('boss') === 0 && !ctx.store.done) {
  ctx.store.done = true;
  ctx.addScore(5000);
  ctx.after(300, () => ctx.win());
}
```

---

## Tips & gotchas

- **Persist on `ctx.store`,** never on script-local variables — bodies re-run
  each call.
- **`onUpdate` runs every frame.** Guard one-time actions with a flag on
  `ctx.store`, and use `dt` for time, not frame counts.
- **Forces are tiny.** Matter.js forces scale with mass; multiply by
  `track.body.mass` when you want a mass-independent nudge (e.g. `0.02 *
  body.mass`). `applyForce` values in the examples are deliberately small.
- **Angles:** `ctx.push` and Matter bodies use **radians**; placement `angle` in
  JSON is **degrees**. Convert with `ctx.deg(...)` / `ctx.rad2deg(...)`.
- **`ctx.moveTo` teleports** (no physics); to shove smoothly use
  `applyForce`/`setVelocity`.
- **Broken scripts are caught** and logged to the console with the hook and
  script `name` — check the devtools console when something "does nothing."
- **`spawnProjectile` returns a track** whose `ref` you can extend, e.g.
  `proj.ref.onExpire = t => ...` or `proj.ref.ttl = 900`.
