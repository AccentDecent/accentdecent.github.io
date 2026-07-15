# API Reference

A terse lookup of every scripting API member. For explanations, patterns, and
worked examples see [scripting.md](scripting.md); for data/file fields see
[json-format.md](json-format.md).

Notation: a **track** is `{ id, body, ref }`. `?` marks optional parameters.
Angles in the physics API are **radians**; `angle` in JSON placements is degrees.

- [`ctx` — live references](#ctx--live-references)
- [`ctx` — queries](#ctx--queries)
- [`ctx` — spawning](#ctx--spawning)
- [`ctx` — movement & forces](#ctx--movement--forces)
- [`ctx` — FX](#ctx--fx)
- [`ctx` — camera convenience](#ctx--camera-convenience)
- [`ctx` — game flow](#ctx--game-flow)
- [`ctx` — timers](#ctx--timers)
- [`ctx` — math & util](#ctx--math--util)
- [`ctx` — ability & boss extras](#ctx--ability--boss-extras)
- [`AB.Camera`](#abcamera)
- [`AB` globals](#ab-globals)
- [Track shape](#track-shape)

---

## `ctx` — live references

| Member | Type | Description |
|---|---|---|
| `ctx.game` | object | Live `AB.Game` (current level runtime). |
| `ctx.campaign` | object | Live `AB.Campaign`. |
| `ctx.physics` | object | Physics world (`AB.Physics`). |
| `ctx.camera` | object | Camera (`AB.Camera`). |
| `ctx.Matter` | object | Matter.js library. |
| `ctx.store` | object | Per-runner persistent state (survives across calls). |
| `ctx.vars` | object | General-purpose variable bag. |
| `ctx.event` | object/null | Event payload for the current hook. |
| `ctx.time` | number | ms since level start. |
| `ctx.PI` | number | `Math.PI`. |
| `ctx.TAU` | number | `2π`. |

## `ctx` — queries

| Member | Returns | Description |
|---|---|---|
| `ctx.birds()` | track[] | Live bird tracks. |
| `ctx.pigs()` | track[] | Live pig tracks. |
| `ctx.blocks()` | track[] | Live block tracks. |
| `ctx.bosses()` | track[] | Live boss tracks. |
| `ctx.all()` | track[] | All live tracks. |
| `ctx.count(kind)` | number | Count of `'bird'`\|`'pig'`\|`'block'`\|`'boss'`. |
| `ctx.activeBird()` | track/falsy | Bird currently in play. |
| `ctx.nearest(x, y, kind?)` | track/null | Nearest track to `(x,y)`, optionally of a kind. |
| `ctx.pos(track)` | `{x,y}`/null | Position of a track's body. |

## `ctx` — spawning

Each returns the new track.

| Member | Description |
|---|---|
| `ctx.spawnBird(x, y, type, opts?)` | Spawn a bird of `type`. |
| `ctx.spawnPig(x, y, type, opts?)` | Spawn a pig. |
| `ctx.spawnBlock(x, y, type, opts?)` | Spawn a block. `opts`: `width`, `height`, `angle`, `shape`, `texture`. |
| `ctx.spawnBoss(x, y, type, opts?)` | Spawn a boss. |
| `ctx.spawnProjectile(x, y, vx, vy, opts?)` | Spawn a projectile with velocity. `opts`: `damage`, `color`, `radius`, `ttl`. |

## `ctx` — movement & forces

| Member | Description |
|---|---|
| `ctx.applyForce(track, fx, fy)` | Apply a force vector at the body's center. |
| `ctx.setVelocity(track, vx, vy)` | Set velocity directly. |
| `ctx.push(track, angleRad, power)` | Apply force along `angleRad` (radians). |
| `ctx.moveTo(track, x, y)` | Teleport (no physics). |
| `ctx.setStatic(track, bool)` | Make the body static (immovable) or dynamic. |
| `ctx.damage(track, amount)` | Deal `amount` damage (routes to pig/block/boss). |
| `ctx.remove(track)` | Mark dead and remove from the world. |

## `ctx` — FX

| Member | Description |
|---|---|
| `ctx.explode(x, y, radius, force)` | Explosion that pushes and damages nearby bodies. |
| `ctx.burst(x, y, color, count?, speed?)` | Particle burst (`count` default 12). |
| `ctx.particle(x, y, color, size?, life?, vx?, vy?)` | Emit a single particle. |
| `ctx.shake(intensity, ms)` | Screen shake. |

## `ctx` — camera convenience

Shortcuts to the most-used `AB.Camera` methods (full API on `ctx.camera`).

| Member | Description |
|---|---|
| `ctx.focus(x, y, zoom, ms)` | Smooth move + zoom. |
| `ctx.follow(track, zoom?)` | Trail a track. |
| `ctx.cutscene(frames, onDone?)` | Play a camera sequence. |
| `ctx.zoomTo(z, ms)` | Zoom to `z`. |

## `ctx` — game flow

| Member | Description |
|---|---|
| `ctx.addScore(n)` | Add `n` to the score. |
| `ctx.message(text, ms?)` | Show transient on-screen text. |
| `ctx.win()` | End the level as a victory. |
| `ctx.lose()` | End the level as a defeat. |
| `ctx.setGravity(x, y)` | Set world gravity vector. |

## `ctx` — timers

| Member | Description |
|---|---|
| `ctx.after(ms, fn)` | Run `fn` after `ms` (errors caught & logged). |

## `ctx` — math & util

| Member | Returns | Description |
|---|---|---|
| `ctx.random(min, max)` | number | Random float in `[min, max)`. |
| `ctx.randInt(min, max)` | number | Random integer in `[min, max]`. |
| `ctx.clamp(v, lo, hi)` | number | Clamp `v` to `[lo, hi]`. |
| `ctx.lerp(a, b, t)` | number | Linear interpolation. |
| `ctx.dist(x1, y1, x2, y2)` | number | Euclidean distance. |
| `ctx.deg(degrees)` | number | Degrees → radians. |
| `ctx.rad2deg(r)` | number | Radians → degrees. |
| `ctx.now()` | number | ms since level start. |
| `ctx.log(...args)` | — | `console.log` with an `[AB script]` prefix. |

## `ctx` — ability & boss extras

Present only in the relevant script contexts.

| Member | Available in | Description |
|---|---|---|
| `ctx.bird` | custom bird `abilityScript` | The active bird's track (also local `bird`; also `ctx.self`). |
| `data` | custom bird `abilityScript` | The bird's `abilityData` params (local, not on `ctx`). |
| `Matter` | custom bird `abilityScript` | The Matter.js library (local). |
| `ctx.boss` | boss hooks (`onSpawn`/`onUpdate`/`onPhaseChange`/`onDeath`, phase `onEnter`) | The boss track. |
| `ctx.store` | boss hooks | The boss's private var bag (`=== ctx.boss.ref.vars`). |

---

## `AB.Camera`

Also reachable as `ctx.camera`. Coordinates are **world** coordinates; zoom `1` =
default, `>1` in, `<1` out.

| Method | Description |
|---|---|
| `AB.Camera.focus(x, y, zoom, ms)` | Smoothly move to `(x,y)` and zoom over `ms`. |
| `AB.Camera.follow(track, zoom?)` | Continuously trail a track's body. |
| `AB.Camera.free(zoom?)` | Stop following (optionally set a zoom). |
| `AB.Camera.panTo(x, y, ms)` | Pan to `(x,y)` without changing zoom. |
| `AB.Camera.zoomTo(z, ms)` | Zoom to `z` over `ms`. |
| `AB.Camera.cutscene(frames, onDone?)` | Play a sequence; each frame `{ x, y, zoom, ms, hold }` (`hold` = extra dwell ms). |
| `AB.Camera.shake(intensity, ms)` | Screen shake. |

---

## `AB` globals

Usable from any script (e.g. a `globalScript`). Custom definitions override
built-ins with the same id.

### Define / override definitions

| Function | Description |
|---|---|
| `AB.defineMaterial(id, def)` | Add/override a [material def](json-format.md#material-block-definition). |
| `AB.defineBird(id, def)` | Add/override a [bird def](json-format.md#bird-definition). |
| `AB.definePig(id, def)` | Add/override a [pig def](json-format.md#pig-definition). |
| `AB.defineBoss(id, def)` | Add/override a [boss def](json-format.md#boss-definition). |
| `AB.defineBackground(id, def)` | Add/override a [background def](json-format.md#background-definition). |

### Register reusable behavior

| Function | Description |
|---|---|
| `AB.Abilities.register(id, fn)` | Register a reusable ability. `fn = (bird, data, ctx) => {}`. |
| `AB.Boss.register(name, fn)` | Register a reusable boss behavior. `fn = (bossTrack, ctx, dt) => {}`. |

### Look up definitions

| Function | Returns |
|---|---|
| `AB.material(id)` | Material def, or `null`. |
| `AB.birdDef(id)` | Bird def, or `null`. |
| `AB.pigDef(id)` | Pig def, or `null`. |
| `AB.bossDef(id)` | Boss def, or `null`. |
| `AB.background(id)` | Background def, or `null`. |

---

## Track shape

```
track = {
  id,          // unique id string
  body,        // Matter.js body
  ref          // gameplay state
}
```

### `track.body` (Matter.js)

| Field | Description |
|---|---|
| `body.position` | `{ x, y }` center. |
| `body.velocity` | `{ x, y }` velocity. |
| `body.angle` | Rotation in **radians**. |
| `body.mass` | Mass (from density × area). |
| `body.density` | Mass per area. |
| `body.isStatic` | Whether the body is frozen/immovable. |

### `track.ref` (gameplay state)

| Field | Description |
|---|---|
| `ref.kind` | `'bird'` \| `'pig'` \| `'block'` \| `'boss'` \| … |
| `ref.type` | The definition id (e.g. `'wood'`, `'red'`). |
| `ref.def` | The definition object. |
| `ref.hp` | Current hit points. |
| `ref.maxHp` | Max hit points. |
| `ref.alive` | Whether it's still in play. |
| `ref.radius` | Body radius. |

### Boss-only `track.ref` fields

| Field | Description |
|---|---|
| `ref.phaseIndex` | Current phase index. |
| `ref.phases` | The phase array. |
| `ref.behaviorTimer` | ms accumulated in the current behavior. |
| `ref.attackCooldown` | ms until next attack (counts down each frame). |
| `ref.vars` | Private state bag (`=== ctx.store` in boss hooks). |

---

## `AB.TUNING` (override via `game.settings.tuning`)

| Key | Default |
|---|---|
| `gravityScale` | `0.0016` |
| `fixedStep` | `16.667` |
| `maxSubSteps` | `5` |
| `launchPower` | `0.16` |
| `maxDragDistance` | `130` |
| `dmgBirdToBlock` | `0.9` |
| `dmgBirdToPig` | `1.8` |
| `dmgBirdToBoss` | `1.1` |
| `dmgBlockToPig` | `0.55` |
| `dmgBlockToBlock` | `0.18` |
| `dmgFallToPig` | `0.5` |
| `minImpact` | `2.2` |
| `scoreUnusedBird` | `10000` |
| `debrisLifetime` | `6000` |
| `outOfBoundsMargin` | `600` |

See [json-format.md](json-format.md#abtuning-constants) for meanings.
