/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — RENDERER
 * -----------------------------------------------------------------------------
 * Owns the canvas. Draws the sky (screen space), then everything else under the
 * camera transform (world space): ground, slingshot + band, trajectory guide,
 * every entity, and particles. Editor overlays (grid, selection) are layered on
 * top by the editor.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};

  const Renderer = AB.Renderer = {
    canvas: null, ctx: null,
    bg: null,
    slingshot: null,        // { x, y }
    currentBird: null,      // track being aimed
    bandActive: false,
    trajectory: [],
    showGrid: false,
    gridSize: 40,
    _stars: null,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      return this;
    },

    resize() {
      const parent = this.canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cssW = parent.clientWidth || 800;
      this.cssH = parent.clientHeight || 600;
      this.canvas.width = this.cssW * dpr;      // backing store (device px)
      this.canvas.height = this.cssH * dpr;
      this.canvas.style.width = this.cssW + 'px';   // CSS layout size
      this.canvas.style.height = this.cssH + 'px';
      this._dpr = dpr;
    },

    setBackground(id) { this.bg = AB.background(id) || AB.background('sky'); this._stars = null; },
    setSlingshot(x, y) { this.slingshot = { x, y }; },

    render() {
      const ctx = this.ctx, dpr = this._dpr || 1;
      const cw = this.cssW || (this.canvas.width / dpr), ch = this.cssH || (this.canvas.height / dpr);
      // Base transform: 1 unit = 1 CSS px (device pixels handled by dpr scale).
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      this._drawSky(ctx, cw, ch);

      ctx.save();
      AB.Camera.applyTransform(ctx);

      this._drawGround(ctx);
      if (this.showGrid) this._drawGrid(ctx);
      if (this.slingshot) this._drawSlingshotBack(ctx);
      this._drawTrajectory(ctx);

      // entities
      const tracks = AB.Physics.tracks;
      for (const t of tracks) { if (t.ref && t.ref.alive && t.body) AB.Entities.draw(ctx, t); }

      if (this.slingshot) this._drawSlingshotFront(ctx);
      this._drawParticles(ctx);

      ctx.restore();
    },

    /* ---- sky (screen space, slight parallax) ------------------------------ */
    _drawSky(ctx, cw, ch) {
      const bg = this.bg || AB.background('sky');
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, bg.top); grad.addColorStop(0.75, bg.bottom);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch);

      const cam = AB.Camera;
      if (bg.stars) {
        if (!this._stars) { this._stars = []; for (let i = 0; i < 90; i++) this._stars.push({ x: Math.random() * cw, y: Math.random() * ch * 0.8, r: Math.random() * 1.6 + 0.3 }); }
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (const s of this._stars) { const px = (s.x - cam.centerX() * 0.08) % cw; ctx.beginPath(); ctx.arc((px + cw) % cw, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
      }
      if (bg.clouds) {
        ctx.fillStyle = bg.cloud || 'rgba(255,255,255,0.8)';
        const off = -cam.centerX() * 0.2;
        for (let i = 0; i < 7; i++) {
          const cx = mod(i * 320 + off, cw + 400) - 200;
          const cy = 40 + i * 34 + Math.sin(i * 1.7) * 24;
          cloud(ctx, cx, cy, 1);
        }
      }
    },

    /* ---- ground (world space) --------------------------------------------- */
    _drawGround(ctx) {
      const bg = this.bg || AB.background('sky');
      const b = AB.Physics.bounds;
      const view = AB.Camera.viewRect();
      const left = Math.min(b.left, view.left) - 400, right = Math.max(b.right, view.right) + 400;
      const gy = b.groundY, depth = (view.bottom - gy) + 400;
      const grad = ctx.createLinearGradient(0, gy, 0, gy + 120);
      grad.addColorStop(0, bg.groundTop); grad.addColorStop(1, bg.groundBottom);
      ctx.fillStyle = grad; ctx.fillRect(left, gy, right - left, Math.max(200, depth));
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2 / AB.Camera.zoom;
      ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(right, gy); ctx.stroke();
    },

    _drawGrid(ctx) {
      const view = AB.Camera.viewRect(), g = this.gridSize;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1 / AB.Camera.zoom;
      for (let x = Math.floor(view.left / g) * g; x < view.right; x += g) { ctx.beginPath(); ctx.moveTo(x, view.top); ctx.lineTo(x, view.bottom); ctx.stroke(); }
      for (let y = Math.floor(view.top / g) * g; y < view.bottom; y += g) { ctx.beginPath(); ctx.moveTo(view.left, y); ctx.lineTo(view.right, y); ctx.stroke(); }
      // origin + ground markers
      ctx.strokeStyle = 'rgba(255,80,80,0.3)'; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(view.left, AB.Physics.bounds.groundY); ctx.lineTo(view.right, AB.Physics.bounds.groundY); ctx.stroke();
      ctx.setLineDash([]);
    },

    /* ---- slingshot -------------------------------------------------------- */
    _drawSlingshotBack(ctx) {
      const s = this.slingshot;
      ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y + 44); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 15, s.y - 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 15, s.y - 26); ctx.stroke();
      // back band
      const bird = this.currentBird;
      if (this.bandActive && bird && bird.body) {
        ctx.strokeStyle = '#2b1a12'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(s.x + 15, s.y - 26); ctx.lineTo(bird.body.position.x, bird.body.position.y); ctx.stroke();
      }
    },
    _drawSlingshotFront(ctx) {
      const s = this.slingshot, bird = this.currentBird;
      if (this.bandActive && bird && bird.body) {
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x - 15, s.y - 26); ctx.lineTo(bird.body.position.x, bird.body.position.y); ctx.stroke();
      }
    },

    _drawTrajectory(ctx) {
      if (!this.trajectory.length) return;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < this.trajectory.length; i++) {
        const p = this.trajectory[i];
        const r = 2.2 + (i / this.trajectory.length) * 1.6;
        ctx.globalAlpha = 0.75 - (i / this.trajectory.length) * 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    _drawParticles(ctx) {
      for (const p of AB.Physics.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };

  function cloud(ctx, x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, Math.PI * 2); ctx.arc(x + 26 * s, y - 10 * s, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y, 26 * s, 0, Math.PI * 2); ctx.arc(x + 26 * s, y + 6 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  function mod(a, n) { return ((a % n) + n) % n; }

})(typeof window !== 'undefined' ? window : globalThis);
