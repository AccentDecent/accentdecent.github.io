# JsRenderLib instructions for AI-generated lessons

Generate one complete HTML document for the requested math or chemistry topic. Use semantic headings, brief explanations, and a meaningful visual change on each step. Sliders should control quantities discussed in the explanation and include units when applicable. Label each visual and explain what the learner should look for.

## Load the library

**Offline with a sidecar file:** Download `js-render-lib.min.js` once, save it next to the HTML, and load it before the lesson code:

```html
<script src="./js-render-lib.min.js"></script>
```

**One offline HTML file:** Read the actual contents of that bundle and insert them in a classic `<script>` before the lesson code. Escape any literal closing-script sequence in the embedded source. If you lack the bundle bytes, use the sidecar approach and provide both files. Keep all lesson code, styles, and other assets local or inline. Avoid module imports and fetches in offline pages.

**Online:** Use the library URL below. If it contains placeholders, use the URL shown in the hosted showcase’s Online tab or fill in the GitHub owner, repository, public tag or commit, and path to the bundle. Online references require a network connection.

```html
<script src="https://cdn.jsdelivr.net/gh/OWNER/JsRenderLib@RELEASE/dist/js-render-lib.min.js"></script>
```

Every function is on the browser global `JsRenderLib`. The browser bundle contains everything the pages need, including LaTeX rendering. Use JavaScript functions for math formulas. Plain text passed to the API is shown as text. Use the equation field or the math renderer for LaTeX. For styled prose, use your own HTML outside the lesson or add elements to the render stage.

## Complete lesson pattern

Put the target in the body, load the bundle, then add this script. Replace the example with topic-specific content.

```html
<div id="lesson"></div>
<script src="./js-render-lib.min.js"></script>
<script>
const { lesson, view3d, surface } = JsRenderLib;
let view;
const demo = lesson('#lesson', {
  steps: [
    { title: 'A bowl', text: 'Positive a curves upward in both directions.', values: { a: 1 } },
    { title: 'A saddle', text: 'Negative a reverses the curvature along y.', values: { a: -1 } }
  ],
  sliders: [ { id: 'a', label: 'Coefficient a', min: -1, max: 1, step: .05, value: 1 } ],
  render(stage, { step, values }) {
    const scene = {
      bounds: { x: [-2, 2], y: [-2, 2], z: [-4, 8] },
      objects: [
        surface((x, y) => x*x + values.a*y*y, {
          x: [-2, 2], y: [-2, 2], color: step === 0 ? '#0b849c' : '#715bb7',
          resolution: 24, thickness: .8
        })
      ]
    };
    if (view) view.setScene(scene);
    else view = view3d(stage, scene, { height: 360, label: 'Quadratic surface with adjustable y curvature' });
  }
});
</script>
```

## Lessons

- `lesson(target, { steps, sliders?, startStep?, labels?, render })` mounts a visualization stage and sidebar. Every target is an HTML element or a matching CSS selector. Mounting replaces the target's children.
- Each step is `{ title, text?, equation?, values? }`. The optional equation is a LaTeX string displayed below the step text. Presets apply each time that step is entered. Sliders absent from the presets retain their values. Step indices start at zero.
- Each slider is `{ id, label, min, max, step?, value?, unit?, format? }`. `step` defaults to 1 and `value` defaults to the minimum. `format(value)` can provide a custom readout.
- `render(stage, { step, current, values })` runs on mount, step changes, and each slider input. To preserve camera and focus, create a view once and call its update method, as above. Use a wrapper inside the stage if you also want captions or multiple visuals. An optional function returned by `render` runs before the next render or on destroy.
- The lesson returns `{ element, stage, state, setStep(index), setValue(id, value), destroy() }`. Call the view's `destroy()` when removing a persistent view. For localization, pass `labels: { previous, next, progress: (current, total) => ... }`. The progress callback uses a one-based current step number.
- The defaults are responsive. Set CSS variables on the lesson host or `.jrl-lesson` to theme it: `--jrl-surface`, `--jrl-text`, `--jrl-muted`, `--jrl-border`, `--jrl-accent`, `--jrl-on-accent`, `--jrl-radius`.

## 3D math

- `view3d(target, scene, options?)` returns `{ element, setScene(scene), setCamera(camera), resetCamera(), destroy() }`. The canvas uses an orthographic projection with z vertical. Drag to orbit. When focused, arrow keys orbit, +/− zoom, and Home resets.
- Scene: `{ objects, bounds?: { x?, y?, z? }, axes?: boolean, axisLabels?: [string,string,string], grid?: boolean }`. Each bound is `[min,max]`. Defaults are x/y `[-3,3]` and z `[-2,3]`. Bounds frame the scene. Set them explicitly for the scale of each lesson. Axes and the floor grid default to visible.
- Options: `{ height?, background?, gridColor?, axisColor?, label?, interactive?, camera?: { yaw?, pitch?, zoom? } }`. Height is in CSS pixels. Angles are in degrees, zoom is a multiplier. Set `interactive: false` for a static view.
- `surface((x,y) => z, { x?, y?, resolution?, color?, opacity?, wireColor?, thickness?, fill?, wire?, shade? })`. Both domains default to `[-2,2]`. Resolution is one number or `[uSegments,vSegments]` up to 100 per direction. Return NaN where a patch is undefined. For separate sheets or branches use separate surfaces.
- `parametric((u,v) => [x,y,z], { u?, v?, ...surfaceStyles })`. Example sphere sampler: `(u,v) => [Math.sin(v)*Math.cos(u), Math.sin(v)*Math.sin(u), Math.cos(v)]` with u `[0,2*Math.PI]` and v `[0,Math.PI]`.
- `line([[x,y,z], ...], { color?, thickness?, opacity?, dashed?, depthTest? })`. Set `depthTest: false` to keep a line visible on top of surfaces. Split discontinuous lines with a non-finite point. `vector(from, to, style?)` uses the same style and draws an arrowhead. `point([x,y,z], { color?, radius?, label?, labelColor?, opacity? })`.

