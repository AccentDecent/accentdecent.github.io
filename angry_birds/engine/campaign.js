/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — CAMPAIGN RUNTIME
 * -----------------------------------------------------------------------------
 * Turns a "game" bundle (custom defs + many levels + story) into a playable
 * campaign: story cards between levels, star tracking, level select, and
 * progress saved to localStorage. This is the layer that lets the editor output
 * a whole Angry-Birds-style game with a story (prompt requirement).
 *
 * It owns the between-level overlay DOM (built into a mount element) but leaves
 * the in-level HUD to the host page via the `hud` adapter.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};

  const Campaign = AB.Campaign = {
    game: null,
    index: 0,
    hud: {},
    mount: null,
    overlay: null,
    progress: null,
    onExit: null,

    start(game, opts) {
      opts = opts || {};
      this.game = AB.loadGame(game);
      this.hud = opts.hud || {};
      this.onExit = opts.onExit || null;
      this.mount = opts.mount || document.body;
      this._buildOverlay();
      AB.Assets.clear();
      AB.Assets.loadTable(this.game.textures);
      this.progress = this._loadProgress();

      const startAt = (this.game.settings && this.game.settings.startLevel) || 0;
      if (this.game.story && this.game.story.intro) {
        this.showCard({
          title: this.game.title,
          text: this.game.story.intro,
          button: 'Start',
          onNext: () => this._begin(startAt)
        });
      } else {
        this._begin(startAt);
      }
      return this;
    },

    _begin(i) {
      if (this.game.settings && this.game.settings.allowLevelSelect && this.game.levels.length > 1) this.showLevelSelect();
      else this.startLevel(i);
    },

    /* ---- level flow ------------------------------------------------------- */
    startLevel(i) {
      this.index = i;
      const level = this.game.levels[i];
      if (!level) { this.gameComplete(); return; }
      this.hideOverlay();
      const play = () => {
        AB.Game.init(AB.util.clone(level), {
          hud: this.hud,
          onComplete: (res) => this.levelComplete(res)
        });
        if (this.hud.setLevelName) this.hud.setLevelName(level.name, i + 1, this.game.levels.length);
      };
      if (level.intro) this.showCard({ title: level.name, text: level.intro, button: 'Play', onNext: play });
      else play();
    },

    levelComplete(res) {
      // record best score/stars
      const rec = this.progress.levels[this.index] || { score: 0, stars: 0, cleared: false };
      if (res.victory) {
        rec.cleared = true;
        rec.score = Math.max(rec.score, res.score);
        rec.stars = Math.max(rec.stars, res.stars);
        this.progress.unlocked = Math.max(this.progress.unlocked, this.index + 1);
      }
      this.progress.levels[this.index] = rec;
      this._saveProgress();

      const level = this.game.levels[this.index];
      const isLast = this.index >= this.game.levels.length - 1;
      const showAfter = () => {
        this.showResult(res, {
          onNext: res.victory && !isLast ? () => this.startLevel(this.index + 1)
                 : res.victory && isLast ? () => this.gameComplete() : null,
          onRetry: () => this.startLevel(this.index),
          onMenu: () => this.showLevelSelect()
        });
      };
      if (res.victory && level.outro) this.showCard({ title: 'Cleared!', text: level.outro, button: 'Continue', onNext: showAfter });
      else showAfter();
    },

    gameComplete() {
      const totalStars = Object.values(this.progress.levels).reduce((a, r) => a + (r.stars || 0), 0);
      const maxStars = this.game.levels.length * 3;
      this.showCard({
        title: '🏆 ' + this.game.title + ' — Complete!',
        text: (this.game.story && this.game.story.outro ? this.game.story.outro + '\n\n' : '') +
              'You earned ' + totalStars + ' / ' + maxStars + ' stars.',
        button: 'Level Select',
        onNext: () => this.showLevelSelect()
      });
    },

    /* ---- overlay screens -------------------------------------------------- */
    _buildOverlay() {
      if (this.overlay) return;
      const o = this.overlay = document.createElement('div');
      o.className = 'ab-overlay hidden';
      this.mount.appendChild(o);
    },
    hideOverlay() { if (this.overlay) this.overlay.classList.add('hidden'); },
    showOverlay(html) { this.overlay.innerHTML = html; this.overlay.classList.remove('hidden'); },

    showCard({ title, text, button, onNext }) {
      this.showOverlay(
        `<div class="ab-card">
           <h1>${esc(title)}</h1>
           <p class="ab-story">${esc(text).replace(/\n/g, '<br>')}</p>
           <div class="ab-actions"><button class="ab-btn primary" data-a="next">${esc(button || 'Continue')}</button></div>
         </div>`);
      this.overlay.querySelector('[data-a="next"]').onclick = () => { this.hideOverlay(); onNext && onNext(); };
    },

    showResult(res, actions) {
      const starHtml = [0, 1, 2].map(i => `<span class="ab-star ${i < res.stars ? 'on' : ''}">★</span>`).join('');
      const buttons = [];
      if (res.victory) buttons.push(`<button class="ab-btn" data-a="retry">↺ Replay</button>`);
      else buttons.push(`<button class="ab-btn primary" data-a="retry">↺ Retry</button>`);
      buttons.push(`<button class="ab-btn" data-a="menu">☰ Levels</button>`);
      if (actions.onNext) buttons.push(`<button class="ab-btn primary" data-a="next">Next ▶</button>`);
      this.showOverlay(
        `<div class="ab-card result ${res.victory ? 'win' : 'lose'}">
           <h1>${res.victory ? 'Level Complete!' : 'Level Failed'}</h1>
           <div class="ab-stars">${res.victory ? starHtml : ''}</div>
           <p class="ab-score">Score: <b>${res.score.toLocaleString()}</b></p>
           <div class="ab-actions">${buttons.join('')}</div>
         </div>`);
      const q = (a) => this.overlay.querySelector(`[data-a="${a}"]`);
      if (q('next')) q('next').onclick = () => { this.hideOverlay(); actions.onNext(); };
      q('retry').onclick = () => { this.hideOverlay(); actions.onRetry(); };
      q('menu').onclick = () => actions.onMenu();
    },

    showLevelSelect() {
      AB.Game.stop();
      const cells = this.game.levels.map((lvl, i) => {
        const rec = this.progress.levels[i] || {};
        const unlocked = i <= this.progress.unlocked;
        const stars = [0, 1, 2].map(s => `<span class="ab-star sm ${s < (rec.stars || 0) ? 'on' : ''}">★</span>`).join('');
        return `<button class="ab-level-cell ${unlocked ? '' : 'locked'}" data-i="${i}" ${unlocked ? '' : 'disabled'}>
                  <span class="num">${i + 1}</span>
                  <span class="nm">${esc(lvl.name)}</span>
                  <span class="st">${unlocked ? stars : '🔒'}</span>
                </button>`;
      }).join('');
      this.showOverlay(
        `<div class="ab-card wide">
           <h1>${esc(this.game.title)}</h1>
           ${this.game.description ? `<p class="ab-story">${esc(this.game.description)}</p>` : ''}
           <div class="ab-level-grid">${cells}</div>
           ${this.onExit ? `<div class="ab-actions"><button class="ab-btn" data-a="exit">Exit</button></div>` : ''}
         </div>`);
      this.overlay.querySelectorAll('.ab-level-cell').forEach(el => {
        if (el.disabled) return;
        el.onclick = () => { this.hideOverlay(); this.startLevel(parseInt(el.dataset.i, 10)); };
      });
      const ex = this.overlay.querySelector('[data-a="exit"]'); if (ex) ex.onclick = () => this.onExit();
    },

    /* ---- persistence ------------------------------------------------------ */
    _key() { return 'ab_progress_' + (this.game.id || slug(this.game.title || 'game')); },
    _loadProgress() {
      try { const raw = localStorage.getItem(this._key()); if (raw) return JSON.parse(raw); } catch (e) {}
      return { levels: {}, unlocked: 0 };
    },
    _saveProgress() { try { localStorage.setItem(this._key(), JSON.stringify(this.progress)); } catch (e) {} },
    resetProgress() { this.progress = { levels: {}, unlocked: 0 }; this._saveProgress(); }
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

})(typeof window !== 'undefined' ? window : globalThis);
