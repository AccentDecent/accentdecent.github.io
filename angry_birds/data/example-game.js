/* =============================================================================
 * EXAMPLE GAME — "The Great Egg Heist"
 * -----------------------------------------------------------------------------
 * A complete, self-contained demo of the framework: 5 levels, a custom block, a
 * custom bird with a scripted ability, a scripted boss with phases + camera
 * cutscene, and a story. Exposed as window.AB_EXAMPLE_GAME so play.html works
 * from file:// with no server. data/game.json is generated from this object.
 * ========================================================================== */
(function (root) {
  'use strict';
  const G = 550;                     // ground line for every level

  // A little "hut": two vertical support beams + a roof beam, pig on the ground
  // between them. Beams are 88×22; rotating a beam 90° makes it 22 wide × 88 tall.
  function hut(cx, mat, roofMat) {
    const supY = G - 44;             // vertical beam center rests on the ground
    const roofY = G - 99;            // roof sits on top of the supports
    return [
      { type: mat, x: cx - 34, y: supY, angle: 90 },
      { type: mat, x: cx + 34, y: supY, angle: 90 },
      { type: roofMat || mat, x: cx, y: roofY, width: 88, height: 22, angle: 0 }
    ];
  }
  const pigAt = (x, type) => ({ type: type || 'normal', x, y: G - (type === 'big' ? 30 : type === 'tiny' ? 12 : 20) });

  /* ---- LEVELS ----------------------------------------------------------- */
  const level1 = {
    id: 'l1', name: 'First Nest', background: 'sky',
    world: { left: -400, right: 1600, groundY: G },
    camera: { start: { x: 560, y: 360 }, zoom: 0.72 }, slingshot: { x: 180, y: 430 },
    intro: 'The pigs have stolen the eggs again. Start small — knock down their flimsy wooden huts!',
    birds: [{ type: 'red' }, { type: 'red' }, { type: 'chuck' }],
    pigs: [pigAt(760), pigAt(980)],
    blocks: [].concat(
      hut(760, 'wood'),
      [{ type: 'wood_block', x: 940, y: G - 22 }, { type: 'wood_block', x: 1020, y: G - 22 }]
    ),
    starThresholds: [8000, 15000, 25000]
  };

  const level2 = {
    id: 'l2', name: 'Stone Cold', background: 'desert',
    world: { left: -400, right: 1800, groundY: G },
    camera: { start: { x: 620, y: 350 }, zoom: 0.66 }, slingshot: { x: 180, y: 430 },
    intro: 'Now they hide behind stone. Wood birds bounce off — bring the Bomb.',
    birds: [{ type: 'bomb' }, { type: 'chuck' }, { type: 'red' }, { type: 'bomb' }],
    pigs: [pigAt(820, 'helmet'), pigAt(1080), pigAt(1180, 'big')],
    blocks: [].concat(
      hut(820, 'stone'),
      hut(1130, 'stone', 'crystal'),
      [{ type: 'crystal', x: 1000, y: G - 22 }, { type: 'crystal', x: 1000, y: G - 66 }]
    ),
    starThresholds: [15000, 30000, 50000],
    scripts: [{ hook: 'onLevelStart', code: "ctx.message('Tap a flying Bomb bird to detonate it early!', 3000);" }]
  };

  const level3 = {
    id: 'l3', name: 'Ice Palace', background: 'night',
    world: { left: -400, right: 1800, groundY: G },
    camera: { start: { x: 640, y: 340 }, zoom: 0.64 }, slingshot: { x: 180, y: 430 },
    intro: 'A frozen fortress under the stars. Ice shatters easily — split birds and the Ice Bird excel here.',
    birds: [{ type: 'blues' }, { type: 'ice_bird' }, { type: 'blues' }, { type: 'red' }],
    pigs: [pigAt(760), pigAt(980), pigAt(1180, 'helmet')],
    blocks: [].concat(
      hut(760, 'ice'),
      hut(980, 'ice', 'glass'),
      hut(1180, 'ice'),
      [{ type: 'glass', x: 870, y: G - 22 }, { type: 'glass', x: 1080, y: G - 22 }]
    ),
    starThresholds: [16000, 34000, 56000]
  };

  const level4 = {
    id: 'l4', name: 'Storm Rising', background: 'sunset',
    world: { left: -400, right: 1900, groundY: G },
    camera: { start: { x: 660, y: 340 }, zoom: 0.62 }, slingshot: { x: 180, y: 430 },
    intro: 'Meet the STORM BIRD — tap it in flight to call a lightning barrage. Aim near the TNT!',
    birds: [{ type: 'storm' }, { type: 'chuck' }, { type: 'bomb' }, { type: 'red' }],
    pigs: [pigAt(780), pigAt(900), pigAt(1120, 'big'), pigAt(1260)],
    blocks: [].concat(
      hut(780, 'wood'),
      [{ type: 'tnt', x: 900, y: G - 20 }, { type: 'tnt', x: 940, y: G - 20 }],
      hut(1120, 'stone'),
      [{ type: 'wood_plank', x: 1000, y: G - 130, width: 260, height: 16, angle: 0 },
       { type: 'wood', x: 1000, y: G - 44, angle: 90 }, { type: 'balloon', x: 1000, y: G - 200 }]
    ),
    starThresholds: [22000, 42000, 70000],
    scripts: [{ hook: 'onBirdLaunch', code: "if (ctx.event.track.ref.type==='storm') ctx.message('Tap to unleash the storm!', 2000);" }]
  };

  const level5 = {
    id: 'l5', name: "King Pig's Keep", background: 'cave',
    world: { left: -400, right: 2000, groundY: G },
    camera: { start: { x: 700, y: 330 }, zoom: 0.58 }, slingshot: { x: 180, y: 430 },
    intro: 'The King Pig himself guards the eggs. Break his defenses, then bring him down through all THREE phases!',
    outro: 'The eggs are safe... for now. The pigs will surely return. 🥚',
    birds: [{ type: 'bomb' }, { type: 'storm' }, { type: 'terence' }, { type: 'bomb' }, { type: 'chuck' }, { type: 'red' }],
    pigs: [pigAt(820), pigAt(980)],
    bosses: [{ type: 'big_boss', x: 1250, y: G - 52 }],
    blocks: [].concat(
      hut(820, 'stone'),
      hut(980, 'stone', 'steel'),
      [{ type: 'steel', x: 1120, y: G - 44, angle: 90 }, { type: 'crystal', x: 1120, y: G - 120, width: 60, height: 60 }]
    ),
    starThresholds: [50000, 90000, 140000],
    scripts: [
      { hook: 'onLevelStart', name: 'intro cutscene', code:
        "ctx.cutscene([\n" +
        "  { x: 1250, y: 400, zoom: 0.7, ms: 1600, hold: 500 },\n" +
        "  { x: ctx.game.slingshot.x + 220, y: 380, zoom: 0.72, ms: 1200 }\n" +
        "], () => {});\n" +
        "ctx.after(3600, () => ctx.message('Defeat the King Pig!', 2500));" },
      { hook: 'onBossPhaseChange', name: 'phase fx', code:
        "ctx.shake(12, 500);\n" +
        "ctx.explode(ctx.event.track.body.position.x, ctx.event.track.body.position.y, 120, 0.12);\n" +
        "ctx.message('The King Pig grows ' + ctx.event.phase.name + '!', 2200);" }
    ]
  };

  /* ---- GAME ------------------------------------------------------------- */
  const GAME = {
    format: 'ab-game', version: '2.0.0', id: 'egg_heist',
    title: 'The Great Egg Heist',
    author: 'AB Framework',
    description: '5 levels · custom birds & blocks · a scripted boss. A demo of everything the framework can do.',
    settings: { tuning: {}, startLevel: 0, allowLevelSelect: true },
    story: {
      intro: 'The green pigs have stolen the eggs and fortified their island.\nLaunch your flock, smash their defenses, and take back what is yours!',
      outro: 'You beat the King Pig and rescued every egg. A hero\'s work is never done...'
    },
    textures: {},

    /* A brand-new block type, defined entirely in data. */
    customMaterials: {
      crystal: {
        name: 'Crystal', icon: '🔮', shape: 'rect', hardness: 130, density: 0.006,
        friction: 0.6, restitution: 0.25, breakable: true,
        color: '#8e6fe0', stroke: '#5b3fb0', particle: '#c3aef0', score: 1800, size: { w: 44, h: 44 }
      }
    },

    /* A brand-new bird whose power is written as a script (ability:"custom"). */
    customBirds: {
      storm: {
        name: 'Storm Bird', icon: '⚡', description: 'Tap in flight to call a lightning barrage.',
        radius: 18, density: 0.0072, restitution: 0.3, color: '#5c6bc0', stroke: '#303f9f',
        ability: 'custom',
        abilityScript:
          "const p = ctx.bird.body.position;\n" +
          "ctx.shake(7, 350);\n" +
          "for (let i = 0; i < 5; i++) {\n" +
          "  const proj = ctx.spawnProjectile(p.x + (i - 2) * 26, p.y - 8, (i - 2) * 2.2, 7, { color: '#b3e5fc', radius: 7 });\n" +
          "  proj.ref.ttl = 650 + i * 45;\n" +
          "  proj.ref.onExpire = (t) => ctx.explode(t.body.position.x, t.body.position.y, 78, 0.17);\n" +
          "}\n" +
          "ctx.setVelocity(ctx.bird, ctx.bird.body.velocity.x * 0.5, -5);"
      }
    },

    /* A scripted boss: three phases, auto camera on the second phase, a taunt. */
    customBosses: {
      big_boss: {
        name: 'King Pig', icon: '👹', radius: 52, density: 0.014, hp: 1800,
        color: '#d4a017', stroke: '#8b6914', score: 60000,
        phases: [
          { name: 'Smug', hpThreshold: 1.0, behavior: 'charge', color: '#d4a017' },
          { name: 'Furious', hpThreshold: 0.55, behavior: 'shoot', color: '#e08a17', camera: { zoom: 0.7, ms: 700 } },
          { name: 'Enraged', hpThreshold: 0.22, behavior: 'rage', color: '#e53935', camera: { zoom: 0.62, ms: 700 } }
        ],
        onSpawn: "ctx.boss.ref.vars.taunted = false;",
        onUpdate: "if (!ctx.boss.ref.vars.taunted && ctx.time > 4000) { ctx.boss.ref.vars.taunted = true; ctx.message('Ho ho! You cannot stop the King!', 2200); }"
      }
    },

    customPigs: {}, customBackgrounds: {},
    globalScripts: [],
    levels: [level1, level2, level3, level4, level5]
  };

  root.AB_EXAMPLE_GAME = GAME;
  if (typeof module !== 'undefined' && module.exports) module.exports = GAME;
})(typeof window !== 'undefined' ? window : globalThis);
