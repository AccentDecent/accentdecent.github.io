/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — BOSS SYSTEM
 * -----------------------------------------------------------------------------
 * Drives boss entities: built-in phase behaviors + fully scriptable hooks.
 * A boss definition may carry script strings:
 *     onSpawn, onUpdate, onPhaseChange, onDeath           (boss-level)
 * and each phase may carry:
 *     behavior (built-in id), onEnter (script), camera {x,y,zoom,ms}
 * Boss scripts receive a ctx with ctx.boss (the track) and ctx.store === the
 * boss's private var bag, so bosses can keep their own state.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};

  const Boss = AB.Boss = {
    active: [],                 // tracked boss entities with compiled hooks
    behaviors: {},

    register(name, fn) { this.behaviors[name] = fn; return this; },

    reset() { this.active = []; },

    // Register a spawned boss track and wire its hooks.
    add(track) {
      const def = track.ref.def;
      const hooks = {};
      for (const h of ['onSpawn', 'onUpdate', 'onPhaseChange', 'onDeath']) {
        if (def[h]) hooks[h] = AB.Scripting.compile(def[h], ['ctx']);
      }
      // compile per-phase onEnter scripts
      track.ref.phases.forEach((p) => { if (p.onEnter && typeof p.onEnter === 'string') p._onEnter = AB.Scripting.compile(p.onEnter, ['ctx']); });
      const entry = { track, hooks };
      this.active.push(entry);
      this._run(entry, 'onSpawn');
      this._enterPhase(entry, track.ref.phaseIndex, true);
      return entry;
    },

    _ctx(track) { return AB.Scripting.createContext({ boss: track, store: track.ref.vars }); },

    _run(entry, hook) {
      const fn = entry.hooks[hook];
      if (fn) { try { fn(this._ctx(entry.track)); } catch (e) { console.error('[AB.Boss] ' + hook + ':', e); } }
    },

    _enterPhase(entry, index, initial) {
      const ref = entry.track.ref;
      const phase = ref.phases[index];
      if (!phase) return;
      if (phase._onEnter) { try { phase._onEnter(this._ctx(entry.track)); } catch (e) { console.error('[AB.Boss] phase onEnter:', e); } }
      if (phase.camera && AB.Camera) {
        AB.Camera.focus(phase.camera.x != null ? phase.camera.x : entry.track.body.position.x,
                        phase.camera.y != null ? phase.camera.y : entry.track.body.position.y,
                        phase.camera.zoom || AB.Camera.zoom, phase.camera.ms || 900);
      }
      if (!initial) this._run(entry, 'onPhaseChange');
    },

    // Called by the game when physics reports a phase transition.
    notifyPhaseChange(track, phaseIndex, phase) {
      const entry = this.active.find(e => e.track === track);
      if (entry) this._enterPhase(entry, phaseIndex, false);
    },

    update(dt) {
      for (let i = this.active.length - 1; i >= 0; i--) {
        const entry = this.active[i];
        const ref = entry.track.ref;
        if (!ref.alive) { this._run(entry, 'onDeath'); this.active.splice(i, 1); continue; }
        ref.behaviorTimer += dt;
        if (ref.attackCooldown > 0) ref.attackCooldown -= dt;

        // built-in behavior for the current phase
        const phase = ref.phases[ref.phaseIndex] || ref.phases[0];
        const behavior = phase && this.behaviors[phase.behavior];
        if (behavior) { try { behavior(entry.track, this._ctx(entry.track), dt); } catch (e) { console.error('[AB.Boss] behavior:', e); } }

        // user onUpdate hook (runs in addition to / instead of built-in)
        this._run(entry, 'onUpdate');
      }
    }
  };

  /* ---- built-in behaviors ------------------------------------------------- */

  Boss.register('idle', () => {});

  Boss.register('charge', (boss, ctx) => {
    if (boss.ref.attackCooldown > 0) return;
    const target = ctx.activeBird() || ctx.nearest(boss.body.position.x, boss.body.position.y, 'bird');
    if (!target) return;
    const dx = target.body.position.x - boss.body.position.x;
    const dy = target.body.position.y - boss.body.position.y;
    const d = Math.hypot(dx, dy) || 1;
    ctx.applyForce(boss, (dx / d) * 0.006 * boss.body.mass * 0.02, (dy / d) * 0.003 * boss.body.mass * 0.02);
    boss.ref.attackCooldown = 1400;
  });

  Boss.register('shoot', (boss, ctx) => {
    if (boss.ref.attackCooldown > 0) return;
    const target = ctx.activeBird() || ctx.birds()[0];
    if (!target) return;
    const dx = target.body.position.x - boss.body.position.x;
    const dy = target.body.position.y - boss.body.position.y - 40;
    const d = Math.hypot(dx, dy) || 1;
    ctx.spawnProjectile(boss.body.position.x, boss.body.position.y - boss.ref.radius, (dx / d) * 12, (dy / d) * 12 - 2, { color: '#455a64', radius: 10 });
    ctx.burst(boss.body.position.x, boss.body.position.y - boss.ref.radius, '#90a4ae', 5, 3);
    boss.ref.attackCooldown = 2000;
  });

  Boss.register('summon', (boss, ctx) => {
    if (boss.ref.attackCooldown > 0) return;
    for (let i = 0; i < 2; i++)
      ctx.spawnPig(boss.body.position.x + ctx.random(-70, 70), boss.body.position.y - boss.ref.radius - 10, 'tiny');
    ctx.burst(boss.body.position.x, boss.body.position.y, '#7cd867', 8);
    boss.ref.attackCooldown = 4500;
  });

  Boss.register('rage', (boss, ctx, dt) => {
    if (boss.ref.attackCooldown <= 0) {
      ctx.explode(boss.body.position.x + ctx.random(-80, 80), boss.body.position.y + ctx.random(-30, 30), 70, 0.08);
      boss.ref.attackCooldown = 1200;
    }
    ctx.applyForce(boss, (ctx.random(-0.5, 0.5)) * 0.02 * boss.body.mass * 0.01, -0.014 * boss.body.mass * 0.01);
  });

  Boss.register('overheat', (boss, ctx) => {
    if (boss.ref.attackCooldown > 0) return;
    ctx.explode(boss.body.position.x, boss.body.position.y, boss.ref.radius * 2.4, 0.12);
    ctx.shake(8, 300);
    boss.ref.attackCooldown = 2200;
  });

})(typeof window !== 'undefined' ? window : globalThis);
