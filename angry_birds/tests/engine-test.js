/* =============================================================================
 * ENGINE TEST — headless, dependency-free (only the vendored Matter.js).
 * Run:  node tests/engine-test.js
 * Validates the impact model, abilities, explosions, boss phases, scripting,
 * buoyancy, and the example game's levels/custom defs — no browser required.
 * ========================================================================== */
const path = require('path');
const ENG = path.join(__dirname, '..', 'engine');
global.Matter = require(path.join(ENG, 'matter.min.js'));
['core.js', 'assets.js', 'camera.js', 'physics.js', 'abilities.js', 'scripting.js', 'boss.js'].forEach(f => require(path.join(ENG, f)));
const AB = global.AB;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ FAIL:', m); } };
const stepN = (n) => { for (let i = 0; i < n; i++) AB.Physics.step(AB.TUNING.fixedStep); };

function newWorld() {
  AB.Physics.init({ gravity: { x: 0, y: 1 } });
  AB.Physics.setupWorld({ left: -400, right: 2000, groundY: 550 });
  AB.Physics.onScore = () => {};
  AB.Physics.onImpact = (a, b, impact, rel) => {
    if (impact < AB.TUNING.minImpact) return;
    const T = AB.TUNING;
    const h = (x, y) => {
      if (!x.ref || !y.ref || !x.ref.alive) return;
      if (x.ref.kind === 'bird') {
        if (y.ref.kind === 'block') AB.Physics.damageBlock(y, impact * T.dmgBirdToBlock);
        else if (y.ref.kind === 'pig') AB.Physics.damagePig(y, impact * T.dmgBirdToPig);
        else if (y.ref.kind === 'boss') AB.Physics.damageBoss(y, impact * T.dmgBirdToBoss);
      }
    };
    h(a, b); h(b, a);
  };
}

// impact model
newWorld();
let block = AB.Physics.createBlock({ type: 'wood', x: 520, y: 470, angle: 90 });
let bird = AB.Physics.createBird({ type: 'red', x: 320, y: 470 });
AB.Physics.launch(bird, 22, 0); stepN(40);
ok(!block.ref.alive, 'fast red bird destroys a wood beam');

newWorld();
let stone = AB.Physics.createBlock({ type: 'stone', x: 520, y: 470, angle: 90 });
let slow = AB.Physics.createBird({ type: 'red', x: 320, y: 470 });
AB.Physics.launch(slow, 3, 0); stepN(40);
ok(stone.ref.alive, 'slow bird does not destroy stone');

// abilities
newWorld();
let sb = AB.Physics.createBird({ type: 'blues', x: 300, y: 400 });
AB.Physics.launch(sb, 12, -4); stepN(3);
const n0 = AB.Physics.byKind('bird').length; AB.Abilities.activate(sb);
ok(AB.Physics.byKind('bird').length > n0, 'blues split adds birds');

// explosion falloff
newWorld();
let near = AB.Physics.createBlock({ type: 'wood', x: 520, y: 500 });
let far = AB.Physics.createBlock({ type: 'wood', x: 980, y: 500 });
AB.Physics.explode(500, 500, 120, 0.2); stepN(1);
ok(!near.ref.alive && far.ref.alive, 'explosion falls off with distance');

// boss phases
newWorld();
let boss = AB.Physics.createBoss({ type: 'king_pig_boss', x: 800, y: 500 }); AB.Boss.add(boss);
ok(AB.Physics.damageBoss(boss, boss.ref.maxHp * 0.45) === 'phase' && boss.ref.phaseIndex === 1, 'boss changes phase');
ok(AB.Physics.damageBoss(boss, boss.ref.maxHp) === 'dead', 'boss dies on overkill');

// scripting
const runner = AB.Scripting.buildRunner([[{ hook: 'onUpdate', code: 'ctx.store.n=(ctx.store.n||0)+1;' }]]);
runner.run('onUpdate', null, 16); runner.run('onUpdate', null, 16);
ok(runner.store.n === 2, 'hook store persists across calls');

// buoyancy
newWorld();
let bal = AB.Physics.createBlock({ type: 'balloon', x: 600, y: 500 }); const y0 = bal.body.position.y;
stepN(60); ok(bal.body.position.y < y0, 'balloon floats up');

// example game validates + custom scripted ability fires
const GAME = require(path.join(__dirname, '..', 'data', 'example-game.js'));
ok(AB.validateGame(GAME).ok, 'example game validates');
AB.loadGame(GAME); newWorld();
let storm = AB.Physics.createBird({ type: 'storm', x: 300, y: 300 });
AB.Physics.launch(storm, 10, -4); stepN(3);
const p0 = AB.Physics.byKind('projectile').length; AB.Abilities.activate(storm);
ok(AB.Physics.byKind('projectile').length - p0 === 5, 'custom Storm Bird ability spawns lightning');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
