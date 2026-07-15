/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — CORE
 * -----------------------------------------------------------------------------
 * The abstract, data-driven foundation. Everything is a definition in a
 * registry: materials (blocks), birds, pigs, bosses, backgrounds. A "game" is a
 * bundle of custom definitions + a list of levels + story data. A "level" is a
 * scene of placed entities. Both are plain JSON (see docs/json-format.md).
 *
 * Nothing here touches the DOM or Matter.js — this file is pure data + helpers,
 * so it can be reasoned about, serialized, and unit-checked on its own.
 * ========================================================================== */

(function (root) {
  'use strict';

  const AB = root.AB = root.AB || {};

  AB.VERSION = '2.0.0';

  /* ---------------------------------------------------------------------------
   * TUNING — every "magic number" that shapes game feel lives here so it can be
   * overridden per-game (game.settings.tuning) without touching engine code.
   * ------------------------------------------------------------------------- */
  AB.TUNING = {
    // Physics
    gravityScale: 0.0016,     // Matter gravity.scale — controls fall speed
    fixedStep: 1000 / 60,     // ms per physics step (fixed timestep)
    maxSubSteps: 5,           // clamp catch-up steps to avoid spiral of death

    // Slingshot — launch velocity is in px per physics step, so keep it small:
    // maxDragDistance * launchPower ≈ peak launch speed (~21 px/step here).
    launchPower: 0.16,        // velocity per unit of drag distance
    maxDragDistance: 130,     // px the band can be pulled

    // Damage model — impact = reducedMass * relativeSpeed (a real collision
    // impulse proxy). Damage = impact * coefficient. Tune per interaction.
    dmgBirdToBlock: 0.9,
    dmgBirdToPig: 1.8,
    dmgBirdToBoss: 1.1,
    dmgBlockToPig: 0.55,
    dmgBlockToBlock: 0.18,
    dmgFallToPig: 0.5,
    minImpact: 2.2,           // impacts below this deal no damage (resting contact)

    // Scoring
    scoreUnusedBird: 10000,

    // Housekeeping
    debrisLifetime: 6000,     // ms a fragment/projectile lives before cleanup
    outOfBoundsMargin: 600    // px beyond camera bounds before a body is culled
  };

  /* ---------------------------------------------------------------------------
   * REGISTRY — base (built-in) definitions plus per-game custom definitions.
   * Lookups prefer custom defs so a game can override a built-in id.
   * ------------------------------------------------------------------------- */
  const KINDS = ['material', 'bird', 'pig', 'boss', 'background'];

  AB.Registry = {
    base: { material: {}, bird: {}, pig: {}, boss: {}, background: {} },
    custom: { material: {}, bird: {}, pig: {}, boss: {}, background: {} },

    define(kind, id, def) {
      if (!this.base[kind]) throw new Error('Unknown definition kind: ' + kind);
      this.base[kind][id] = Object.assign({ id }, def);
      return this;
    },

    registerCustom(kind, id, def) {
      if (!this.custom[kind]) throw new Error('Unknown definition kind: ' + kind);
      this.custom[kind][id] = Object.assign({ id, custom: true }, def);
      return this;
    },

    clearCustom() {
      for (const k of KINDS) this.custom[k] = {};
    },

    get(kind, id) {
      return (this.custom[kind] && this.custom[kind][id]) ||
             (this.base[kind] && this.base[kind][id]) || null;
    },

    // Merged view (custom over base) for a whole kind — used by editor palettes.
    all(kind) {
      const out = {};
      Object.assign(out, this.base[kind]);
      Object.assign(out, this.custom[kind]);
      return out;
    },

    ids(kind) { return Object.keys(this.all(kind)); }
  };

  // Convenience shorthands used across the engine.
  AB.material   = (id) => AB.Registry.get('material', id);
  AB.birdDef    = (id) => AB.Registry.get('bird', id);
  AB.pigDef     = (id) => AB.Registry.get('pig', id);
  AB.bossDef    = (id) => AB.Registry.get('boss', id);
  AB.background  = (id) => AB.Registry.get('background', id);

  AB.defineMaterial   = (id, def) => AB.Registry.define('material', id, def);
  AB.defineBird       = (id, def) => AB.Registry.define('bird', id, def);
  AB.definePig        = (id, def) => AB.Registry.define('pig', id, def);
  AB.defineBoss       = (id, def) => AB.Registry.define('boss', id, def);
  AB.defineBackground = (id, def) => AB.Registry.define('background', id, def);

  /* ===========================================================================
   * BUILT-IN MATERIALS (block types)
   * Fields:
   *   name, icon                     — editor display
   *   shape: rect|circle|triangle    — default geometry (overridable per block)
   *   hardness                       — hit points; damage subtracts from this
   *   density                        — mass per area → "weight"
   *   friction, restitution          — surface behavior (bounciness)
   *   breakable                      — false = indestructible
   *   explosive {radius, force}      — detonates when destroyed
   *   color, stroke, particle        — vector-art fallback colors
   *   texture                        — optional default image key
   *   score                          — points when destroyed
   * ========================================================================= */
  AB.defineMaterial('wood',        { name: 'Wood Beam', icon: '🪵', shape: 'rect',   hardness: 55,  density: 0.0042, friction: 0.75, restitution: 0.05, breakable: true, color: '#c4873c', stroke: '#8b5e24', particle: '#d4a55c', score: 500, size: { w: 88, h: 22 } });
  AB.defineMaterial('wood_block',  { name: 'Wood Block', icon: '🟫', shape: 'rect',  hardness: 70,  density: 0.0045, friction: 0.78, restitution: 0.05, breakable: true, color: '#c4873c', stroke: '#8b5e24', particle: '#d4a55c', score: 500, size: { w: 44, h: 44 } });
  AB.defineMaterial('wood_plank',  { name: 'Plank', icon: '📏', shape: 'rect',       hardness: 38,  density: 0.0032, friction: 0.72, restitution: 0.05, breakable: true, color: '#d4a55c', stroke: '#a07030', particle: '#d4a55c', score: 300, size: { w: 128, h: 16 } });
  AB.defineMaterial('wood_tri',    { name: 'Wood Wedge', icon: '🔺', shape: 'triangle', hardness: 50, density: 0.0040, friction: 0.75, restitution: 0.05, breakable: true, color: '#c4873c', stroke: '#8b5e24', particle: '#d4a55c', score: 500, size: { w: 56, h: 56 } });
  AB.defineMaterial('stone',       { name: 'Stone Beam', icon: '🪨', shape: 'rect',  hardness: 165, density: 0.011,  friction: 0.9,  restitution: 0.02, breakable: true, color: '#8a8f96', stroke: '#565b61', particle: '#9aa0a6', score: 1000, size: { w: 88, h: 22 } });
  AB.defineMaterial('stone_block', { name: 'Stone Block', icon: '⬛', shape: 'rect', hardness: 210, density: 0.012,  friction: 0.9,  restitution: 0.02, breakable: true, color: '#7a7f86', stroke: '#4a4f55', particle: '#8a9096', score: 1000, size: { w: 44, h: 44 } });
  AB.defineMaterial('stone_ball',  { name: 'Boulder', icon: '⚪', shape: 'circle',  hardness: 240, density: 0.013,  friction: 0.85, restitution: 0.12, breakable: true, color: '#7a7f86', stroke: '#4a4f55', particle: '#8a9096', score: 1500, size: { w: 46, h: 46 } });
  AB.defineMaterial('ice',         { name: 'Ice Beam', icon: '🧊', shape: 'rect',   hardness: 28,  density: 0.0026, friction: 0.03, restitution: 0.18, breakable: true, color: '#a8ddf5', stroke: '#7bc6e8', particle: '#e1f5fe', score: 300, size: { w: 88, h: 22 } });
  AB.defineMaterial('ice_block',   { name: 'Ice Block', icon: '🔷', shape: 'rect',  hardness: 34,  density: 0.0028, friction: 0.03, restitution: 0.18, breakable: true, color: '#a8ddf5', stroke: '#7bc6e8', particle: '#e1f5fe', score: 400, size: { w: 44, h: 44 } });
  AB.defineMaterial('glass',       { name: 'Glass', icon: '🪟', shape: 'rect',      hardness: 18,  density: 0.003,  friction: 0.3,  restitution: 0.1,  breakable: true, color: 'rgba(200,230,255,0.72)', stroke: 'rgba(150,200,240,0.9)', particle: '#c8e6ff', score: 500, size: { w: 44, h: 44 } });
  AB.defineMaterial('sand',        { name: 'Sandstone', icon: '🟨', shape: 'rect',  hardness: 42,  density: 0.005,  friction: 0.95, restitution: 0.0,  breakable: true, color: '#e0c068', stroke: '#b89a44', particle: '#efd48a', score: 400, size: { w: 88, h: 22 } });
  AB.defineMaterial('steel',       { name: 'Steel', icon: '🔩', shape: 'rect',      hardness: Infinity, density: 0.024, friction: 0.95, restitution: 0.01, breakable: false, color: '#5b6a78', stroke: '#37444f', particle: '#8090a0', score: 0, size: { w: 88, h: 22 } });
  AB.defineMaterial('steel_block', { name: 'Steel Block', icon: '◼️', shape: 'rect', hardness: Infinity, density: 0.026, friction: 0.95, restitution: 0.01, breakable: false, color: '#4a5a6a', stroke: '#2a3a46', particle: '#708090', score: 0, size: { w: 44, h: 44 } });
  AB.defineMaterial('gold',        { name: 'Gold Bar', icon: '🟡', shape: 'rect',   hardness: 90,  density: 0.02,   friction: 0.8,  restitution: 0.03, breakable: true, color: '#ffcf40', stroke: '#c99a1a', particle: '#ffe38a', score: 5000, size: { w: 56, h: 24 } });
  AB.defineMaterial('tnt',         { name: 'TNT', icon: '💣', shape: 'rect',        hardness: 12,  density: 0.006,  friction: 0.7,  restitution: 0.05, breakable: true, color: '#e53935', stroke: '#b71c1c', particle: '#ff5252', score: 2000, size: { w: 40, h: 40 }, explosive: { radius: 140, force: 0.22 } });
  AB.defineMaterial('balloon',     { name: 'Balloon', icon: '🎈', shape: 'circle',  hardness: 6,   density: 0.0006, friction: 0.2,  restitution: 0.5,  breakable: true, color: '#ef5da8', stroke: '#c22e7c', particle: '#ff9ccf', score: 200, size: { w: 34, h: 34 }, buoyancy: 0.003 });
  AB.defineMaterial('rubber',      { name: 'Rubber', icon: '🟢', shape: 'rect',     hardness: 80,  density: 0.004,  friction: 0.6,  restitution: 0.85, breakable: true, color: '#3ea35a', stroke: '#1f6e37', particle: '#66c884', score: 400, size: { w: 44, h: 44 } });
  AB.defineMaterial('trampoline',  { name: 'Trampoline', icon: '🟩', shape: 'rect', hardness: Infinity, density: 0.004, friction: 0.4, restitution: 1.9, breakable: false, color: '#ffd54a', stroke: '#e0a712', particle: '#fff176', score: 0, size: { w: 70, h: 12 } });

  /* ===========================================================================
   * BUILT-IN BIRDS
   * Fields:
   *   name, icon, description
   *   radius, density, restitution
   *   color, stroke, texture
   *   ability      — id of a built-in ability, or 'custom'
   *   abilityScript— (when ability==='custom') a script body, see docs/scripting
   *   abilityData  — parameters passed to the ability
   *   trigger      — 'tap' (default). Ability fires on tap/space after launch.
   * ========================================================================= */
  AB.defineBird('red',    { name: 'Red', icon: '🔴', radius: 18, density: 0.007, restitution: 0.32, color: '#e53935', stroke: '#b71c1c', ability: 'none', description: 'Reliable all-rounder. No special ability.' });
  AB.defineBird('chuck',  { name: 'Chuck (Yellow)', icon: '🟡', radius: 16, density: 0.0075, restitution: 0.3, color: '#fdd835', stroke: '#f57f17', ability: 'speed_boost', abilityData: { multiplier: 2.6 }, description: 'Rockets forward when tapped. Great against wood.' });
  AB.defineBird('blues',  { name: 'The Blues', icon: '🔵', radius: 14, density: 0.0055, restitution: 0.34, color: '#1e88e5', stroke: '#0d47a1', ability: 'split', abilityData: { count: 3, spread: 0.26 }, description: 'Splits into three. Shreds ice.' });
  AB.defineBird('bomb',   { name: 'Bomb (Black)', icon: '⚫', radius: 22, density: 0.011, restitution: 0.2, color: '#242424', stroke: '#000000', ability: 'explode', abilityData: { radius: 165, force: 0.62, knockback: 1 }, description: 'Detonates on tap or hard impact — huge knockback. Wrecks stone.' });
  AB.defineBird('matilda',{ name: 'Matilda (White)', icon: '⚪', radius: 19, density: 0.008, restitution: 0.28, color: '#fafafa', stroke: '#bdbdbd', ability: 'egg_drop', abilityData: { force: 0.16, radius: 95 }, description: 'Drops an explosive egg and rockets upward.' });
  AB.defineBird('boomer', { name: 'Boomerang (Green)', icon: '🟢', radius: 17, density: 0.0065, restitution: 0.3, color: '#43a047', stroke: '#1b5e20', ability: 'boomerang', abilityData: { multiplier: 2.4 }, description: 'Reverses direction to hit from behind.' });
  AB.defineBird('terence',{ name: 'Terence (Big)', icon: '🟥', radius: 30, density: 0.014, restitution: 0.18, color: '#b71c1c', stroke: '#7f0000', ability: 'none', description: 'Enormous and heavy. Bulldozes everything.' });
  AB.defineBird('ice_bird',{ name: 'Ice Bird', icon: '🧊', radius: 18, density: 0.007, restitution: 0.3, color: '#8fd3f0', stroke: '#4aa8d0', ability: 'freeze', abilityData: { radius: 110 }, description: 'Turns nearby blocks to brittle ice.' });

  /* ===========================================================================
   * BUILT-IN PIGS (targets)
   * ========================================================================= */
  AB.definePig('normal', { name: 'Minion Pig', icon: '🐷', radius: 20, density: 0.0045, hp: 100, color: '#63c74d', stroke: '#3e8e2f', score: 5000 });
  AB.definePig('helmet', { name: 'Helmet Pig', icon: '🪖', radius: 20, density: 0.006,  hp: 220, color: '#63c74d', stroke: '#3e8e2f', score: 8000, armor: 0.5 });
  AB.definePig('big',    { name: 'Big Pig', icon: '🐖', radius: 30, density: 0.006,  hp: 400, color: '#57b843', stroke: '#357a28', score: 12000 });
  AB.definePig('king',   { name: 'King Pig', icon: '👑', radius: 34, density: 0.007,  hp: 650, color: '#e5c07b', stroke: '#c4903a', score: 25000 });
  AB.definePig('tiny',   { name: 'Tiny Pig', icon: '🐽', radius: 12, density: 0.003,  hp: 45,  color: '#7cd867', stroke: '#4d9c3a', score: 3000 });

  /* ===========================================================================
   * BUILT-IN BOSSES
   * phases[]: { name, hpThreshold (0..1), behavior, color, camera?, onEnter? }
   * hooks: onSpawn, onUpdate, onPhaseChange, onDeath (script bodies)
   * ========================================================================= */
  AB.defineBoss('king_pig_boss', {
    name: 'King Pig', icon: '👹', radius: 52, density: 0.014, hp: 2400, color: '#d4a017', stroke: '#8b6914', score: 60000,
    phases: [
      { name: 'Smug',    hpThreshold: 1.0, behavior: 'charge', color: '#d4a017' },
      { name: 'Angry',   hpThreshold: 0.6, behavior: 'summon', color: '#e08a17' },
      { name: 'Enraged', hpThreshold: 0.25, behavior: 'rage',  color: '#e53935' }
    ]
  });
  AB.defineBoss('mecha_pig', {
    name: 'Mecha Pig', icon: '🤖', radius: 56, density: 0.02, hp: 3400, color: '#607d8b', stroke: '#37474f', score: 90000,
    phases: [
      { name: 'Online',   hpThreshold: 1.0,  behavior: 'shoot',    color: '#607d8b' },
      { name: 'Damaged',  hpThreshold: 0.5,  behavior: 'summon',   color: '#ff9800' },
      { name: 'Overheat', hpThreshold: 0.2,  behavior: 'overheat', color: '#ff5722' }
    ]
  });

  /* ===========================================================================
   * BUILT-IN BACKGROUNDS
   * ========================================================================= */
  AB.defineBackground('sky',    { name: 'Sky',    top: '#4fc3f7', bottom: '#e1f5fe', groundTop: '#8bc34a', groundBottom: '#558b2f', cloud: 'rgba(255,255,255,0.85)', clouds: true });
  AB.defineBackground('sunset', { name: 'Sunset', top: '#ff7043', bottom: '#ffccbc', groundTop: '#6d4c41', groundBottom: '#4e342e', cloud: 'rgba(255,210,160,0.55)', clouds: true });
  AB.defineBackground('night',  { name: 'Night',  top: '#141a4e', bottom: '#283593', groundTop: '#37474f', groundBottom: '#263238', cloud: 'rgba(255,255,255,0.12)', stars: true });
  AB.defineBackground('space',  { name: 'Space',  top: '#05010f', bottom: '#180338', groundTop: '#263238', groundBottom: '#0a0a12', cloud: 'rgba(255,255,255,0.06)', stars: true });
  AB.defineBackground('desert', { name: 'Desert', top: '#ffd54f', bottom: '#ffe9a8', groundTop: '#d7ccc8', groundBottom: '#8d6e63', cloud: 'rgba(255,255,220,0.5)', clouds: true });
  AB.defineBackground('cave',   { name: 'Cave',   top: '#211013', bottom: '#3a2226', groundTop: '#5d4037', groundBottom: '#3e2723', cloud: 'rgba(255,255,255,0.04)' });
  AB.defineBackground('snow',   { name: 'Snow',   top: '#b3e5fc', bottom: '#eceff1', groundTop: '#eceff1', groundBottom: '#b0bec5', cloud: 'rgba(255,255,255,0.9)', clouds: true });

  /* ===========================================================================
   * DEFAULTS & NORMALIZATION
   * ========================================================================= */
  AB.defaults = {
    level() {
      return {
        id: 'level_' + Math.floor(performance.now()).toString(36),
        name: 'Untitled Level',
        background: 'sky',
        gravity: { x: 0, y: 1 },
        world: { left: -400, right: 2200, groundY: 550 },
        camera: { start: { x: 150, y: 400 }, zoom: 1 },
        slingshot: { x: 180, y: 430 },
        birds: [],
        pigs: [],
        blocks: [],
        bosses: [],
        props: [],
        starThresholds: [10000, 30000, 60000],
        scripts: [],        // [{ hook, code, name? }]
        intro: null,        // optional story text shown before the level
        outro: null,
        nextLevel: null
      };
    },
    game() {
      return {
        format: 'ab-game',
        version: AB.VERSION,
        title: 'My Angry Birds Game',
        author: '',
        description: '',
        settings: { tuning: {}, startLevel: 0, allowLevelSelect: true },
        story: { intro: null },
        textures: {},                  // key -> url or data-URI
        customMaterials: {},           // id -> material def
        customBirds: {},               // id -> bird def
        customPigs: {},                // id -> pig def
        customBosses: {},              // id -> boss def
        customBackgrounds: {},         // id -> background def
        globalScripts: [],             // [{ hook, code }] run for every level
        levels: []                     // array of level objects (see defaults.level)
      };
    }
  };

  // Fill in any missing fields on a loaded level (backwards/forwards friendly).
  AB.normalizeLevel = function (level) {
    const d = AB.defaults.level();
    const out = Object.assign({}, d, level || {});
    out.gravity = Object.assign({}, d.gravity, level && level.gravity);
    out.world = Object.assign({}, d.world, level && level.world);
    out.camera = Object.assign({}, d.camera, level && level.camera);
    out.slingshot = Object.assign({}, d.slingshot, level && level.slingshot);
    for (const arr of ['birds', 'pigs', 'blocks', 'bosses', 'props', 'scripts']) {
      if (!Array.isArray(out[arr])) out[arr] = [];
    }
    if (!Array.isArray(out.starThresholds)) out.starThresholds = d.starThresholds;
    return out;
  };

  AB.normalizeGame = function (game) {
    const d = AB.defaults.game();
    const out = Object.assign({}, d, game || {});
    out.settings = Object.assign({}, d.settings, game && game.settings);
    out.story = Object.assign({}, d.story, game && game.story);
    for (const obj of ['textures', 'customMaterials', 'customBirds', 'customPigs', 'customBosses', 'customBackgrounds']) {
      if (!out[obj] || typeof out[obj] !== 'object') out[obj] = {};
    }
    if (!Array.isArray(out.globalScripts)) out.globalScripts = [];
    out.levels = (out.levels || []).map(AB.normalizeLevel);
    return out;
  };

  /* Load all custom definitions from a game bundle into the registry. Call
   * before building any level from that game. Returns the normalized game. */
  AB.loadGame = function (game) {
    const g = AB.normalizeGame(game);
    AB.Registry.clearCustom();
    for (const [id, def] of Object.entries(g.customMaterials))  AB.Registry.registerCustom('material', id, def);
    for (const [id, def] of Object.entries(g.customBirds))      AB.Registry.registerCustom('bird', id, def);
    for (const [id, def] of Object.entries(g.customPigs))       AB.Registry.registerCustom('pig', id, def);
    for (const [id, def] of Object.entries(g.customBosses))     AB.Registry.registerCustom('boss', id, def);
    for (const [id, def] of Object.entries(g.customBackgrounds))AB.Registry.registerCustom('background', id, def);
    // Apply tuning overrides
    if (g.settings && g.settings.tuning) Object.assign(AB.TUNING, g.settings.tuning);
    AB.currentGame = g;
    return g;
  };

  /* ---------------------------------------------------------------------------
   * SMALL UTILITIES shared everywhere.
   * ------------------------------------------------------------------------- */
  AB.util = {
    clone: (o) => JSON.parse(JSON.stringify(o)),
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    rand: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    uid: (p) => (p || 'e') + '_' + Math.random().toString(36).slice(2, 9),
    deg2rad: (d) => d * Math.PI / 180,
    rad2deg: (r) => r * 180 / Math.PI
  };

  /* Validate a game object; returns { ok, errors[], warnings[] }. Used by the
   * editor's import and by tests. Non-fatal issues become warnings. */
  AB.validateGame = function (game) {
    const errors = [], warnings = [];
    if (!game || typeof game !== 'object') { errors.push('Game is not an object.'); return { ok: false, errors, warnings }; }
    const g = AB.normalizeGame(game);
    if (!g.levels.length) warnings.push('Game has no levels.');
    g.levels.forEach((lvl, i) => {
      const where = `level[${i}] "${lvl.name}"`;
      if (!AB.background(lvl.background) && !g.customBackgrounds[lvl.background])
        warnings.push(`${where}: unknown background "${lvl.background}".`);
      lvl.blocks.forEach((b, j) => {
        if (!AB.Registry.get('material', b.type) && !g.customMaterials[b.type])
          errors.push(`${where}: block[${j}] unknown material "${b.type}".`);
      });
      lvl.birds.forEach((b, j) => {
        if (!AB.Registry.get('bird', b.type) && !g.customBirds[b.type])
          errors.push(`${where}: bird[${j}] unknown type "${b.type}".`);
      });
      lvl.pigs.forEach((p, j) => {
        if (!AB.Registry.get('pig', p.type) && !g.customPigs[p.type])
          errors.push(`${where}: pig[${j}] unknown type "${p.type}".`);
      });
    });
    return { ok: errors.length === 0, errors, warnings };
  };

})(typeof window !== 'undefined' ? window : globalThis);