## 2D math

```js
const plot = JsRenderLib.plot2d('#plot', {
  x: [-Math.PI, Math.PI], y: [-1.6, 1.6],
  curves: [
    { fn: x => Math.sin(x), color: '#087c9b', thickness: 3 },
    { fn: x => x, domain: [-1.4, 1.4], color: '#b45b26', dashed: true }
  ],
  points: [{ x: 0, y: 0, label: 'Origin' }]
}, { label: 'Sine and its tangent at the origin' });
```

Use `plot.setPlot(newModel)` to update all curves and points, or `plot.destroy()` to remove it. The model also accepts `axes`, `axisLabels: [xLabel,yLabel]`, `grid`, and `samples`. Curves also accept `opacity` and a `domain`. Return NaN for gaps. Split curves at known discontinuities using domains. Points also accept `radius` and `color`. View options also accept `height`, `background`, `axisColor`, `gridColor`, and `formatTick(value)`.

- Use `areas: [{ fn, domain: [left, right], baseline?, color?, negativeColor?, opacity? }]` to shade between two functions. The baseline defaults to zero. A negative color applies where the curve lies below the baseline. Return NaN for gaps. Omit an area when the integration limits coincide. Areas draw the shape. Calculate the integral separately for the numeric explanation.

## LaTeX

```js
const formula = JsRenderLib.math('#formula', String.raw`\int_0^b x^2\,\mathrm{d}x = \frac{b^3}{3}`, {
  display: true,
  color: '#087263',
  fontSize: 22
});
formula.setLatex(String.raw`\int_0^2 x^2\,\mathrm{d}x = \frac{8}{3}`);
```

- Pass the LaTeX body without dollar signs or other math delimiters. In JavaScript, use a String.raw tagged template or escape each backslash.
- Set `display: true` for a display equation. Default inline math works inside surrounding prose (e.g. mount it in a span). Other options are `color`, `fontSize` in pixels, `macros` (a map from LaTeX commands to expansion strings), and `throwOnError` (defaults to false and shows invalid input in the view).
- The returned view exposes `element`, `setLatex(source)`, and `destroy()`. Use it for formulas that change with steps or sliders. For a single static equation per step provide a LaTeX string in the step’s `equation` field.
- The single bundle emits native MathML using KaTeX. There are no external stylesheets, font downloads, or math scripts to add. Use a current browser with native MathML support.

## Lewis structures

Use `lewis(target, diagramOrPreset, options?)`. It returns `{ element, setDiagram(diagramOrPreset), destroy() }`. Presets are `water`, `ammonia`, `methane`, `carbonDioxide`, `ammonium`, and `carbonate`. You can call `molecule(name)` to obtain a fresh editable diagram based on a preset.

```js
const view = JsRenderLib.lewis('#chem', {
  label: 'Nitrogen molecule with a triple bond and two lone pairs',
  atoms: [
    { id: 'left', symbol: 'N', x: -48, y: 0, electrons: [180] },
    { id: 'right', symbol: 'N', x: 48, y: 0, electrons: [0] }
  ],
  bonds: [{ from: 'left', to: 'right', order: 3 }]
}, { height: 280, bondThickness: 2.2, electronColor: '#127f96' });
```

- Atom x/y are diagram coordinates with y down. Spread connected atoms by roughly 75 to 110 units. Use unique IDs and place electrons away from bonds and formal charges.
- A numeric electron entry is a lone pair at that angle. Use `{ angle, count: 1, distance?, color? }` for a single electron. Use `count: 2` to style a pair. Angles are degrees clockwise from the right. Zero points right, 90 down, 180 left, and −90 up.
- Atoms accept `charge`, `chargeAngle` (default −42°), `color`, and `fontSize`. Bonds default to order 1 and accept `order: 1|2|3`, `color`, `thickness`, and `dashed`.
- Pass `charge` on the whole diagram for the net charge. A nonzero net charge enables brackets by default. Set `brackets` to override. Set distinct per-atom `charge` values for formal charges. The library depicts the supplied model. Compute and verify electron counts, bond orders, and charges as part of the lesson.
- View options: `{ height?, background?, color?, bondColor?, electronColor?, chargeColor?, bracketColor?, fontSize?, bondThickness?, bondSpacing?, electronRadius?, padding?, scale?, showCharges? }`. The diagram fits the viewport automatically. Higher scale zooms in. On later steps, pass a new explicit diagram or preset to `setDiagram`.
