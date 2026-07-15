/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — BIRD ABILITIES
 * -----------------------------------------------------------------------------
 * A bird's `ability` is either a built-in id registered here, or 'custom' with
 * an `abilityScript` string that is executed with the full scripting context
 * plus `ctx.bird` (the active bird track). This is how you author brand-new bird
 * powers from JSON/editor without editing the engine (prompt requirement).
 *
 * Register your own from a script too:
 *     AB.Abilities.register('gravity_well', (bird, data, ctx) => { ... });
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};
  const M = root.Matter;

  const Abilities = AB.Abilities = {
    registry: {},

    register(id, fn) { this.registry[id] = fn; return this; },
    has(id) { return !!this.registry[id]; },

    // Fire a bird's ability once. Returns true if something happened.
    activate(track) {
      const ref = track && track.ref;
      if (!ref || ref.kind !== 'bird' || ref.abilityUsed || !ref.alive) return false;
      ref.abilityUsed = true;
      const ctx = AB.Scripting ? AB.Scripting.createContext({ bird: track, self: track }) : { bird: track };

      if (ref.ability === 'custom' && ref.abilityScript) {
        try {
          const fn = new Function('ctx', 'bird', 'data', 'Matter', ref.abilityScript);
          fn(ctx, track, ref.abilityData || {}, M);
        } catch (e) { console.error('[AB.Abilities] custom ability error:', e); }
        return true;
      }
      const impl = this.registry[ref.ability];
      if (impl) { try { impl(track, ref.abilityData || {}, ctx); } catch (e) { console.error('[AB.Abilities] error:', e); } return true; }
      return false;   // 'none' or unknown
    }
  };

  const P = () => AB.Physics;

  /* ---- built-in abilities ------------------------------------------------- */

  Abilities.register('none', () => {});

  Abilities.register('speed_boost', (bird, data) => {
    const v = bird.body.velocity;
    const speed = Math.hypot(v.x, v.y);
    if (speed < 0.3) return;
    const mult = data.multiplier || 2.6;
    M.Body.setVelocity(bird.body, { x: v.x * mult, y: v.y * mult });
    trail(bird, '#fff59d');
  });

  Abilities.register('split', (bird, data) => {
    const count = data.count || 3, spread = data.spread || 0.26;
    const pos = bird.body.position, v = bird.body.velocity;
    const speed = Math.hypot(v.x, v.y) || 6;
    const base = Math.atan2(v.y, v.x);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      const mini = P().spawnBody({
        x: pos.x, y: pos.y, radius: Math.max(8, bird.ref.radius * 0.6),
        density: bird.body.density, restitution: 0.35, label: 'bird',
        velocity: { x: Math.cos(a) * speed * 1.15, y: Math.sin(a) * speed * 1.15 },
        kind: 'bird', ttl: 4000,
        ref: { type: bird.ref.type, def: bird.ref.def, radius: Math.max(8, bird.ref.radius * 0.6), abilityUsed: true, launched: true, isMini: true }
      });
    }
    bird.ref.alive = false; P().remove(bird);
  });

  Abilities.register('explode', (bird, data) => {
    const p = bird.body.position;
    P().explode(p.x, p.y, data.radius || 120, data.force || 0.26);
    bird.ref.alive = false; P().remove(bird);
  });

  Abilities.register('egg_drop', (bird, data) => {
    const p = bird.body.position;
    // recoil upward
    M.Body.setVelocity(bird.body, { x: bird.body.velocity.x * 0.3, y: -8 });
    const radius = data.radius || 95, force = data.force || 0.16;
    P().spawnBody({
      x: p.x, y: p.y + bird.ref.radius + 6, radius: 11, density: 0.02, restitution: 0.05,
      velocity: { x: 0, y: 6 }, kind: 'egg', color: '#fafafa', ttl: 4000,
      ref: {
        onExpire: (t) => P().explode(t.body.position.x, t.body.position.y, radius, force),
        explodeOnHit: { radius, force }
      }
    });
  });

  Abilities.register('boomerang', (bird, data) => {
    const v = bird.body.velocity, mult = data.multiplier || 2.4;
    M.Body.setVelocity(bird.body, { x: -v.x * mult, y: -Math.abs(v.y) * 0.6 });
    M.Body.setAngularVelocity(bird.body, -0.4);
    trail(bird, '#a5d6a7');
  });

  Abilities.register('inflate', (bird, data) => {
    const to = data.radius || 40, s = to / bird.ref.radius;
    M.Body.scale(bird.body, s, s); bird.ref.radius = to;
    const p = bird.body.position;
    for (const t of P().tracks) {
      if (t === bird || t.body.isStatic || !t.ref.alive) continue;
      const dx = t.body.position.x - p.x, dy = t.body.position.y - p.y, d = Math.hypot(dx, dy);
      if (d < to * 2.4 && d > 1) M.Body.applyForce(t.body, t.body.position, { x: (dx / d) * (data.push || 0.12), y: (dy / d) * (data.push || 0.12) });
    }
  });

  Abilities.register('freeze', (bird, data) => {
    const p = bird.body.position, radius = data.radius || 110;
    const iceDef = AB.material('ice');
    for (const t of P().tracks) {
      if (t.ref.kind !== 'block' || !t.ref.alive || !t.ref.breakable) continue;
      const d = AB.util.dist(p.x, p.y, t.body.position.x, t.body.position.y);
      if (d > radius) continue;
      // turn block brittle & icy
      t.ref.frozen = true;
      t.ref.hp = Math.min(t.ref.hp, (iceDef ? iceDef.hardness : 28));
      t.ref.def = Object.assign({}, t.ref.def, { color: '#a8ddf5', stroke: '#7bc6e8', particle: '#e1f5fe' });
      P().spawnParticle(t.body.position.x, t.body.position.y, '#e1f5fe', 4, 24, (Math.random() - .5) * 2, -1);
    }
    bird.ref.alive = false; P().remove(bird);
  });

  function trail(bird, color) {
    const p = bird.body.position;
    for (let i = 0; i < 8; i++) P().spawnParticle(p.x, p.y, color, 3, 20, (Math.random() - .5) * 2, (Math.random() - .5) * 2);
  }

})(typeof window !== 'undefined' ? window : globalThis);
