/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — PHYSICS
 * -----------------------------------------------------------------------------
 * A thin, game-aware wrapper over Matter.js. Responsibilities:
 *   - build rigid bodies for every entity kind (block/bird/pig/boss/...)
 *   - a FIXED-TIMESTEP loop for stable, reproducible simulation
 *   - a REAL impact model: damage scales with collision impulse
 *     (impulse ≈ reducedMass × relativeSpeed), so a fast/heavy hit does more
 *     damage than a slow/light one — this is what makes it feel like the
 *     original, unlike a constant-per-hit model.
 *   - explosions, buoyancy, particles, and world cleanup
 *
 * The wrapper is UI-agnostic: it emits events (this.emit) and calls optional
 * callbacks (onImpact/onScore) that the game layer wires up. It only reaches for
 * AB.Camera opportunistically for screen shake.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};
  const M = root.Matter;

  /* Shared geometry so physics bodies and the renderer agree on vertices. */
  AB.geometry = {
    // Vertices for a block, relative to its center, before rotation.
    blockVertices(shape, w, h) {
      const hw = w / 2, hh = h / 2;
      switch (shape) {
        case 'triangle':          // right-triangle wedge (right angle bottom-left)
          return [{ x: -hw, y: hh }, { x: hw, y: hh }, { x: -hw, y: -hh }];
        case 'triangle_r':        // mirrored wedge (right angle bottom-right)
          return [{ x: -hw, y: hh }, { x: hw, y: hh }, { x: hw, y: -hh }];
        case 'trapezoid':
          return [{ x: -hw, y: hh }, { x: hw, y: hh }, { x: hw * 0.5, y: -hh }, { x: -hw * 0.5, y: -hh }];
        default:                  // rect
          return [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }];
      }
    }
  };

  const Physics = AB.Physics = {
    engine: null,
    world: null,
    tracks: [],                 // [{ id, body, ref }]
    byBody: new Map(),          // matter body id -> track
    particles: [],
    groundBody: null,
    bounds: { left: -400, right: 2200, groundY: 550 },
    _accum: 0,
    _nextId: 1,

    // Wiring points (set by the game layer)
    onImpact: null,             // (a, b, impact, relSpeed, pair) => void
    onScore: null,              // (points, x, y) => void
    _listeners: {},

    on(evt, fn) { (this._listeners[evt] = this._listeners[evt] || []).push(fn); return this; },
    emit(evt, data) { (this._listeners[evt] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); },

    /* ----------------------------------------------------------------------- */
    init(opts) {
      opts = opts || {};
      this.engine = M.Engine.create();
      this.engine.gravity.x = (opts.gravity && opts.gravity.x) || 0;
      this.engine.gravity.y = (opts.gravity && opts.gravity.y != null) ? opts.gravity.y : 1;
      this.engine.gravity.scale = AB.TUNING.gravityScale;
      this.world = this.engine.world;
      this.tracks = [];
      this.byBody = new Map();
      this.particles = [];
      this._accum = 0;
      this._listeners = {};
      this.onImpact = null;
      this.onScore = null;

      M.Events.on(this.engine, 'collisionStart', (evt) => this._onCollision(evt));
      return this;
    },

    setGravity(x, y) {
      this.engine.gravity.x = x || 0;
      this.engine.gravity.y = (y == null) ? 1 : y;
      this.engine.gravity.scale = AB.TUNING.gravityScale;
    },

    _onCollision(evt) {
      for (const pair of evt.pairs) {
        const a = this.byBody.get(pair.bodyA.id);
        const b = this.byBody.get(pair.bodyB.id);
        const dvx = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
        const dvy = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
        const relSpeed = Math.hypot(dvx, dvy);
        const mA = pair.bodyA.mass, mB = pair.bodyB.mass;
        let reduced;
        if (!isFinite(mA)) reduced = mB;
        else if (!isFinite(mB)) reduced = mA;
        else reduced = (mA * mB) / (mA + mB) || 0;
        const impact = relSpeed * reduced;
        if (this.onImpact) this.onImpact(a || wrapForeign(pair.bodyA), b || wrapForeign(pair.bodyB), impact, relSpeed, pair);
      }
    },

    /* ---- ground & bounds -------------------------------------------------- */
    setupWorld(bounds) {
      this.bounds = Object.assign({ left: -400, right: 2200, groundY: 550 }, bounds);
      const width = (this.bounds.right - this.bounds.left);
      const cx = (this.bounds.left + this.bounds.right) / 2;
      this.groundBody = M.Bodies.rectangle(cx, this.bounds.groundY + 300, width + 2000, 600, {
        isStatic: true, friction: 0.9, restitution: 0.05, label: 'ground'
      });
      M.Composite.add(this.world, this.groundBody);
      // invisible side walls keep the scene from sliding away forever
      const wallOpts = { isStatic: true, friction: 0.2, label: 'wall' };
      M.Composite.add(this.world, M.Bodies.rectangle(this.bounds.left - 60, this.bounds.groundY - 1000, 120, 4000, wallOpts));
      M.Composite.add(this.world, M.Bodies.rectangle(this.bounds.right + 60, this.bounds.groundY - 1000, 120, 4000, wallOpts));
      return this.groundBody;
    },

    /* ---- body factories --------------------------------------------------- */
    _add(body, ref) {
      const id = this._nextId++;
      const track = { id, body, ref };
      ref.alive = ref.alive !== false;
      M.Composite.add(this.world, body);
      this.tracks.push(track);
      this.byBody.set(body.id, track);
      return track;
    },

    createBlock(spec) {
      const def = AB.material(spec.type);
      if (!def) { console.warn('[AB.Physics] unknown material', spec.type); return null; }
      const shape = spec.shape || def.shape || 'rect';
      const w = spec.width  || (def.size && def.size.w) || 80;
      const h = spec.height || (def.size && def.size.h) || 20;
      const angle = AB.util.deg2rad(spec.angle || 0);
      const bodyOpts = {
        angle,
        density: spec.density != null ? spec.density : def.density,
        friction: def.friction, frictionStatic: def.friction * 1.2,
        restitution: def.restitution, label: 'block',
        chamfer: (shape === 'rect' && def.breakable) ? { radius: 1.5 } : undefined
      };
      let body;
      if (shape === 'circle') {
        body = M.Bodies.circle(spec.x, spec.y, Math.max(w, h) / 2, bodyOpts);
      } else if (shape === 'rect') {
        body = M.Bodies.rectangle(spec.x, spec.y, w, h, bodyOpts);
      } else {
        const verts = spec.verts || AB.geometry.blockVertices(shape, w, h);
        body = M.Bodies.fromVertices(spec.x, spec.y, [verts], bodyOpts) ||
               M.Bodies.rectangle(spec.x, spec.y, w, h, bodyOpts);
        M.Body.setPosition(body, { x: spec.x, y: spec.y });
        M.Body.setAngle(body, angle);
      }
      const hardness = spec.hardness != null ? spec.hardness : def.hardness;
      const ref = {
        kind: 'block', type: spec.type, shape, width: w, height: h,
        hp: hardness, maxHp: hardness, breakable: def.breakable && isFinite(hardness),
        explosive: def.explosive || spec.explosive || null,
        buoyancy: def.buoyancy || 0,
        texture: spec.texture || def.texture || null,
        score: def.score || 0, def, spec, alive: true
      };
      return this._add(body, ref);
    },

    createPig(spec) {
      const def = AB.pigDef(spec.type);
      if (!def) { console.warn('[AB.Physics] unknown pig', spec.type); return null; }
      const r = spec.radius || def.radius;
      const body = M.Bodies.circle(spec.x, spec.y, r, {
        density: def.density, friction: 0.6, restitution: 0.08, label: 'pig'
      });
      const hp = spec.hp != null ? spec.hp : def.hp;
      const ref = {
        kind: 'pig', type: spec.type, radius: r, hp, maxHp: hp,
        armor: def.armor || 0, texture: spec.texture || def.texture || null,
        score: def.score || 5000, def, spec, alive: true
      };
      return this._add(body, ref);
    },

    createBird(spec) {
      const def = AB.birdDef(spec.type);
      if (!def) { console.warn('[AB.Physics] unknown bird', spec.type); return null; }
      const r = spec.radius || def.radius;
      // Create DYNAMIC. Callers that want a resting bird call setStatic(true)
      // once (which captures the real mass into Matter's _original); launching
      // then restores it. Creating static here + a later setStatic(true) would
      // corrupt _original and yield mass=Infinity → NaN on launch.
      const body = M.Bodies.circle(spec.x, spec.y, r, {
        density: def.density, friction: 0.5, frictionStatic: 0.6,
        restitution: spec.restitution != null ? spec.restitution : def.restitution,
        label: 'bird'
      });
      const ref = {
        kind: 'bird', type: spec.type, radius: r,
        ability: spec.ability || def.ability || 'none',
        abilityData: Object.assign({}, def.abilityData, spec.abilityData),
        abilityScript: spec.abilityScript || def.abilityScript || null,
        abilityUsed: false, launched: false,
        texture: spec.texture || def.texture || null,
        def, spec, alive: true
      };
      return this._add(body, ref);
    },

    createBoss(spec) {
      const def = AB.bossDef(spec.type);
      if (!def) { console.warn('[AB.Physics] unknown boss', spec.type); return null; }
      const r = spec.radius || def.radius;
      const body = M.Bodies.circle(spec.x, spec.y, r, {
        density: def.density, friction: 0.6, restitution: 0.05, label: 'boss'
      });
      const hp = spec.hp != null ? spec.hp : def.hp;
      const phases = (def.phases || [{ name: 'Main', hpThreshold: 1, behavior: 'charge' }]).map(p => Object.assign({}, p));
      const ref = {
        kind: 'boss', type: spec.type, radius: r, hp, maxHp: hp,
        phases, phaseIndex: 0, behaviorTimer: 0, attackCooldown: 0,
        texture: spec.texture || def.texture || null,
        score: def.score || 50000, def, spec, alive: true, vars: {}
      };
      return this._add(body, ref);
    },

    // Generic dynamic body for projectiles / debris / eggs spawned at runtime.
    spawnBody(spec) {
      const opts = {
        density: spec.density || 0.004, friction: spec.friction != null ? spec.friction : 0.5,
        restitution: spec.restitution != null ? spec.restitution : 0.3, label: spec.label || 'debris'
      };
      const body = spec.radius
        ? M.Bodies.circle(spec.x, spec.y, spec.radius, opts)
        : M.Bodies.rectangle(spec.x, spec.y, spec.width || 12, spec.height || 12, opts);
      if (spec.velocity) { if (!(body.deltaTime > 0)) body.deltaTime = AB.TUNING.fixedStep; M.Body.setVelocity(body, spec.velocity); }
      const ref = Object.assign({
        kind: spec.kind || 'debris', radius: spec.radius, width: spec.width, height: spec.height,
        color: spec.color || '#888', alive: true, ttl: spec.ttl || AB.TUNING.debrisLifetime
      }, spec.ref);
      return this._add(body, ref);
    },

    /* ---- launch ----------------------------------------------------------- */
    launch(track, vx, vy) {
      if (!track || !track.body) return;
      M.Body.setStatic(track.body, false);
      // Matter's setVelocity scales by body.deltaTime/baseDelta; ensure it is a
      // sane, finite value (it is unset until the engine's first update, which
      // would make setVelocity produce NaN if a bird is launched on frame 0).
      if (!(track.body.deltaTime > 0)) track.body.deltaTime = AB.TUNING.fixedStep;
      M.Body.setVelocity(track.body, { x: vx, y: vy });
      M.Body.setAngularVelocity(track.body, vx * 0.01);
      if (track.ref) track.ref.launched = true;
    },

    /* ---- damage & destruction -------------------------------------------- */
    damageBlock(track, amount) {
      const ref = track.ref;
      if (!ref || ref.kind !== 'block' || !ref.alive || !ref.breakable) return false;
      ref.hp -= amount;
      if (ref.hp <= 0) { this.destroyBlock(track); return true; }
      return false;
    },

    destroyBlock(track) {
      const ref = track.ref;
      if (!ref.alive) return;
      ref.alive = false;
      const p = track.body.position;
      this.spawnBurst(p.x, p.y, (ref.def && ref.def.particle) || '#aaa', 9);
      this.remove(track);
      if (this.onScore) this.onScore(ref.score, p.x, p.y);
      this.emit('blockDestroyed', { track, x: p.x, y: p.y });
      if (ref.explosive) this.explode(p.x, p.y, ref.explosive.radius, ref.explosive.force);
    },

    damagePig(track, amount) {
      const ref = track.ref;
      if (!ref || ref.kind !== 'pig' || !ref.alive) return false;
      ref.hp -= amount * (1 - (ref.armor || 0));
      if (ref.hp <= 0) { this.killPig(track); return true; }
      return false;
    },

    killPig(track) {
      const ref = track.ref;
      if (!ref.alive) return;
      ref.alive = false;
      const p = track.body.position;
      this.spawnBurst(p.x, p.y, (ref.def && ref.def.color) || '#63c74d', 12);
      this.remove(track);
      if (this.onScore) this.onScore(ref.score, p.x, p.y);
      this.emit('pigKilled', { track, x: p.x, y: p.y });
    },

    damageBoss(track, amount) {
      const ref = track.ref;
      if (!ref || ref.kind !== 'boss' || !ref.alive) return false;
      ref.hp -= amount;
      if (ref.hp <= 0) {
        ref.alive = false;
        const p = track.body.position;
        this.explode(p.x, p.y, ref.radius * 3, 0.3);
        this.spawnBurst(p.x, p.y, '#ffcc00', 30);
        this.remove(track);
        if (this.onScore) this.onScore(ref.score, p.x, p.y);
        this.emit('bossKilled', { track });
        return 'dead';
      }
      // Phase transition check (thresholds are descending fractions of maxHp)
      const frac = ref.hp / ref.maxHp;
      for (let i = ref.phases.length - 1; i > ref.phaseIndex; i--) {
        if (frac <= ref.phases[i].hpThreshold) {
          ref.phaseIndex = i;
          this.emit('bossPhaseChange', { track, phaseIndex: i, phase: ref.phases[i] });
          return 'phase';
        }
      }
      return true;
    },

    /* ---- explosions & forces --------------------------------------------- */
    explode(x, y, radius, force) {
      radius = radius || 100; force = force || 0.2;
      for (const t of this.tracks.slice()) {
        if (!t.body || !t.ref || !t.ref.alive) continue;
        if (t.body.isStatic) continue;
        const dx = t.body.position.x - x, dy = t.body.position.y - y;
        const d = Math.hypot(dx, dy);
        if (d >= radius || d < 0.01) continue;
        const falloff = 1 - d / radius;
        // Damage FIRST so the kick isn't wasted on a body that is about to be
        // removed; then fling whatever survives (that's the visible knockback).
        const dmg = falloff * 260;
        let killed = false;
        if (t.ref.kind === 'block') killed = this.damageBlock(t, dmg);
        else if (t.ref.kind === 'pig') killed = this.damagePig(t, dmg);
        else if (t.ref.kind === 'boss') this.damageBoss(t, dmg * 0.4);
        if (killed || !t.ref.alive) continue;
        const nx = dx / d, ny = dy / d;
        const f = force * (0.35 + 0.65 * falloff);     // flatter falloff = punchier
        M.Body.applyForce(t.body, t.body.position, { x: nx * f, y: ny * f - f * 0.55 });
        M.Body.setAngularVelocity(t.body, t.body.angularVelocity + (Math.random() - 0.5) * 0.5);
      }
      this.spawnBurst(x, y, '#ff6d00', 22, 6);
      if (AB.Camera) AB.Camera.shake(Math.min(16, radius / 11), 380);
      this.emit('explosion', { x, y, radius, force });
    },

    /* ---- particles -------------------------------------------------------- */
    spawnBurst(x, y, color, count, speed) {
      speed = speed || 4;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * speed + 1;
        this.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
          life: 26 + Math.random() * 18, maxLife: 44, color, size: 2 + Math.random() * 4
        });
      }
    },
    spawnParticle(x, y, color, size, life, vx, vy) {
      this.particles.push({ x, y, vx: vx || 0, vy: vy || 0, life: life || 30, maxLife: life || 30, color: color || '#fff', size: size || 3 });
    },

    /* ---- removal & queries ------------------------------------------------ */
    remove(track) {
      if (track.body) { M.Composite.remove(this.world, track.body); this.byBody.delete(track.body.id); }
      const i = this.tracks.indexOf(track);
      if (i >= 0) this.tracks.splice(i, 1);
    },

    byKind(kind) { return this.tracks.filter(t => t.ref && t.ref.kind === kind && t.ref.alive); },
    alive() { return this.tracks.filter(t => t.ref && t.ref.alive); },

    /* ---- fixed-timestep simulation --------------------------------------- */
    step(realDt) {
      const fixed = AB.TUNING.fixedStep;
      this._accum += Math.min(realDt, fixed * AB.TUNING.maxSubSteps);
      let steps = 0;
      while (this._accum >= fixed && steps < AB.TUNING.maxSubSteps) {
        this._tick(fixed);
        this._accum -= fixed;
        steps++;
      }
      this._updateParticles(realDt / fixed);
    },

    _tick(dt) {
      // Buoyancy (balloons float up)
      for (const t of this.tracks) {
        if (t.ref && t.ref.buoyancy && t.ref.alive && !t.body.isStatic) {
          M.Body.applyForce(t.body, t.body.position, { x: 0, y: -t.ref.buoyancy * t.body.mass });
        }
      }
      M.Engine.update(this.engine, dt);

      // TTL / out-of-bounds cleanup
      const minY = this.bounds.groundY + 800;
      for (let i = this.tracks.length - 1; i >= 0; i--) {
        const t = this.tracks[i];
        if (!t.ref) continue;
        if (t.ref.ttl != null) {
          t.ref.ttl -= dt;
          if (t.ref.ttl <= 0) {
            if (t.ref.onExpire) t.ref.onExpire(t);
            t.ref.alive = false; this.remove(t); continue;
          }
        }
        const p = t.body.position;
        if (p.y > minY || p.x < this.bounds.left - AB.TUNING.outOfBoundsMargin || p.x > this.bounds.right + AB.TUNING.outOfBoundsMargin) {
          if (t.ref.kind === 'pig') this.killPig(t);
          else if (t.ref.kind === 'block' || t.ref.kind === 'debris' || t.ref.kind === 'egg' || t.ref.kind === 'projectile') { t.ref.alive = false; this.remove(t); }
          else if (t.ref.kind === 'bird') { t.ref.alive = false; this.remove(t); this.emit('birdLost', { track: t }); }
        }
      }
    },

    _updateParticles(scale) {
      scale = scale || 1;
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * scale; p.y += p.vy * scale; p.vy += 0.12 * scale;
        p.life -= scale;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
    },

    clear() {
      if (this.world) M.Composite.clear(this.world, false);
      if (this.engine) M.Engine.clear(this.engine);
      this.tracks = []; this.byBody = new Map(); this.particles = [];
      this.groundBody = null; this.engine = null; this.world = null;
    }
  };

  // Wrap a foreign matter body (ground/wall) so impact handlers can read a kind.
  function wrapForeign(body) {
    return { body, ref: { kind: body.label || 'world', alive: true, foreign: true } };
  }

})(typeof window !== 'undefined' ? window : globalThis);
