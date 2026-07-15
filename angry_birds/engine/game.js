/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — GAME RUNTIME (single level)
 * -----------------------------------------------------------------------------
 * Loads one level, runs the slingshot + combat + win/lose loop, dispatches
 * script hooks, and drives the camera. The host page supplies a small HUD
 * adapter (attachHUD) and an onComplete callback; the campaign runner uses those
 * to chain levels. The editor reuses init() with { editor:true } for test play.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};
  const M = root.Matter;

  const Game = AB.Game = {
    level: null,
    state: 'idle',            // idle|aiming|flying|between|won|lost
    score: 0,
    time: 0,
    birdQueue: [],            // remaining bird specs
    currentBird: null,
    birdsUsed: 0,
    birdsTotal: 0,
    runner: null,             // script hook runner
    slingshot: { x: 180, y: 430 },
    editor: false,
    _raf: null, _last: 0,
    _drag: false, _restTimer: 0, _betweenTimer: 0,
    hud: {},                  // { setScore, setBirds, message, showResult, setState }
    onComplete: null,

    attachHUD(h) { this.hud = Object.assign({}, this.hud, h); return this; },

    /* ----------------------------------------------------------------------- */
    init(level, opts) {
      opts = opts || {};
      this.stop();
      this._sourceLevel = AB.util.clone(level);
      this.level = AB.normalizeLevel(level);
      this.editor = !!opts.editor;
      this.onComplete = opts.onComplete || null;
      if (opts.hud) this.hud = Object.assign({}, this.hud, opts.hud);

      this.state = 'aiming';
      this.score = 0; this.time = 0; this.birdsUsed = 0;
      this._restTimer = 0; this._betweenTimer = 0; this._drag = false;
      this.slingshot = Object.assign({ x: 180, y: 430 }, this.level.slingshot);

      // physics
      AB.Physics.init({ gravity: this.level.gravity });
      AB.Physics.setupWorld(this.level.world);
      AB.Boss.reset();
      this._wirePhysics();

      // camera + renderer
      AB.Camera.attach(AB.Renderer.canvas);
      const start = this.level.camera.start || { x: this.slingshot.x + 250, y: this.slingshot.y - 40 };
      AB.Camera.reset(start.x, start.y, this.level.camera.zoom || 1);
      AB.Renderer.setBackground(this.level.background);
      AB.Renderer.setSlingshot(this.slingshot.x, this.slingshot.y);
      AB.Renderer.currentBird = null; AB.Renderer.bandActive = false; AB.Renderer.trajectory = [];
      AB.Renderer.showGrid = false;

      // entities
      this._buildEntities();

      // scripts
      const globals = (AB.currentGame && AB.currentGame.globalScripts) || [];
      this.runner = AB.Scripting.buildRunner([globals, this.level.scripts]);

      // bird queue
      this.birdQueue = this.level.birds.slice();
      this.birdsTotal = this.birdQueue.length;
      this.loadNextBird();

      this._updateHud();
      this.runner.run('onLevelStart', { level: this.level });

      // start loop
      this._last = performance.now();
      this._loop();
      return this;
    },

    _wirePhysics() {
      AB.Physics.onScore = (points, x, y) => { if (points) this.addScore(points); };
      AB.Physics.onImpact = (a, b, impact, relSpeed) => this._onImpact(a, b, impact, relSpeed);
      AB.Physics.on('blockDestroyed', (e) => this.runner && this.runner.run('onBlockDestroyed', e));
      AB.Physics.on('pigKilled', (e) => this.runner && this.runner.run('onPigKilled', e));
      AB.Physics.on('bossKilled', (e) => this.runner && this.runner.run('onBossKilled', e));
      AB.Physics.on('explosion', (e) => this.runner && this.runner.run('onExplosion', e));
      AB.Physics.on('bossPhaseChange', (e) => { AB.Boss.notifyPhaseChange(e.track, e.phaseIndex, e.phase); if (this.runner) this.runner.run('onBossPhaseChange', e); });
      AB.Physics.on('birdLost', (e) => { if (this.runner) this.runner.run('onBirdLost', e); });
    },

    _buildEntities() {
      for (const p of this.level.props || []) { const t = AB.Physics.createBlock(p); if (t) M.Body.setStatic(t.body, true); }
      for (const b of this.level.blocks) AB.Physics.createBlock(b);
      for (const p of this.level.pigs) AB.Physics.createPig(p);
      for (const b of this.level.bosses) {
        const t = AB.Physics.createBoss(b);
        if (t) { if (b.script) t.ref.def = Object.assign({}, t.ref.def, { onUpdate: b.script }); AB.Boss.add(t); this.runner && this.runner.run('onBossSpawn', { track: t }); }
      }
    },

    /* ---- bird queue ------------------------------------------------------- */
    loadNextBird() {
      if (this.birdQueue.length === 0) { this.currentBird = null; AB.Renderer.currentBird = null; return false; }
      const spec = this.birdQueue.shift();
      const s = Object.assign({}, spec, { x: this.slingshot.x, y: this.slingshot.y });
      const track = AB.Physics.createBird(s);
      M.Body.setStatic(track.body, true);
      this.currentBird = track;
      AB.Renderer.currentBird = track;
      AB.Renderer.bandActive = false;
      this.state = 'aiming';
      AB.Camera.focus(this.slingshot.x + 220, this.slingshot.y - 40, this.level.camera.zoom || 1, 700);
      this._updateHud();
      return true;
    },

    /* ---- input ------------------------------------------------------------ */
    pointerDown(sx, sy) {
      if (this.editor && AB.Editor && AB.Editor.enabled) return;
      if (this.state !== 'aiming' || !this.currentBird) return;
      const w = AB.Camera.screenToWorld(sx, sy);
      const b = this.currentBird.body.position;
      if (AB.util.dist(w.x, w.y, b.x, b.y) < this.currentBird.ref.radius + 40) {
        this._drag = true; AB.Renderer.bandActive = true;
      }
    },

    pointerMove(sx, sy) {
      if (!this._drag || !this.currentBird) return;
      const w = AB.Camera.screenToWorld(sx, sy);
      const ax = this.slingshot.x, ay = this.slingshot.y;
      let dx = w.x - ax, dy = w.y - ay;
      const d = Math.hypot(dx, dy);
      const max = AB.TUNING.maxDragDistance;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      M.Body.setPosition(this.currentBird.body, { x: ax + dx, y: ay + dy });
      this._updateTrajectory(-dx * AB.TUNING.launchPower, -dy * AB.TUNING.launchPower);
    },

    pointerUp() {
      if (!this._drag || !this.currentBird) { return; }
      this._drag = false; AB.Renderer.bandActive = false; AB.Renderer.trajectory = [];
      const b = this.currentBird.body.position;
      const vx = (this.slingshot.x - b.x) * AB.TUNING.launchPower;
      const vy = (this.slingshot.y - b.y) * AB.TUNING.launchPower;
      if (Math.hypot(vx, vy) < 0.6) return;         // too small a pull — ignore
      AB.Physics.launch(this.currentBird, vx, vy);
      this.state = 'flying'; this._restTimer = 0;
      AB.Camera.follow(this.currentBird, this.level.camera.zoom || 1);
      this.runner.run('onBirdLaunch', { track: this.currentBird });
      this.birdsUsed++;
      this._updateHud();
    },

    activateAbility() {
      if (this.state !== 'flying' || !this.currentBird || !this.currentBird.ref.alive) return;
      AB.Abilities.activate(this.currentBird);
    },

    _updateTrajectory(vx, vy) {
      const g = this.level.gravity.y * AB.TUNING.gravityScale * AB.TUNING.fixedStep * AB.TUNING.fixedStep;
      const pts = []; let x = this.currentBird.body.position.x, y = this.currentBird.body.position.y;
      for (let i = 0; i < 60; i++) {
        x += vx; y += vy; vy += g; vx *= 0.995; vy *= 0.995;
        if (i % 2 === 0) pts.push({ x, y });
        if (y > AB.Physics.bounds.groundY) break;
      }
      AB.Renderer.trajectory = pts;
    },

    /* ---- combat impact routing ------------------------------------------- */
    _onImpact(a, b, impact, relSpeed) {
      if (impact < AB.TUNING.minImpact) return;
      const T = AB.TUNING;
      const handle = (x, y) => {
        if (!x.ref || !y.ref || !x.ref.alive) return;
        if (x.ref.kind === 'bird') {
          if (y.ref.kind === 'block') AB.Physics.damageBlock(y, impact * T.dmgBirdToBlock);
          else if (y.ref.kind === 'pig') AB.Physics.damagePig(y, impact * T.dmgBirdToPig);
          else if (y.ref.kind === 'boss') AB.Physics.damageBoss(y, impact * T.dmgBirdToBoss);
          if (x.ref.ability === 'explode' && !x.ref.abilityUsed && relSpeed > 9) AB.Abilities.activate(x);
        } else if (x.ref.kind === 'block') {
          if (y.ref.kind === 'pig') AB.Physics.damagePig(y, impact * T.dmgBlockToPig);
          else if (y.ref.kind === 'block') AB.Physics.damageBlock(y, impact * T.dmgBlockToBlock);
          else if (y.ref.kind === 'boss') AB.Physics.damageBoss(y, impact * T.dmgBlockToBlock);
        } else if (x.ref.kind === 'egg' && x.ref.explodeOnHit && (y.ref.kind === 'block' || y.ref.kind === 'pig' || y.ref.kind === 'boss' || y.ref.kind === 'ground')) {
          AB.Physics.explode(x.body.position.x, x.body.position.y, x.ref.explodeOnHit.radius, x.ref.explodeOnHit.force);
          x.ref.alive = false; AB.Physics.remove(x);
        } else if (x.ref.kind === 'projectile' && (y.ref.kind === 'ground' || y.ref.kind === 'block' || y.ref.kind === 'bird')) {
          if (y.ref.kind === 'bird') AB.Camera.shake(4, 200);
          AB.Physics.spawnBurst(x.body.position.x, x.body.position.y, x.ref.color || '#888', 5, 3);
          x.ref.alive = false; AB.Physics.remove(x);
        }
      };
      handle(a, b); handle(b, a);
    },

    /* ---- main loop -------------------------------------------------------- */
    _loop() {
      const now = performance.now();
      let dt = now - this._last; this._last = now;
      if (dt > 60) dt = 60;
      this.time += dt;

      if (!this.editor || (AB.Editor && !AB.Editor.enabled)) {
        AB.Physics.step(dt);
        AB.Boss.update(dt);
        if (this.runner) this.runner.run('onUpdate', null, dt);
        this._updateTurn(dt);
      }
      AB.Camera.update(dt);
      AB.Renderer.render();

      this._raf = requestAnimationFrame(() => this._loop());
    },

    _updateTurn(dt) {
      if (this.state === 'flying') {
        const bird = this.currentBird;
        const gone = !bird || !bird.ref.alive;
        if (gone) { this._restTimer += dt; if (this._restTimer > 700) this.endTurn(); return; }
        const v = Math.hypot(bird.body.velocity.x, bird.body.velocity.y);
        if (v < 0.7) { this._restTimer += dt; if (this._restTimer > 1100) this.endTurn(); }
        else this._restTimer = 0;
        // safety: bird stuck flying forever
        if (this.time && bird.ref.launched && bird.body.position.y > AB.Physics.bounds.groundY + 500) this.endTurn();
      } else if (this.state === 'between') {
        this._betweenTimer += dt;
        if (this._betweenTimer > 800) { this._betweenTimer = 0; this._advance(); }
      }
      // continuous win check (blocks/explosions can clear pigs without a bird)
      if ((this.state === 'flying' || this.state === 'between') && this._targetsCleared()) this.endLevel(true);
    },

    endTurn() {
      if (this.state !== 'flying') return;
      this.runner && this.runner.run('onBirdLand', { track: this.currentBird });
      if (this.currentBird && this.currentBird.ref.alive) { this.currentBird.ref.alive = false; AB.Physics.remove(this.currentBird); }
      this.currentBird = null; AB.Renderer.currentBird = null;
      this.state = 'between'; this._betweenTimer = 0; this._restTimer = 0;
      AB.Camera.free();
      this._frameRemaining();
    },

    _frameRemaining() {
      // frame the surviving targets so the player sees the aftermath
      const targets = AB.Physics.byKind('pig').concat(AB.Physics.byKind('boss'));
      if (targets.length) {
        let sx = 0, sy = 0; for (const t of targets) { sx += t.body.position.x; sy += t.body.position.y; }
        AB.Camera.focus(sx / targets.length, sy / targets.length - 30, (this.level.camera.zoom || 1) * 0.92, 700);
      }
    },

    _advance() {
      if (this._targetsCleared()) { this.endLevel(true); return; }
      if (this.birdQueue.length > 0) this.loadNextBird();
      else this.endLevel(false);
    },

    _targetsCleared() { return AB.Physics.byKind('pig').length === 0 && AB.Physics.byKind('boss').length === 0; },

    /* ---- results ---------------------------------------------------------- */
    endLevel(victory) {
      if (this.state === 'won' || this.state === 'lost') return;
      if (victory) {
        // unused-bird bonus
        const bonus = (this.birdQueue.length + (this.currentBird ? 1 : 0)) * AB.TUNING.scoreUnusedBird;
        if (bonus) this.addScore(bonus);
        this.state = 'won';
        this.runner && this.runner.run('onVictory', { score: this.score });
        AB.Camera.shake(4, 200);
      } else {
        this.state = 'lost';
        this.runner && this.runner.run('onDefeat', { score: this.score });
      }
      const stars = this.stars();
      if (this.hud.showResult) this.hud.showResult({ victory, score: this.score, stars, level: this.level });
      if (this.onComplete) this.onComplete({ victory, score: this.score, stars, level: this.level });
    },

    stars() {
      const t = this.level.starThresholds || [10000, 30000, 60000];
      if (this.state === 'lost') return 0;
      return this.score >= t[2] ? 3 : this.score >= t[1] ? 2 : this.score >= t[0] ? 1 : 1;
    },

    addScore(points) {
      this.score += Math.round(points);
      if (this.hud.setScore) this.hud.setScore(this.score);
    },

    message(text, ms) { if (this.hud.message) this.hud.message(text, ms || 2000); },

    _updateHud() {
      if (this.hud.setScore) this.hud.setScore(this.score);
      if (this.hud.setBirds) this.hud.setBirds({ queue: this.birdQueue, current: this.currentBird, total: this.birdsTotal });
      if (this.hud.setState) this.hud.setState(this.state);
    },

    restart() { if (this._sourceLevel) this.init(AB.util.clone(this._sourceLevel), { editor: this.editor, onComplete: this.onComplete, hud: this.hud }); },

    // Alias kept for the player/campaign runner.
    load(level, opts) { return this.init(level, opts); },

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      if (AB.Physics.world) AB.Physics.clear();
      this.state = 'idle';
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
