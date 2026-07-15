/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — CAMERA
 * -----------------------------------------------------------------------------
 * A center + zoom camera with smooth follow, scripted tweens, cutscene
 * sequences, and shake. The renderer applies its transform; scripts drive it:
 *     ctx.camera.focus(x, y, zoom, ms)         // smooth move to a point
 *     ctx.camera.follow(track)                 // trail a body
 *     ctx.camera.shake(intensity, ms)
 *     ctx.camera.cutscene([ {x,y,zoom,ms,hold}, ... ], onDone)
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};

  const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const Camera = AB.Camera = {
    canvas: null,
    x: 0, y: 0, zoom: 1,             // current center (world) + zoom
    tx: 0, ty: 0, tz: 1,            // smoothing targets (follow/free mode)
    smooth: 0.12,
    mode: 'free',                   // 'free' | 'follow' | 'tween'
    followTrack: null,
    tween: null,
    queue: [],
    shakeAmp: 0, shakeTime: 0, _shakeX: 0, _shakeY: 0,
    bounds: null,                   // { minX,maxX,minY,maxY } optional clamp

    attach(canvas) { this.canvas = canvas; return this; },

    reset(x, y, zoom) {
      this.x = this.tx = x || 0;
      this.y = this.ty = y || 0;
      this.zoom = this.tz = zoom || 1;
      this.mode = 'free'; this.followTrack = null; this.tween = null; this.queue = [];
      this.shakeAmp = 0; this.shakeTime = 0;
    },

    setBounds(b) { this.bounds = b; },

    /* ---- scripted controls ------------------------------------------------ */
    focus(x, y, zoom, ms) {
      this.mode = 'tween';
      this.tween = { fromX: this.x, fromY: this.y, fromZ: this.zoom, toX: x, toY: y, toZ: zoom || this.zoom, t: 0, dur: Math.max(1, ms || 800), onDone: null };
      return this;
    },

    follow(track, zoom) {
      this.mode = 'follow'; this.followTrack = track;
      if (zoom) this.tz = zoom;
      return this;
    },

    free(zoom) { this.mode = 'free'; this.followTrack = null; if (zoom) this.tz = zoom; return this; },

    panTo(x, y, ms) { return this.focus(x, y, this.zoom, ms); },
    zoomTo(z, ms) { return this.focus(this.x, this.y, z, ms); },

    cutscene(frames, onDone) {
      this.queue = (frames || []).slice();
      this._cutsceneDone = onDone || null;
      this._playNextFrame();
      return this;
    },

    _playNextFrame() {
      if (!this.queue.length) {
        this.mode = 'follow';
        const cb = this._cutsceneDone; this._cutsceneDone = null;
        if (cb) try { cb(); } catch (e) { console.error(e); }
        return;
      }
      const f = this.queue.shift();
      this.mode = 'tween';
      this.tween = {
        fromX: this.x, fromY: this.y, fromZ: this.zoom,
        toX: f.x != null ? f.x : this.x, toY: f.y != null ? f.y : this.y, toZ: f.zoom || this.zoom,
        t: 0, dur: Math.max(1, f.ms || 900), hold: f.hold || 0,
        onDone: () => this._playNextFrame()
      };
    },

    shake(intensity, ms) { this.shakeAmp = Math.max(this.shakeAmp, intensity || 6); this.shakeTime = Math.max(this.shakeTime, ms || 300); return this; },

    /* ---- per-frame update ------------------------------------------------- */
    update(dt) {
      if (this.mode === 'tween' && this.tween) {
        const tw = this.tween;
        tw.t += dt;
        let k = Math.min(1, tw.t / tw.dur);
        const e = easeInOut(k);
        this.x = AB.util.lerp(tw.fromX, tw.toX, e);
        this.y = AB.util.lerp(tw.fromY, tw.toY, e);
        this.zoom = AB.util.lerp(tw.fromZ, tw.toZ, e);
        if (k >= 1) {
          if (tw.hold && tw.hold > 0) { tw.dur += tw.hold; tw.hold = 0; }  // dwell
          else { this.tx = this.x; this.ty = this.y; this.tz = this.zoom; const d = tw.onDone; this.tween = null; if (d) d(); else this.mode = 'follow'; }
        }
      } else {
        if (this.mode === 'follow' && this.followTrack && this.followTrack.ref && this.followTrack.ref.alive && this.followTrack.body) {
          this.tx = this.followTrack.body.position.x;
          this.ty = this.followTrack.body.position.y;
        }
        this.x += (this.tx - this.x) * this.smooth;
        this.y += (this.ty - this.y) * this.smooth;
        this.zoom += (this.tz - this.zoom) * this.smooth;
      }

      // shake
      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        const damp = Math.max(0, this.shakeTime) / 300;
        this._shakeX = (Math.random() - 0.5) * this.shakeAmp * 2 * Math.min(1, damp + 0.2);
        this._shakeY = (Math.random() - 0.5) * this.shakeAmp * 2 * Math.min(1, damp + 0.2);
        if (this.shakeTime <= 0) { this.shakeAmp = 0; this._shakeX = this._shakeY = 0; }
      }

      if (this.bounds) {
        this.x = AB.util.clamp(this.x, this.bounds.minX, this.bounds.maxX);
        this.y = AB.util.clamp(this.y, this.bounds.minY, this.bounds.maxY);
      }
    },

    // Effective center including shake — used by the renderer transform.
    centerX() { return this.x + this._shakeX; },
    centerY() { return this.y + this._shakeY; },

    /* ---- transforms (all in CSS pixels; the renderer applies the dpr base) -- */
    _w() { return this.canvas.clientWidth || (AB.Renderer && AB.Renderer.cssW) || this.canvas.width; },
    _h() { return this.canvas.clientHeight || (AB.Renderer && AB.Renderer.cssH) || this.canvas.height; },

    applyTransform(ctx) {
      ctx.translate(this._w() / 2, this._h() / 2);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.centerX(), -this.centerY());
    },

    screenToWorld(sx, sy) {
      const rect = this.canvas.getBoundingClientRect();
      const px = sx - rect.left, py = sy - rect.top;
      return {
        x: this.centerX() + (px - this._w() / 2) / this.zoom,
        y: this.centerY() + (py - this._h() / 2) / this.zoom
      };
    },

    worldToScreen(wx, wy) {
      return {
        x: (wx - this.centerX()) * this.zoom + this._w() / 2,
        y: (wy - this.centerY()) * this.zoom + this._h() / 2
      };
    },

    // Visible world rectangle (for culling / background).
    viewRect() {
      const hw = this._w() / 2 / this.zoom, hh = this._h() / 2 / this.zoom;
      return { left: this.centerX() - hw, right: this.centerX() + hw, top: this.centerY() - hh, bottom: this.centerY() + hh };
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
