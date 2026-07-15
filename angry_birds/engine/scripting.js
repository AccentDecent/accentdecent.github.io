/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — SCRIPTING
 * -----------------------------------------------------------------------------
 * Builds the `ctx` object every user script receives, and runs lifecycle hooks.
 * Scripts are plain JS bodies compiled with `new Function`. They are trusted
 * (this is a creative tool, not a sandbox for untrusted code) but wrapped in
 * try/catch so a broken script never kills the game loop.
 *
 * See docs/scripting.md and docs/api-reference.md for the full surface.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};
  const M = root.Matter;

  const HOOKS = [
    'onLevelStart', 'onUpdate', 'onBirdLaunch', 'onBirdLand', 'onBirdLost',
    'onBlockDestroyed', 'onPigKilled', 'onBossSpawn', 'onBossPhaseChange',
    'onBossKilled', 'onExplosion', 'onVictory', 'onDefeat'
  ];

  const Scripting = AB.Scripting = {
    HOOKS,
    globalStore: {},

    /* Build the API context. `extra` overrides/extends it (bird, boss, store…). */
    createContext(extra) {
      const P = AB.Physics, Cam = AB.Camera, G = AB.Game;
      const specOf = (x, y, opts) => Object.assign({ x, y }, opts);

      const ctx = {
        // --- live singletons ---
        get game() { return AB.Game; },
        get campaign() { return AB.Campaign; },
        physics: P, camera: Cam, Matter: M,
        store: (extra && extra.store) || this.globalStore,
        vars: (extra && extra.vars) || {},
        event: (extra && extra.event) || null,
        get time() { return AB.Game ? AB.Game.time : 0; },
        PI: Math.PI, TAU: Math.PI * 2,

        // --- queries ---
        birds: () => P.byKind('bird'),
        pigs: () => P.byKind('pig'),
        blocks: () => P.byKind('block'),
        bosses: () => P.byKind('boss'),
        all: () => P.alive(),
        count: (kind) => P.byKind(kind).length,
        activeBird: () => AB.Game && AB.Game.currentBird,
        nearest: (x, y, kind) => {
          let best = null, bd = Infinity;
          for (const t of (kind ? P.byKind(kind) : P.alive())) {
            const d = AB.util.dist(x, y, t.body.position.x, t.body.position.y);
            if (d < bd) { bd = d; best = t; }
          }
          return best;
        },
        pos: (track) => track && track.body ? { x: track.body.position.x, y: track.body.position.y } : null,

        // --- spawning ---
        spawnBird: (x, y, type, opts) => P.createBird(specOf(x, y, Object.assign({ type: type || 'red' }, opts))),
        spawnPig: (x, y, type, opts) => P.createPig(specOf(x, y, Object.assign({ type: type || 'normal' }, opts))),
        spawnBlock: (x, y, type, opts) => P.createBlock(specOf(x, y, Object.assign({ type: type || 'wood' }, opts))),
        spawnBoss: (x, y, type, opts) => P.createBoss(specOf(x, y, Object.assign({ type: type || 'king_pig_boss' }, opts))),
        spawnProjectile: (x, y, vx, vy, opts) => P.spawnBody(Object.assign({
          x, y, radius: 9, density: 0.004, kind: 'projectile', label: 'projectile',
          velocity: { x: vx, y: vy }, color: '#455a64', ttl: 5000, ref: { damage: (opts && opts.damage) || 40 }
        }, opts)),

        // --- movement & forces ---
        applyForce: (t, fx, fy) => { if (t && t.body) M.Body.applyForce(t.body, t.body.position, { x: fx, y: fy }); },
        setVelocity: (t, vx, vy) => { if (t && t.body) M.Body.setVelocity(t.body, { x: vx, y: vy }); },
        push: (t, angle, power) => { if (t && t.body) M.Body.applyForce(t.body, t.body.position, { x: Math.cos(angle) * power, y: Math.sin(angle) * power }); },
        moveTo: (t, x, y) => { if (t && t.body) M.Body.setPosition(t.body, { x, y }); },
        setStatic: (t, s) => { if (t && t.body) M.Body.setStatic(t.body, !!s); },
        damage: (t, amount) => {
          if (!t || !t.ref) return;
          if (t.ref.kind === 'pig') P.damagePig(t, amount);
          else if (t.ref.kind === 'block') P.damageBlock(t, amount);
          else if (t.ref.kind === 'boss') P.damageBoss(t, amount);
        },
        remove: (t) => { if (t) { t.ref.alive = false; P.remove(t); } },

        // --- fx ---
        explode: (x, y, r, force) => P.explode(x, y, r, force),
        burst: (x, y, color, count, speed) => P.spawnBurst(x, y, color, count || 12, speed),
        particle: (x, y, color, size, life, vx, vy) => P.spawnParticle(x, y, color, size, life, vx, vy),
        shake: (i, ms) => Cam.shake(i, ms),

        // --- camera convenience (full API on ctx.camera) ---
        focus: (x, y, zoom, ms) => Cam.focus(x, y, zoom, ms),
        follow: (t, zoom) => Cam.follow(t, zoom),
        cutscene: (frames, done) => Cam.cutscene(frames, done),
        zoomTo: (z, ms) => Cam.zoomTo(z, ms),

        // --- game flow ---
        addScore: (n) => AB.Game && AB.Game.addScore(n),
        message: (text, ms) => AB.Game && AB.Game.message && AB.Game.message(text, ms),
        win: () => AB.Game && AB.Game.endLevel(true),
        lose: () => AB.Game && AB.Game.endLevel(false),
        setGravity: (x, y) => P.setGravity(x, y),

        // --- timers (frame-safe: callbacks run inside the loop via setTimeout) ---
        after: (ms, fn) => setTimeout(() => { try { fn(); } catch (e) { console.error(e); } }, ms),

        // --- math / util ---
        random: AB.util.rand, randInt: AB.util.randInt, clamp: AB.util.clamp,
        lerp: AB.util.lerp, dist: AB.util.dist, deg: AB.util.deg2rad, rad2deg: AB.util.rad2deg,
        now: () => (AB.Game ? AB.Game.time : 0),
        log: (...a) => console.log('[AB script]', ...a)
      };

      if (extra) for (const k of Object.keys(extra)) if (k !== 'store' && k !== 'vars' && k !== 'event') ctx[k] = extra[k];
      return ctx;
    },

    compile(code, argNames) {
      argNames = argNames || ['ctx'];
      try { return new Function(...argNames, code); }
      catch (e) { console.error('[AB.Scripting] compile error:', e.message); return null; }
    },

    /* A runner bundles a level's + game's scripts and dispatches hooks. */
    buildRunner(scriptLists) {
      const compiled = {};
      for (const h of HOOKS) compiled[h] = [];
      const lists = [].concat(scriptLists || []);
      for (const list of lists) {
        for (const s of (list || [])) {
          if (!s || !s.hook || !s.code) continue;
          if (!compiled[s.hook]) compiled[s.hook] = [];
          const fn = this.compile(s.code, ['ctx', 'dt']);
          if (fn) compiled[s.hook].push({ fn, name: s.name || s.hook });
        }
      }
      const store = {};
      const self = this;
      return {
        store,
        run(hook, event, dt) {
          const fns = compiled[hook];
          if (!fns || !fns.length) return;
          const ctx = self.createContext({ store, event });
          for (const c of fns) { try { c.fn(ctx, dt); } catch (e) { console.error(`[AB.Scripting] ${hook} "${c.name}":`, e); } }
        },
        has(hook) { return compiled[hook] && compiled[hook].length > 0; }
      };
    }
  };

  /* ===========================================================================
   * TEMPLATES — inserted from the editor's script dropdown. Each is a ready-to-
   * run example of a hook or ability. Documented in docs/scripting.md.
   * ========================================================================= */
  Scripting.TEMPLATES = {
    'ability: gravity well (custom bird)':
`// Bird ability — assign ability:"custom" and paste this as abilityScript.
// ctx.bird is the active bird. Pull everything toward it, then pop.
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
ctx.after(600, () => { ctx.explode(ctx.bird.body.position.x, ctx.bird.body.position.y, 150, 0.3); ctx.remove(ctx.bird); });`,

    'ability: air strike (custom bird)':
`// Rain three eggs from above the bird's position.
const p = ctx.bird.body.position;
for (let i = -1; i <= 1; i++) {
  const proj = ctx.spawnProjectile(p.x + i * 40, p.y - 20, i * 3, 4, { radius: 8, color: '#fff' });
  proj.ref.onExpire = (t) => ctx.explode(t.body.position.x, t.body.position.y, 80, 0.18);
  proj.ref.ttl = 900;
}
ctx.setVelocity(ctx.bird, ctx.bird.body.velocity.x * 0.4, -6);`,

    'hook: onUpdate — moving platform':
`// Level hook onUpdate(ctx, dt). Store state on ctx.store.
ctx.store.t = (ctx.store.t || 0) + dt;
const plat = ctx.store.plat || (ctx.store.plat =
  ctx.spawnBlock(900, 300, 'steel', { width: 140, height: 18 }));
ctx.setStatic(plat, true);
ctx.moveTo(plat, 900 + Math.sin(ctx.store.t / 900) * 180, 300);`,

    'hook: onBossPhaseChange — enrage':
`// Runs when any boss crosses a phase threshold. ctx.event = { track, phase }.
const boss = ctx.event.track;
ctx.shake(12, 500);
ctx.explode(boss.body.position.x, boss.body.position.y, 120, 0.15);
ctx.message(boss.ref.def.name + " is now " + ctx.event.phase.name + "!", 2000);
for (let i = 0; i < 3; i++)
  ctx.spawnPig(boss.body.position.x + ctx.random(-90, 90), boss.body.position.y - 40, 'tiny');`,

    'boss AI: circle & bombard':
`// Boss onUpdate hook. ctx.boss is the boss track (also ctx.event.track).
const boss = ctx.boss || ctx.bosses()[0];
if (!boss) return;
boss.ref.behaviorTimer += 16;
const t = boss.ref.behaviorTimer;
const cx = 1000, cy = 320, R = 140;
const tx = cx + Math.cos(t / 1400) * R, ty = cy + Math.sin(t / 1400) * R * 0.5;
ctx.applyForce(boss, (tx - boss.body.position.x) * 0.0012, (ty - boss.body.position.y) * 0.0012);
if (boss.ref.attackCooldown <= 0) {
  const target = ctx.activeBird() || ctx.birds()[0];
  if (target) {
    const dx = target.body.position.x - boss.body.position.x;
    const dy = target.body.position.y - boss.body.position.y;
    const d = Math.hypot(dx, dy) || 1;
    ctx.spawnProjectile(boss.body.position.x, boss.body.position.y, dx / d * 11, dy / d * 11, { color: '#e53935' });
  }
  boss.ref.attackCooldown = 1600;
}`,

    'cutscene: intro sweep':
`// Fly the camera across the level, then settle on the slingshot.
ctx.cutscene([
  { x: 1400, y: 300, zoom: 0.7, ms: 1400, hold: 400 },
  { x: 800,  y: 340, zoom: 0.9, ms: 1200 },
  { x: ctx.game.slingshot.x + 200, y: 380, zoom: 1, ms: 1000 }
], () => ctx.follow(ctx.activeBird()));`
  };

})(typeof window !== 'undefined' ? window : globalThis);
