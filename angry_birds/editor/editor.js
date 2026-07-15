/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — EDITOR
 * -----------------------------------------------------------------------------
 * A full game maker: multiple levels, placement/selection/transform of entities,
 * per-entity + level + game/story settings, custom material & bird creation
 * (with scripted abilities), texture uploads, a script editor, in-editor test
 * play, and export to game.json or a self-contained playable HTML.
 *
 * Source of truth = the working `game` object (normalized). The editor builds
 * Matter bodies from the current level purely for display/hit-testing; the world
 * is never stepped in edit mode, so nothing drifts. Body transforms are flushed
 * back into the level specs on every save/test/level-switch.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB;
  const M = root.Matter;
  const $ = (id) => document.getElementById(id);

  const Editor = AB.Editor = {
    game: null,
    levelIndex: 0,
    enabled: true,
    tool: 'select',              // select | place | delete | pan
    palette: null,               // { kind, id }
    selected: null,              // track
    snap: true, snapSize: 10,
    _raf: null, _last: 0, _fps: 60,
    _drag: null,                 // { track, offX, offY } | { pan:true, ... }
    testing: false,

    /* ----------------------------------------------------------------------- */
    boot() {
      AB.Renderer.init($('editor-canvas'));
      AB.Camera.attach($('editor-canvas'));
      this.game = this._blankGame();
      this._wireUI();
      this._bindCanvas();
      this._bindKeys();
      this.rebuildLevelList();
      this.loadLevel(0);
      this.syncGameUI();
      this._loop();
      this.status('Ready. Pick a block and click the canvas to build.');
    },

    _blankGame() {
      const g = AB.normalizeGame({ title: 'My Angry Birds Game' });
      g.levels = [AB.normalizeLevel({ name: 'Level 1' })];
      return AB.loadGame(g);
    },

    get level() { return this.game.levels[this.levelIndex]; },

    /* =========================================================================
     * LEVEL BUILD / SYNC
     * ======================================================================= */
    loadLevel(i) {
      if (i < 0 || i >= this.game.levels.length) return;
      if (this.enabled && AB.Physics.world) this.flushToSpecs();
      this.levelIndex = i;
      this.selected = null;
      this._buildLevel();
      this.syncLevelUI();
      this.renderProps();
      this.rebuildLevelList();
    },

    _buildLevel() {
      const lvl = this.level;
      AB.Physics.init({ gravity: { x: 0, y: 0 } });   // frozen world (no stepping)
      AB.Physics.setupWorld(lvl.world);
      AB.loadGame(this.game);                          // re-register custom defs
      // build placed entities (static so nothing can move without us)
      for (const b of lvl.blocks) this._spawnSpec('block', b);
      for (const p of lvl.pigs) this._spawnSpec('pig', p);
      for (const b of lvl.bosses) this._spawnSpec('boss', b);
      this._rebuildBirds();
      // camera + renderer
      AB.Renderer.setBackground(lvl.background);
      AB.Renderer.setSlingshot(lvl.slingshot.x, lvl.slingshot.y);
      AB.Renderer.currentBird = null; AB.Renderer.bandActive = false; AB.Renderer.trajectory = [];
      AB.Renderer.showGrid = $('chk-grid') ? $('chk-grid').checked : true;
      const st = lvl.camera.start || { x: lvl.slingshot.x + 250, y: lvl.slingshot.y - 60 };
      AB.Camera.reset(st.x, st.y, lvl.camera.zoom || 1);
      AB.Camera.free();
    },

    _spawnSpec(kind, spec) {
      let t = null;
      if (kind === 'block') t = AB.Physics.createBlock(spec);
      else if (kind === 'pig') t = AB.Physics.createPig(spec);
      else if (kind === 'boss') t = AB.Physics.createBoss(spec);
      if (t) { M.Body.setStatic(t.body, true); t.ref.spec = spec; }
      return t;
    },

    _rebuildBirds() {
      // remove existing bird display tracks, then lay the queue out by the sling
      for (const t of AB.Physics.byKind('bird').slice()) AB.Physics.remove(t);
      const lvl = this.level;
      lvl.birds.forEach((spec, i) => {
        const s = Object.assign({}, spec, { x: lvl.slingshot.x - i * 42, y: lvl.slingshot.y });
        const t = AB.Physics.createBird(s);
        if (t) { M.Body.setStatic(t.body, true); t.ref.spec = spec; t.ref.editorBird = true; t.ref.queueIndex = i; }
      });
    },

    // Write live body transforms back into the level specs.
    flushToSpecs() {
      for (const t of AB.Physics.tracks) {
        const ref = t.ref; if (!ref || !ref.spec) continue;
        if (ref.kind === 'block' || ref.kind === 'pig' || ref.kind === 'boss') {
          ref.spec.x = Math.round(t.body.position.x);
          ref.spec.y = Math.round(t.body.position.y);
          if (ref.kind === 'block') { ref.spec.angle = Math.round(AB.util.rad2deg(t.body.angle)); ref.spec.width = Math.round(ref.width); ref.spec.height = Math.round(ref.height); ref.spec.shape = ref.shape; }
        }
      }
    },

    /* =========================================================================
     * PLACEMENT / SELECTION / TRANSFORM
     * ======================================================================= */
    placeAt(wx, wy) {
      if (!this.palette) return;
      const { kind, id } = this.palette;
      const x = this.snapv(wx), y = this.snapv(wy);
      if (kind === 'block') {
        const def = AB.material(id);
        const spec = { type: id, x, y, shape: def.shape || 'rect', width: (def.size && def.size.w) || 60, height: (def.size && def.size.h) || 20, angle: 0 };
        this.level.blocks.push(spec); this.selected = this._spawnSpec('block', spec);
      } else if (kind === 'pig') {
        const spec = { type: id, x, y }; this.level.pigs.push(spec); this.selected = this._spawnSpec('pig', spec);
      } else if (kind === 'boss') {
        const spec = { type: id, x, y }; this.level.bosses.push(spec); this.selected = this._spawnSpec('boss', spec);
      } else if (kind === 'bird') {
        const spec = { type: id }; this.level.birds.push(spec); this._rebuildBirds();
        this.selected = AB.Physics.byKind('bird').slice(-1)[0] || null;
      }
      this.renderProps();
      this.status('Placed ' + kind + ' "' + id + '".');
    },

    findAt(wx, wy) {
      const bodies = AB.Physics.tracks.map(t => t.body);
      const hits = M.Query.point(bodies, { x: wx, y: wy });
      if (!hits.length) return null;
      const body = hits[hits.length - 1];      // topmost (last drawn)
      return AB.Physics.byBody.get(body.id) || null;
    },

    select(track) { this.selected = track; this.renderProps(); },

    deleteTrack(track) {
      if (!track) return;
      const ref = track.ref;
      const arr = ref.kind === 'block' ? this.level.blocks : ref.kind === 'pig' ? this.level.pigs : ref.kind === 'boss' ? this.level.bosses : this.level.birds;
      const idx = arr.indexOf(ref.spec);
      if (idx >= 0) arr.splice(idx, 1);
      AB.Physics.remove(track);
      if (this.selected === track) this.selected = null;
      if (ref.kind === 'bird') this._rebuildBirds();
      this.renderProps();
      this.status('Deleted ' + ref.kind + '.');
    },

    rebuildSelected() {
      // re-create the selected track from its (edited) spec, preserving selection
      const track = this.selected; if (!track || !track.ref.spec) return;
      const kind = track.ref.kind, spec = track.ref.spec;
      AB.Physics.remove(track);
      if (kind === 'bird') { this._rebuildBirds(); this.selected = AB.Physics.byKind('bird').find(t => t.ref.spec === spec) || null; }
      else this.selected = this._spawnSpec(kind, spec);
      this.renderProps();
    },

    snapv(v) { return this.snap ? Math.round(v / this.snapSize) * this.snapSize : Math.round(v); },

    /* =========================================================================
     * PROPERTIES PANEL (dynamic)
     * ======================================================================= */
    renderProps() {
      const el = $('props'); if (!el) return;
      const t = this.selected;
      if (!t || !t.ref) { el.innerHTML = '<p class="muted">Select an object to edit its properties.</p>'; return; }
      const ref = t.ref; const spec = ref.spec || {};
      let h = `<p class="tag">${ref.kind} · <b>${ref.type}</b></p>`;

      if (ref.kind === 'block') {
        h += sel('Material', 'p-type', AB.Registry.ids('material'), ref.type, (v) => { spec.type = v; const d = AB.material(v); spec.shape = d.shape || 'rect'; if (d.size) { spec.width = d.size.w; spec.height = d.size.h; } this.rebuildSelected(); });
        h += sel('Shape', 'p-shape', ['rect', 'circle', 'triangle', 'triangle_r', 'trapezoid'], ref.shape, (v) => { spec.shape = v; this.rebuildSelected(); });
        h += num('Width', 'p-w', ref.width, 1, (v) => { spec.width = v; this.rebuildSelected(); });
        h += num('Height', 'p-h', ref.height, 1, (v) => { spec.height = v; this.rebuildSelected(); });
        h += num('Angle°', 'p-a', Math.round(AB.util.rad2deg(t.body.angle)), 1, (v) => { spec.angle = v; M.Body.setAngle(t.body, AB.util.deg2rad(v)); });
        h += num('X', 'p-x', Math.round(t.body.position.x), 1, (v) => { spec.x = v; M.Body.setPosition(t.body, { x: v, y: t.body.position.y }); });
        h += num('Y', 'p-y', Math.round(t.body.position.y), 1, (v) => { spec.y = v; M.Body.setPosition(t.body, { x: t.body.position.x, y: v }); });
        h += num('Hardness (HP)', 'p-hp', ref.maxHp === Infinity ? 0 : ref.maxHp, 1, (v) => { spec.hardness = v; this.rebuildSelected(); }, 'blank = material default; 0 shown for indestructible');
        h += txt('Texture key', 'p-tex', ref.texture || '', (v) => { spec.texture = v || undefined; this.rebuildSelected(); });
      } else if (ref.kind === 'pig') {
        h += sel('Pig type', 'p-type', AB.Registry.ids('pig'), ref.type, (v) => { spec.type = v; this.rebuildSelected(); });
        h += num('HP', 'p-hp', ref.maxHp, 5, (v) => { spec.hp = v; this.rebuildSelected(); });
        h += num('X', 'p-x', Math.round(t.body.position.x), 1, (v) => { spec.x = v; M.Body.setPosition(t.body, { x: v, y: t.body.position.y }); });
        h += num('Y', 'p-y', Math.round(t.body.position.y), 1, (v) => { spec.y = v; M.Body.setPosition(t.body, { x: t.body.position.x, y: v }); });
        h += txt('Texture key', 'p-tex', ref.texture || '', (v) => { spec.texture = v || undefined; this.rebuildSelected(); });
      } else if (ref.kind === 'boss') {
        h += sel('Boss type', 'p-type', AB.Registry.ids('boss'), ref.type, (v) => { spec.type = v; this.rebuildSelected(); });
        h += num('HP', 'p-hp', ref.maxHp, 50, (v) => { spec.hp = v; this.rebuildSelected(); });
        h += num('X', 'p-x', Math.round(t.body.position.x), 1, (v) => { spec.x = v; M.Body.setPosition(t.body, { x: v, y: t.body.position.y }); });
        h += num('Y', 'p-y', Math.round(t.body.position.y), 1, (v) => { spec.y = v; M.Body.setPosition(t.body, { x: t.body.position.x, y: v }); });
        h += `<button class="mini" id="p-boss-script">✎ Edit boss onUpdate script</button>`;
      } else if (ref.kind === 'bird') {
        h += sel('Bird type', 'p-type', AB.Registry.ids('bird'), ref.type, (v) => { spec.type = v; const d = AB.birdDef(v); spec.ability = d.ability; this.rebuildSelected(); });
        const abilities = ['none', 'speed_boost', 'split', 'explode', 'egg_drop', 'boomerang', 'inflate', 'freeze', 'custom'];
        h += sel('Ability', 'p-ability', abilities, ref.ability, (v) => { spec.ability = v; this.rebuildSelected(); });
        h += txt('Ability data (JSON)', 'p-adata', JSON.stringify(ref.abilityData || {}), (v) => { try { spec.abilityData = JSON.parse(v || '{}'); this.rebuildSelected(); } catch (e) { this.status('Invalid ability JSON'); } });
        if (ref.ability === 'custom') h += `<button class="mini" id="p-ability-script">✎ Edit ability script</button>`;
        h += `<div class="row"><button class="mini" id="p-bird-left">◀ earlier</button><button class="mini" id="p-bird-right">later ▶</button></div>`;
      }
      h += `<button class="mini danger" id="p-del">🗑 Delete</button>`;
      el.innerHTML = h;

      // wire dynamic controls
      el.querySelectorAll('[data-prop]').forEach(inp => {
        const handler = this._propHandlers[inp.dataset.prop];
        inp.addEventListener('change', () => handler(inp.type === 'number' ? parseFloat(inp.value) : inp.value));
      });
      const del = $('p-del'); if (del) del.onclick = () => this.deleteTrack(t);
      const bs = $('p-boss-script'); if (bs) bs.onclick = () => this.openScript('Boss onUpdate', spec.script || '', (code) => { spec.script = code; }, 'boss AI: circle & bombard');
      const as = $('p-ability-script'); if (as) as.onclick = () => this.openScript('Custom ability', spec.abilityScript || '', (code) => { spec.abilityScript = code; }, 'ability: gravity well (custom bird)');
      const bl = $('p-bird-left'); if (bl) bl.onclick = () => this._moveBird(t, -1);
      const br = $('p-bird-right'); if (br) br.onclick = () => this._moveBird(t, 1);
    },

    _propHandlers: {},   // populated below

    _moveBird(track, dir) {
      const arr = this.level.birds, i = arr.indexOf(track.ref.spec), j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      this._rebuildBirds();
      this.selected = AB.Physics.byKind('bird').find(t => t.ref.spec === track.ref.spec) || null;
      this.renderProps();
    },

    /* =========================================================================
     * LEVEL LIST / SETTINGS / GAME SETTINGS  (see html for ids)
     * ======================================================================= */
    rebuildLevelList() {
      const el = $('level-list'); if (!el) return;
      el.innerHTML = this.game.levels.map((l, i) =>
        `<div class="level-item ${i === this.levelIndex ? 'active' : ''}" data-i="${i}"><span>${i + 1}. ${escapeHtml(l.name)}</span></div>`).join('');
      el.querySelectorAll('.level-item').forEach(d => d.onclick = () => this.loadLevel(parseInt(d.dataset.i, 10)));
    },

    syncLevelUI() {
      const l = this.level;
      setVal('lv-name', l.name); setVal('lv-bg', l.background);
      setVal('lv-gravity', l.gravity.y); setVal('lv-groundy', l.world.groundY);
      setVal('lv-worldleft', l.world.left); setVal('lv-worldright', l.world.right);
      setVal('lv-camzoom', l.camera.zoom); setVal('lv-camstartx', l.camera.start.x); setVal('lv-camstarty', l.camera.start.y);
      setVal('lv-slingx', l.slingshot.x); setVal('lv-slingy', l.slingshot.y);
      setVal('lv-stars', (l.starThresholds || []).join(', '));
      setVal('lv-intro', l.intro || ''); setVal('lv-outro', l.outro || '');
      this._refreshBgDropdown();
    },

    applyLevelUI() {
      const l = this.level;
      l.name = getVal('lv-name') || 'Level';
      l.background = getVal('lv-bg'); AB.Renderer.setBackground(l.background);
      l.gravity.y = parseFloat(getVal('lv-gravity')) || 1;
      l.world.groundY = parseFloat(getVal('lv-groundy')) || 550;
      l.world.left = parseFloat(getVal('lv-worldleft')) || -400;
      l.world.right = parseFloat(getVal('lv-worldright')) || 2200;
      AB.Physics.bounds = { left: l.world.left, right: l.world.right, groundY: l.world.groundY };
      l.camera.zoom = parseFloat(getVal('lv-camzoom')) || 1;
      l.camera.start = { x: parseFloat(getVal('lv-camstartx')) || 150, y: parseFloat(getVal('lv-camstarty')) || 400 };
      l.slingshot = { x: parseFloat(getVal('lv-slingx')) || 180, y: parseFloat(getVal('lv-slingy')) || 430 };
      AB.Renderer.setSlingshot(l.slingshot.x, l.slingshot.y);
      l.starThresholds = getVal('lv-stars').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      l.intro = getVal('lv-intro') || null; l.outro = getVal('lv-outro') || null;
      this._rebuildBirds();
      this.rebuildLevelList();
    },

    syncGameUI() {
      setVal('g-title', this.game.title); setVal('g-author', this.game.author);
      setVal('g-desc', this.game.description);
      setVal('g-story-intro', this.game.story.intro || ''); setVal('g-story-outro', this.game.story.outro || '');
      const ls = $('g-levelselect'); if (ls) ls.checked = this.game.settings.allowLevelSelect !== false;
      setVal('game-title', this.game.title);
      this.renderTextureList();
    },
    applyGameUI() {
      this.game.title = getVal('g-title') || 'My Game';
      this.game.author = getVal('g-author');
      this.game.description = getVal('g-desc');
      this.game.story.intro = getVal('g-story-intro') || null;
      this.game.story.outro = getVal('g-story-outro') || null;
      const ls = $('g-levelselect'); if (ls) this.game.settings.allowLevelSelect = ls.checked;
      setVal('game-title', this.game.title);
      this.rebuildLevelList();
    },

    /* =========================================================================
     * CUSTOM MATERIAL & BIRD CREATION
     * ======================================================================= */
    addCustomMaterial() {
      const id = (getVal('cm-id') || '').trim();
      if (!/^[a-z][a-z0-9_]*$/.test(id)) return this.status('Material id must be lowercase letters/digits/underscore.');
      const def = {
        name: getVal('cm-name') || id, icon: getVal('cm-icon') || '🧱', shape: getVal('cm-shape') || 'rect',
        hardness: parseFloat(getVal('cm-hardness')) || 60, density: parseFloat(getVal('cm-density')) || 0.005,
        friction: parseFloat(getVal('cm-friction')) || 0.7, restitution: parseFloat(getVal('cm-rest')) || 0.05,
        breakable: $('cm-breakable').checked, color: getVal('cm-color'), stroke: shade(getVal('cm-color'), -30),
        particle: getVal('cm-color'), score: parseFloat(getVal('cm-score')) || 500,
        size: { w: parseInt(getVal('cm-w'), 10) || 60, h: parseInt(getVal('cm-h'), 10) || 20 }
      };
      if ($('cm-explosive').checked) def.explosive = { radius: 130, force: 0.2 };
      if (getVal('cm-texture')) def.texture = getVal('cm-texture');
      this.game.customMaterials[id] = def;
      AB.Registry.registerCustom('material', id, def);
      this.buildPalette('block');
      this.status('Custom material "' + id + '" added.');
    },

    addCustomBird() {
      const id = (getVal('cb-id') || '').trim();
      if (!/^[a-z][a-z0-9_]*$/.test(id)) return this.status('Bird id must be lowercase letters/digits/underscore.');
      const def = {
        name: getVal('cb-name') || id, icon: getVal('cb-icon') || '🐤', description: getVal('cb-desc') || '',
        radius: parseFloat(getVal('cb-radius')) || 18, density: parseFloat(getVal('cb-density')) || 0.007,
        restitution: parseFloat(getVal('cb-rest')) || 0.3, color: getVal('cb-color'), stroke: shade(getVal('cb-color'), -30),
        ability: getVal('cb-ability') || 'none'
      };
      try { def.abilityData = JSON.parse(getVal('cb-adata') || '{}'); } catch (e) { return this.status('Ability data JSON invalid.'); }
      if (def.ability === 'custom') def.abilityScript = this._pendingBirdScript || '// ctx.bird is the active bird\nctx.explode(ctx.bird.body.position.x, ctx.bird.body.position.y, 160, 0.3);\nctx.remove(ctx.bird);';
      if (getVal('cb-texture')) def.texture = getVal('cb-texture');
      this.game.customBirds[id] = def;
      AB.Registry.registerCustom('bird', id, def);
      this.buildPalette('bird');
      this.status('Custom bird "' + id + '" added.');
    },

    addCustomPig() {
      const id = (getVal('cp-id') || '').trim();
      if (!/^[a-z][a-z0-9_]*$/.test(id)) return this.status('Pig id must be lowercase letters/digits/underscore.');
      const def = {
        name: getVal('cp-name') || id, icon: getVal('cp-icon') || '🐷',
        radius: parseFloat(getVal('cp-radius')) || 20, density: parseFloat(getVal('cp-density')) || 0.0045,
        hp: parseFloat(getVal('cp-hp')) || 100, color: getVal('cp-color'), stroke: shade(getVal('cp-color'), -30),
        armor: AB.util.clamp(parseFloat(getVal('cp-armor')) || 0, 0, 0.95), score: parseFloat(getVal('cp-score')) || 5000
      };
      if (getVal('cp-texture')) def.texture = getVal('cp-texture');
      this.game.customPigs[id] = def; AB.Registry.registerCustom('pig', id, def);
      this.buildPalette('pig'); this.status('Custom pig "' + id + '" added.');
    },

    addCustomBoss() {
      const id = (getVal('cbo-id') || '').trim();
      if (!/^[a-z][a-z0-9_]*$/.test(id)) return this.status('Boss id must be lowercase letters/digits/underscore.');
      let phases;
      try { phases = JSON.parse(getVal('cbo-phases') || '[]'); } catch (e) { return this.status('Phases JSON is invalid.'); }
      if (!Array.isArray(phases) || !phases.length) return this.status('Boss needs at least one phase.');
      const def = {
        name: getVal('cbo-name') || id, icon: getVal('cbo-icon') || '👹',
        radius: parseFloat(getVal('cbo-radius')) || 52, density: parseFloat(getVal('cbo-density')) || 0.014,
        hp: parseFloat(getVal('cbo-hp')) || 2000, color: getVal('cbo-color'), stroke: shade(getVal('cbo-color'), -30),
        score: parseFloat(getVal('cbo-score')) || 60000, phases
      };
      const hooks = this._bossHooks || {};
      for (const h of ['onSpawn', 'onUpdate', 'onPhaseChange', 'onDeath']) if (hooks[h]) def[h] = hooks[h];
      if (getVal('cbo-texture')) def.texture = getVal('cbo-texture');
      this.game.customBosses[id] = def; AB.Registry.registerCustom('boss', id, def);
      this.buildPalette('boss'); this.status('Custom boss "' + id + '" added.');
    },

    addCustomBackground() {
      const id = (getVal('cbg-id') || '').trim();
      if (!/^[a-z][a-z0-9_]*$/.test(id)) return this.status('Background id must be lowercase letters/digits/underscore.');
      const def = {
        name: getVal('cbg-name') || id, top: getVal('cbg-top'), bottom: getVal('cbg-bottom'),
        groundTop: getVal('cbg-groundtop'), groundBottom: getVal('cbg-groundbottom'),
        cloud: getVal('cbg-cloudcolor') || 'rgba(255,255,255,0.8)',
        clouds: $('cbg-clouds').checked, stars: $('cbg-stars').checked
      };
      this.game.customBackgrounds[id] = def; AB.Registry.registerCustom('background', id, def);
      this._refreshBgDropdown();
      this.status('Custom background "' + id + '" added — pick it in Level Settings → Background.');
    },

    _refreshBgDropdown() {
      const bg = $('lv-bg'); if (!bg) return;
      bg.innerHTML = AB.Registry.ids('background').map(bid => `<option value="${bid}">${bid}</option>`).join('');
      bg.value = this.level.background;
    },

    /* =========================================================================
     * TEXTURES
     * ======================================================================= */
    addTexture(key, dataUrl) {
      if (!key) return;
      this.game.textures[key] = dataUrl;
      AB.Assets.load(key, dataUrl);
      AB.Assets.table[key] = dataUrl;
      this.renderTextureList();
      this.status('Texture "' + key + '" added. Assign it as a Texture key on an entity or material.');
    },
    renderTextureList() {
      const el = $('tex-list'); if (!el) return;
      const keys = Object.keys(this.game.textures);
      el.innerHTML = keys.length ? keys.map(k =>
        `<div class="tex-item"><img src="${this.game.textures[k]}" alt=""><code>${escapeHtml(k)}</code><button class="mini danger" data-k="${escapeHtml(k)}">✕</button></div>`).join('')
        : '<p class="muted">No textures yet. Upload an image and give it a key, then use that key as an entity/material "Texture key".</p>';
      el.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { delete this.game.textures[b.dataset.k]; this.renderTextureList(); });
    },

    /* =========================================================================
     * SCRIPTS
     * ======================================================================= */
    openScript(title, code, onSave, templateKey) {
      $('script-title').textContent = title;
      $('script-code').value = code || '';
      this._scriptSave = onSave;
      const tmpl = $('script-tmpl');
      tmpl.value = templateKey && AB.Scripting.TEMPLATES[templateKey] ? templateKey : '';
      $('script-modal').classList.remove('hidden');
      $('script-code').focus();
    },
    renderScriptList() {
      const scope = getVal('script-scope'); // 'level' | 'global'
      const list = scope === 'global' ? this.game.globalScripts : this.level.scripts;
      const el = $('script-list');
      el.innerHTML = (list.length ? list.map((s, i) =>
        `<div class="script-item"><span><b>${s.hook}</b> ${s.name ? '· ' + escapeHtml(s.name) : ''}</span>
          <span><button class="mini" data-edit="${i}">✎</button><button class="mini danger" data-del="${i}">✕</button></span></div>`).join('')
        : '<p class="muted">No ' + scope + ' scripts.</p>');
      el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { const s = list[+b.dataset.edit]; this.openScript(s.hook + ' script', s.code, (code) => { s.code = code; this.renderScriptList(); }); });
      el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { list.splice(+b.dataset.del, 1); this.renderScriptList(); });
    },
    addScript() {
      const scope = getVal('script-scope'); const hook = getVal('script-hook');
      const list = scope === 'global' ? this.game.globalScripts : this.level.scripts;
      const entry = { hook, code: '// ' + hook + '(ctx, dt)\n' };
      list.push(entry);
      this.openScript(hook + ' script', entry.code, (code) => { entry.code = code; this.renderScriptList(); });
      this.renderScriptList();
    },

    /* =========================================================================
     * TEST PLAY  (runs the current level with the real engine, in-page)
     * ======================================================================= */
    testLevel() {
      this.flushToSpecs(); this.applyLevelUI(); this.applyGameUI();
      AB.loadGame(this.game);
      AB.Assets.loadTable(this.game.textures);
      this.enabled = false; this.testing = true;
      if (this._raf) cancelAnimationFrame(this._raf);
      $('test-overlay').classList.remove('hidden');
      document.body.classList.add('testing');
      const hud = {
        setScore: (s) => { $('test-score').textContent = 'Score: ' + s.toLocaleString(); },
        setBirds: (b) => {
          const chip = (t, cur) => { const d = AB.birdDef(t) || {}; return '<span class="bird-chip' + (cur ? ' cur' : '') + '" title="' + (d.name || t) + '">' + (d.icon || '🐦') + '</span>'; };
          const c = []; if (b.current) c.push(chip(b.current.ref.type, true)); for (const s of b.queue) c.push(chip(s.type, false));
          $('test-birds').innerHTML = c.join('');
        },
        message: (txt, ms) => this._toast(txt, ms),
        showResult: (r) => { this._toast((r.victory ? '✔ Cleared — ' : '✘ Failed — ') + r.score.toLocaleString() + ' (' + r.stars + '★)', 2600); }
      };
      AB.Game.init(AB.util.clone(this.level), { hud });
    },
    stopTest() {
      AB.Game.stop();
      this.testing = false; this.enabled = true;
      $('test-overlay').classList.add('hidden');
      document.body.classList.remove('testing');
      this._buildLevel(); this.renderProps();
      this._last = performance.now(); this._loop();   // resume editor loop
      this.status('Back in editor.');
    },
    _toast(text, ms) {
      const el = $('test-msg'); el.textContent = text; el.classList.add('show');
      clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), ms || 2000);
    },

    /* =========================================================================
     * SAVE / LOAD / EXPORT
     * ======================================================================= */
    serialize() {
      this.flushToSpecs(); this.applyLevelUI(); this.applyGameUI();
      const g = AB.util.clone(this.game);
      g.format = 'ab-game'; g.version = AB.VERSION;
      return g;
    },
    saveJSON() {
      const g = this.serialize();
      download(JSON.stringify(g, null, 2), slug(g.title) + '.json', 'application/json');
      this.status('Saved game JSON.');
    },
    openFile(file) {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const v = AB.validateGame(data);
          if (!v.ok) { alert('Import errors:\n' + v.errors.join('\n')); return; }
          if (v.warnings.length) console.warn('Import warnings:', v.warnings);
          this.game = AB.loadGame(data);
          if (!this.game.levels.length) this.game.levels.push(AB.normalizeLevel({ name: 'Level 1' }));
          AB.Assets.clear(); AB.Assets.loadTable(this.game.textures);
          this.levelIndex = 0;
          this.rebuildLevelList(); this.loadLevel(0); this.syncGameUI(); this.buildPalette(this.paletteKind || 'block');
          this.status('Loaded "' + this.game.title + '" (' + this.game.levels.length + ' levels).');
        } catch (err) { alert('Invalid JSON: ' + err.message); }
      };
      r.readAsText(file);
    },
    playGame() {
      const g = this.serialize();
      try { localStorage.setItem('ab_editor_playtest', JSON.stringify(g)); } catch (e) { alert('Could not hand off to player (storage full).'); return; }
      window.open('play.html?src=local', '_blank');
    },

    exportGameJSON() { this.saveJSON(); },

    async exportSelfContained() {
      this.status('Bundling engine…');
      const files = ['matter.min.js', 'core.js', 'assets.js', 'camera.js', 'physics.js', 'abilities.js', 'entities.js', 'renderer.js', 'scripting.js', 'boss.js', 'game.js', 'campaign.js'];
      let sources;
      try {
        sources = await Promise.all(files.map(f => fetch('engine/' + f).then(r => { if (!r.ok) throw new Error(f); return r.text(); })));
      } catch (e) {
        alert('Self-contained export needs to read the engine files, which requires running from a web server (e.g. `python -m http.server`).\nUse "Export game.json" instead if opening from file://.');
        this.status('Self-contained export unavailable on file://.');
        return;
      }
      const g = this.serialize();
      const html = this._playerShell(sources.join('\n;\n'), g);
      download(html, slug(g.title) + '.html', 'text/html');
      this.status('Exported self-contained playable HTML.');
    },

    _playerShell(engineSrc, game) {
      return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>${escapeHtml(game.title)}</title>
<style>${PLAYER_CSS}</style></head><body>
<div id="stage"><canvas id="game-canvas"></canvas>
<div id="hud"><div id="level-name"></div><div id="score">0</div><div id="birds"></div>
<button id="ability-btn"><span id="ab-label">✨ Ability</span><kbd>Space</kbd></button><div id="toast"></div></div></div>
<script>${engineSrc}</script>
<script>
const GAME = ${JSON.stringify(game)};
${PLAYER_BOOT}
</script></body></html>`;
    },

    /* =========================================================================
     * PALETTE
     * ======================================================================= */
    buildPalette(kind) {
      this.paletteKind = kind || this.paletteKind || 'block';
      document.querySelectorAll('.pal-tab').forEach(t => t.classList.toggle('active', t.dataset.kind === this.paletteKind));
      const regKind = this.paletteKind === 'block' ? 'material' : this.paletteKind;
      const defs = AB.Registry.all(regKind);
      const el = $('palette');
      el.innerHTML = Object.entries(defs).map(([id, def]) =>
        `<div class="pal-item" data-id="${id}" title="${escapeHtml(def.name || id)}" style="--c:${def.color || '#888'}">
           <span class="ic">${def.icon || '▪'}</span><span class="nm">${escapeHtml((def.name || id))}</span>
         </div>`).join('');
      el.querySelectorAll('.pal-item').forEach(it => it.onclick = () => {
        this.palette = { kind: this.paletteKind, id: it.dataset.id };
        this.tool = 'place';
        el.querySelectorAll('.pal-item').forEach(x => x.classList.remove('sel'));
        it.classList.add('sel');
        this.updateToolButtons();
        this.status('Place ' + this.paletteKind + ' "' + it.dataset.id + '" — click the canvas.');
      });
    },

    updateToolButtons() {
      ['select', 'delete', 'pan'].forEach(tl => { const b = $('tool-' + tl); if (b) b.classList.toggle('active', this.tool === tl); });
    },

    /* =========================================================================
     * CANVAS + KEYS + LOOP
     * ======================================================================= */
    _bindCanvas() {
      const cv = $('editor-canvas');
      const world = (e) => AB.Camera.screenToWorld(e.clientX, e.clientY);
      cv.addEventListener('contextmenu', e => e.preventDefault());
      cv.addEventListener('pointerdown', (e) => {
        if (this.testing) { AB.Game.pointerDown(e.clientX, e.clientY); return; }
        if (!this.enabled) return;
        cv.setPointerCapture(e.pointerId);
        const w = world(e);
        if (e.button === 1 || e.button === 2 || this.tool === 'pan') { this._drag = { pan: true, sx: e.clientX, sy: e.clientY }; return; }
        if (this.tool === 'place') { this.placeAt(w.x, w.y); return; }
        const hit = this.findAt(w.x, w.y);
        if (this.tool === 'delete') { if (hit) this.deleteTrack(hit); return; }
        // select tool
        this.select(hit);
        if (hit) this._drag = { track: hit, offX: hit.body.position.x - w.x, offY: hit.body.position.y - w.y };
      });
      cv.addEventListener('pointermove', (e) => {
        if (this.testing) { AB.Game.pointerMove(e.clientX, e.clientY); return; }
        const w = world(e);
        setText('mouse-pos', Math.round(w.x) + ', ' + Math.round(w.y));
        if (!this._drag) return;
        if (this._drag.pan) {
          const dx = (e.clientX - this._drag.sx) / AB.Camera.zoom, dy = (e.clientY - this._drag.sy) / AB.Camera.zoom;
          AB.Camera.x -= dx; AB.Camera.y -= dy; AB.Camera.tx = AB.Camera.x; AB.Camera.ty = AB.Camera.y;
          this._drag.sx = e.clientX; this._drag.sy = e.clientY; return;
        }
        const t = this._drag.track;
        const nx = this.snapv(w.x + this._drag.offX), ny = this.snapv(w.y + this._drag.offY);
        M.Body.setPosition(t.body, { x: nx, y: ny });
        if (t.ref.spec) { t.ref.spec.x = nx; t.ref.spec.y = ny; }
        this.renderProps();
      });
      const end = (e) => { if (this.testing) { AB.Game.pointerUp(); return; } this._drag = null; };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        AB.Camera.tz = AB.util.clamp(AB.Camera.tz * factor, 0.3, 2.5);
        AB.Camera.zoom = AB.Camera.tz;
        setText('zoom', AB.Camera.zoom.toFixed(2) + '×');
      }, { passive: false });
    },

    _bindKeys() {
      window.addEventListener('keydown', (e) => {
        if (/input|textarea|select/i.test(e.target.tagName)) return;
        if (this.testing) { if (e.code === 'Space') { e.preventDefault(); AB.Game.activateAbility(); } if (e.code === 'Escape') this.stopTest(); return; }
        if (!this.enabled) return;
        const t = this.selected;
        if ((e.code === 'Delete' || e.code === 'Backspace') && t) { e.preventDefault(); this.deleteTrack(t); }
        if (t && t.ref.kind === 'block') {
          if (e.code === 'KeyQ') { t.ref.spec.angle = (t.ref.spec.angle || 0) - 15; M.Body.setAngle(t.body, AB.util.deg2rad(t.ref.spec.angle)); this.renderProps(); }
          if (e.code === 'KeyE') { t.ref.spec.angle = (t.ref.spec.angle || 0) + 15; M.Body.setAngle(t.body, AB.util.deg2rad(t.ref.spec.angle)); this.renderProps(); }
        }
        if (e.code === 'KeyV') { this.tool = 'select'; this.updateToolButtons(); }
        if (e.code === 'KeyX') { this.tool = 'delete'; this.updateToolButtons(); }
        if (e.code === 'KeyH') { this.tool = 'pan'; this.updateToolButtons(); }
        if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); this.saveJSON(); }
      });
    },

    _loop() {
      const now = performance.now(); const dt = Math.min(60, now - this._last); this._last = now;
      AB.Camera.update(dt);
      AB.Renderer.render();
      if (this.enabled) this._drawEditorOverlay();
      setText('obj-count', AB.Physics.tracks.length);
      // During test play, AB.Game drives its own loop — the editor loop pauses.
      if (!this.testing) this._raf = requestAnimationFrame(() => this._loop());
    },

    _drawEditorOverlay() {
      const t = this.selected; if (!t || !t.body || !t.ref.alive) return;
      const ctx = AB.Renderer.ctx, dpr = AB.Renderer._dpr || 1;
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); AB.Camera.applyTransform(ctx);
      ctx.strokeStyle = '#00e6a8'; ctx.lineWidth = 2 / AB.Camera.zoom; ctx.setLineDash([6 / AB.Camera.zoom, 4 / AB.Camera.zoom]);
      const p = t.body.position;
      if (t.ref.kind === 'block' && t.ref.shape !== 'circle') {
        ctx.beginPath(); const v = t.body.vertices; ctx.moveTo(v[0].x, v[0].y); for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y); ctx.closePath(); ctx.stroke();
      } else {
        const r = (t.ref.radius || Math.max(t.ref.width || 20, t.ref.height || 20) / 2) + 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.restore();
    },

    status(msg) { setText('status', msg); },

    _wireUI() {
      // palette tabs
      document.querySelectorAll('.pal-tab').forEach(t => t.onclick = () => this.buildPalette(t.dataset.kind));
      this.buildPalette('block');
      // tools
      ['select', 'delete', 'pan'].forEach(tl => { const b = $('tool-' + tl); if (b) b.onclick = () => { this.tool = tl; this.palette = null; document.querySelectorAll('.pal-item').forEach(x => x.classList.remove('sel')); this.updateToolButtons(); }; });
      this.updateToolButtons();
      const grid = $('chk-grid'); if (grid) grid.onchange = () => AB.Renderer.showGrid = grid.checked;
      const snap = $('chk-snap'); if (snap) snap.onchange = () => this.snap = snap.checked;

      // level list buttons
      $('btn-level-add').onclick = () => { this.flushToSpecs(); this.game.levels.push(AB.normalizeLevel({ name: 'Level ' + (this.game.levels.length + 1) })); this.loadLevel(this.game.levels.length - 1); };
      $('btn-level-dup').onclick = () => { this.flushToSpecs(); const c = AB.util.clone(this.level); c.name += ' copy'; c.id = 'level_' + Math.random().toString(36).slice(2, 8); this.game.levels.splice(this.levelIndex + 1, 0, AB.normalizeLevel(c)); this.loadLevel(this.levelIndex + 1); };
      $('btn-level-del').onclick = () => { if (this.game.levels.length <= 1) return this.status('A game needs at least one level.'); if (!confirm('Delete this level?')) return; this.game.levels.splice(this.levelIndex, 1); this.loadLevel(Math.max(0, this.levelIndex - 1)); };
      $('btn-level-up').onclick = () => this._moveLevel(-1);
      $('btn-level-down').onclick = () => this._moveLevel(1);

      // level & game settings live-apply
      ['lv-name', 'lv-bg', 'lv-gravity', 'lv-groundy', 'lv-worldleft', 'lv-worldright', 'lv-camzoom', 'lv-camstartx', 'lv-camstarty', 'lv-slingx', 'lv-slingy', 'lv-stars', 'lv-intro', 'lv-outro']
        .forEach(id => { const el = $(id); if (el) el.addEventListener('change', () => this.applyLevelUI()); });
      ['g-title', 'g-author', 'g-desc', 'g-story-intro', 'g-story-outro', 'g-levelselect']
        .forEach(id => { const el = $(id); if (el) el.addEventListener('change', () => this.applyGameUI()); });

      // top bar
      $('btn-new-game').onclick = () => { if (confirm('Start a new game? Unsaved work is lost.')) { this.game = this._blankGame(); AB.Assets.clear(); this.levelIndex = 0; this.rebuildLevelList(); this.loadLevel(0); this.syncGameUI(); } };
      $('btn-open').onclick = () => $('file-open').click();
      $('file-open').onchange = (e) => { if (e.target.files[0]) this.openFile(e.target.files[0]); e.target.value = ''; };
      $('btn-save').onclick = () => this.saveJSON();
      $('btn-test').onclick = () => this.testLevel();
      $('btn-stop-test').onclick = () => this.stopTest();
      $('btn-play').onclick = () => this.playGame();
      // export menu
      $('btn-export').onclick = () => $('export-menu').classList.toggle('hidden');
      document.querySelectorAll('#export-menu [data-export]').forEach(b => b.onclick = () => {
        $('export-menu').classList.add('hidden');
        if (b.dataset.export === 'json') this.exportGameJSON();
        else if (b.dataset.export === 'selfhtml') this.exportSelfContained();
      });
      document.addEventListener('click', (e) => { if (!e.target.closest('#btn-export') && !e.target.closest('#export-menu')) $('export-menu').classList.add('hidden'); });

      // custom creators
      $('btn-add-material').onclick = () => this.addCustomMaterial();
      $('btn-add-bird').onclick = () => this.addCustomBird();
      $('btn-add-pig').onclick = () => this.addCustomPig();
      $('btn-add-boss').onclick = () => this.addCustomBoss();
      $('btn-add-bg').onclick = () => this.addCustomBackground();
      const cbA = $('cb-ability'); if (cbA) cbA.onchange = () => { $('cb-script-row').style.display = cbA.value === 'custom' ? 'block' : 'none'; };
      const cbEdit = $('cb-edit-script'); if (cbEdit) cbEdit.onclick = () => this.openScript('Custom bird ability', this._pendingBirdScript || '', (code) => { this._pendingBirdScript = code; }, 'ability: gravity well (custom bird)');
      $('cbo-edit-update').onclick = () => this.openScript('Boss onUpdate script', (this._bossHooks && this._bossHooks.onUpdate) || '', (code) => { (this._bossHooks = this._bossHooks || {}).onUpdate = code; }, 'boss AI: circle & bombard');
      $('cbo-edit-phase').onclick = () => this.openScript('Boss onPhaseChange script', (this._bossHooks && this._bossHooks.onPhaseChange) || '', (code) => { (this._bossHooks = this._bossHooks || {}).onPhaseChange = code; });

      // textures
      $('tex-upload').onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader(); r.onload = (ev) => { const key = (getVal('tex-key') || f.name.replace(/\.[^.]+$/, '')).trim().replace(/[^a-z0-9_]/gi, '_'); this.addTexture(key, ev.target.result); setVal('tex-key', ''); };
        r.readAsDataURL(f); e.target.value = '';
      };

      // scripts
      $('script-scope').onchange = () => this.renderScriptList();
      $('btn-add-script').onclick = () => this.addScript();
      $('script-apply').onclick = () => { if (this._scriptSave) this._scriptSave($('script-code').value); $('script-modal').classList.add('hidden'); };
      $('script-cancel').onclick = () => $('script-modal').classList.add('hidden');
      const tmpl = $('script-tmpl');
      Object.keys(AB.Scripting.TEMPLATES).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = k; tmpl.appendChild(o); });
      tmpl.onchange = () => { if (tmpl.value) $('script-code').value = AB.Scripting.TEMPLATES[tmpl.value]; };
      $('script-code').addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); const s = this.selectionStart; this.value = this.value.slice(0, s) + '  ' + this.value.slice(this.selectionEnd); this.selectionStart = this.selectionEnd = s + 2; } });
      this.renderScriptList();
    },

    _moveLevel(dir) {
      this.flushToSpecs();
      const i = this.levelIndex, j = i + dir; if (j < 0 || j >= this.game.levels.length) return;
      const tmp = this.game.levels[i]; this.game.levels[i] = this.game.levels[j]; this.game.levels[j] = tmp;
      this.loadLevel(j);
    }
  };

  /* ---- small html-form helpers (return markup with data-prop hooks) ------- */
  Editor._propHandlers = {};
  let ph = 0;
  function bind(fn) { const k = 'h' + (ph++); Editor._propHandlers[k] = fn; return k; }
  function num(label, id, val, step, fn, hint) { const k = bind(fn); return `<label>${label}${hint ? `<span class="hint" title="${escapeHtml(hint)}">?</span>` : ''}<input type="number" id="${id}" data-prop="${k}" value="${val}" step="${step}"></label>`; }
  function txt(label, id, val, fn) { const k = bind(fn); return `<label>${label}<input type="text" id="${id}" data-prop="${k}" value="${escapeHtml(val)}"></label>`; }
  function sel(label, id, opts, val, fn) { const k = bind(fn); return `<label>${label}<select id="${id}" data-prop="${k}">${opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`; }

  /* ---- generic DOM helpers ------------------------------------------------ */
  function setVal(id, v) { const el = document.getElementById(id); if (el != null && el) el.value = v; }
  function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function slug(s) { return String(s || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'game'; }
  function download(text, name, type) {
    const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function shade(hex, amt) {
    if (!hex || hex[0] !== '#') return hex || '#666';
    let n = parseInt(hex.slice(1), 16); let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  // Player shell CSS/boot reused by self-contained export (kept identical to play.html).
  const PLAYER_CSS = `*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;overflow:hidden;font-family:system-ui,sans-serif;background:#0e1020}#stage{position:fixed;inset:0}canvas{display:block;width:100%;height:100%;touch-action:none}#hud{position:fixed;inset:0;pointer-events:none}#level-name{position:absolute;top:12px;left:50%;transform:translateX(-50%);color:#fff;font-weight:700;font-size:16px;text-shadow:0 2px 6px #0008}#score{position:absolute;top:12px;right:16px;color:#ffcf40;font-weight:800;font-size:20px;text-shadow:0 2px 6px #0008}#birds{position:absolute;top:44px;right:16px;display:flex;gap:5px;align-items:center;flex-direction:row-reverse}.bird-chip{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(20,22,40,.55);border:2px solid rgba(255,255,255,.25)}.bird-chip.cur{border-color:#ffcf40;width:38px;height:38px;font-size:20px;box-shadow:0 0 12px rgba(255,207,64,.55)}#ability-btn{position:absolute;bottom:20px;right:20px;pointer-events:auto;background:#e94560;color:#fff;border:0;border-radius:30px;padding:11px 20px;font-size:15px;font-weight:700;box-shadow:0 6px 16px #0006;cursor:pointer;display:flex;align-items:center;gap:8px}#ability-btn kbd{background:rgba(0,0,0,.28);border-radius:6px;padding:2px 7px;font-size:11px;font-family:inherit}#ability-btn.dim{filter:grayscale(.7) brightness(.8);opacity:.75}#ability-btn.ready{animation:abp 1s ease-in-out infinite}@keyframes abp{0%,100%{box-shadow:0 6px 16px #0006}50%{box-shadow:0 6px 26px rgba(233,69,96,.9)}}#toast{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:#000a;color:#fff;padding:10px 18px;border-radius:10px;font-weight:600;opacity:0;transition:opacity .25s}#toast.show{opacity:1}.ab-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0009;backdrop-filter:blur(4px);z-index:50}.ab-overlay.hidden{display:none}.ab-card{background:#1b1d33;color:#eee;border:1px solid #333;border-radius:16px;padding:28px 34px;max-width:520px;text-align:center;box-shadow:0 20px 60px #000a}.ab-card.wide{max-width:760px}.ab-card h1{font-size:24px;margin-bottom:12px;color:#ffcf40}.ab-story{white-space:pre-wrap;line-height:1.6;color:#cfd3e6;margin-bottom:16px;text-align:left}.ab-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}.ab-btn{background:#2a2d4a;color:#fff;border:1px solid #3a3d5f;border-radius:10px;padding:10px 20px;font-size:15px;cursor:pointer}.ab-btn.primary{background:#e94560;border-color:#e94560}.ab-stars{font-size:40px;letter-spacing:6px;margin:6px 0}.ab-star{color:#555}.ab-star.on{color:#ffcf40}.ab-star.sm{font-size:14px}.ab-score{font-size:18px;margin-top:6px}.ab-level-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:14px}.ab-level-cell{background:#242742;border:1px solid #3a3d5f;border-radius:12px;padding:14px;cursor:pointer;color:#fff;display:flex;flex-direction:column;gap:4px;align-items:center}.ab-level-cell.locked{opacity:.5;cursor:not-allowed}.ab-level-cell .num{font-size:22px;font-weight:800;color:#ffcf40}.ab-level-cell .nm{font-size:12px}`;
  const PLAYER_BOOT = `(function(){const cv=document.getElementById('game-canvas');AB.Renderer.init(cv);AB.Camera.attach(cv);const LBL={speed_boost:'Speed Boost',split:'Split',explode:'Detonate',egg_drop:'Egg Drop',boomerang:'Boomerang',inflate:'Inflate',freeze:'Freeze',custom:'Special'};function chip(t,cur){var d=AB.birdDef(t)||{};return '<span class="bird-chip'+(cur?' cur':'')+'" title="'+(d.name||t)+'">'+(d.icon||'🐦')+'</span>';}var abBtn=document.getElementById('ability-btn'),abLabel=document.getElementById('ab-label');const hud={setScore:s=>document.getElementById('score').textContent=s.toLocaleString(),setBirds:b=>{var c=[];if(b.current)c.push(chip(b.current.ref.type,true));for(var i=0;i<b.queue.length;i++)c.push(chip(b.queue[i].type,false));document.getElementById('birds').innerHTML=c.join('');var cur=b.current,has=cur&&cur.ref.ability&&cur.ref.ability!=='none';abLabel.textContent=has?'✨ '+(LBL[cur.ref.ability]||'Ability'):'— no power —';abBtn.classList.toggle('dim',!has);},setState:st=>abBtn.classList.toggle('ready',st==='flying'),setLevelName:(n,i,t)=>document.getElementById('level-name').textContent=n+'  ('+i+'/'+t+')',message:(t,ms)=>{const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),ms||2000);}};cv.addEventListener('pointerdown',e=>{if(AB.Game.state==='flying'){AB.Game.activateAbility();return;}AB.Game.pointerDown(e.clientX,e.clientY);});cv.addEventListener('pointermove',e=>AB.Game.pointerMove(e.clientX,e.clientY));window.addEventListener('pointerup',()=>AB.Game.pointerUp());abBtn.addEventListener('click',function(){AB.Game.activateAbility();this.blur();});window.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();AB.Game.activateAbility();}});AB.Campaign.start(GAME,{hud});})();`;

  Editor.PLAYER_CSS = PLAYER_CSS; Editor.PLAYER_BOOT = PLAYER_BOOT;

  window.addEventListener('DOMContentLoaded', () => Editor.boot());

})(typeof window !== 'undefined' ? window : globalThis);
