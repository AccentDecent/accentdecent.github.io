/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — ASSET MANAGER
 * -----------------------------------------------------------------------------
 * Loads and caches images used to override the default vector art. Textures are
 * referenced by a KEY. A key resolves to a source in this priority order:
 *   1. per-entity `texture` field on a placed block/bird/etc.
 *   2. the definition's default `texture`
 *   3. game.textures[key]  (the game-wide texture table)
 * A source is either a URL ("assets/textures/wood.png") or an embedded data URI
 * ("data:image/png;base64,....") so games stay fully self-contained & static.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};

  AB.Assets = {
    images: {},          // key -> { img, ready, error, src }
    table: {},           // game-wide key -> src map (from game.textures)
    _pending: 0,

    // Install the game-wide texture table and begin loading everything in it.
    loadTable(table) {
      this.table = Object.assign({}, table || {});
      for (const [key, src] of Object.entries(this.table)) this.load(key, src);
      return this.whenReady();
    },

    // Load a single image under a key. Safe to call repeatedly.
    load(key, src) {
      if (!src) return;
      const existing = this.images[key];
      if (existing && existing.src === src) return existing;

      const entry = { img: new Image(), ready: false, error: false, src };
      this.images[key] = entry;
      this._pending++;

      // Cross-origin friendliness for remote textures (ignored for data URIs).
      if (/^https?:/i.test(src)) entry.img.crossOrigin = 'anonymous';

      entry.img.onload = () => { entry.ready = true; this._pending--; };
      entry.img.onerror = () => {
        entry.error = true; this._pending--;
        console.warn('[AB.Assets] failed to load texture "' + key + '" from', src);
      };
      entry.img.src = src;
      return entry;
    },

    // Return a drawable HTMLImageElement for a key, or null if not ready/absent.
    get(key) {
      if (!key) return null;
      let entry = this.images[key];
      if (!entry && this.table[key]) entry = this.load(key, this.table[key]);
      return entry && entry.ready && !entry.error ? entry.img : null;
    },

    has(key) { return !!(this.images[key] || this.table[key]); },

    // Resolve the best texture image for an entity given its optional per-entity
    // texture key/src, its definition, and a fallback key (e.g. the type id).
    resolve(entityTexture, def, fallbackKey) {
      // 1. explicit per-entity texture (key or inline data URI / url)
      if (entityTexture) {
        if (this.table[entityTexture] || this.images[entityTexture]) return this.get(entityTexture);
        if (/^(data:|https?:|\.?\/)/.test(entityTexture)) {           // looks like a src
          const k = '__inline_' + hashStr(entityTexture);
          if (!this.images[k]) this.load(k, entityTexture);
          return this.get(k);
        }
      }
      // 2. definition default texture
      if (def && def.texture) return this.get(def.texture);
      // 3. game-wide table keyed by type id
      if (fallbackKey && this.has(fallbackKey)) return this.get(fallbackKey);
      return null;
    },

    whenReady() {
      return new Promise((resolve) => {
        const check = () => { if (this._pending <= 0) resolve(); else setTimeout(check, 30); };
        check();
      });
    },

    clear() { this.images = {}; this.table = {}; this._pending = 0; }
  };

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return (h >>> 0).toString(36);
  }

})(typeof window !== 'undefined' ? window : globalThis);
