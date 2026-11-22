(() => {
  'use strict';
  const { lesson, view3d, surface, line, lewis, molecule, plot2d, math } = JsRenderLib;
  const cyan = '#84eaf0', gold = '#ffcb84', axis = '#adbed6', grid = '#253c55';
  const viewport = { height: 368, axisColor: axis, gridColor: grid };

  view3d('#hero-graph', {
    bounds: { x: [-2.7, 2.7], y: [-2.7, 2.7], z: [-2.5, 2.5] },
    grid: false,
    objects: [
      surface((x, y) => (x * x - y * y) / 2, {
        x: [-2.45, 2.45], y: [-2.45, 2.45], resolution: 22, color: '#1cacce',
        opacity: .74, wireColor: 'rgba(154, 248, 254, .75)', thickness: .72
      })
    ]
  }, { height: 330, interactive: false, axisColor: '#9bb4d7', camera: { yaw: -52, pitch: 23, zoom: 1.28 } });

  math('#hero-equation', String.raw`z=\frac{1}{2}(x^2-y^2)`);

  function visual(stage, hint) {
    const target = document.createElement('div');
    const caption = document.createElement('p');
    caption.className = 'scene-caption';
    stage.append(target, caption);
    if (hint) {
      const note = document.createElement('p');
      note.className = 'scene-hint';
      note.textContent = hint;
      stage.append(note);
    }
    return { target, caption };
  }

  function riseAndFall(panel) {
    let view, parts;
    lesson(panel, {
      steps: [
        {
          title: 'Curve up in both directions',
          text: 'With a = 1, both x² and y² raise the surface. Follow the gold curve to see what happens along the y-axis.',
          values: { a: 1 }
        },
        {
          title: 'Flatten along y',
          text: 'With a = 0, changing y has no effect on height. The same parabola repeats for every value of y.',
          values: { a: 0 }
        },
        {
          title: 'Make a saddle',
          text: 'With a = −1, the surface rises along x and falls along y. The origin sits where those two directions meet.',
          values: { a: -1 }
        }
      ],
      sliders: [{ id: 'a', label: 'y curvature', min: -1, max: 1, step: .05, format: value => 'a = ' + value.toFixed(2) }],
      render(stage, { values }) {
        const { a } = values;
        parts ??= visual(stage, 'Drag or use arrow keys to rotate');
        parts.caption.textContent = 'z = x² ' + (a < 0 ? '−' : '+') + ' ' + Math.abs(a).toFixed(2) + 'y²';
        const ySlice = Array.from({ length: 45 }, (_, i) => {
          const y = -1.5 + 3 * i / 44;
          return [0, y, a * y * y];
        });
        const scene = {
          bounds: { x: [-1.8, 1.8], y: [-1.8, 1.8], z: [-2.35, 4.55] },
          objects: [
            surface((x, y) => x * x + a * y * y, {
              x: [-1.5, 1.5], y: [-1.5, 1.5], color: '#197eaa', opacity: .94,
              wireColor: 'rgba(99, 224, 242, .64)', thickness: .72, resolution: 22
            }),
            line(ySlice, { color: gold, thickness: 2.15, depthTest: false })
          ]
        };
        if (view) view.setScene(scene);
        else view = view3d(parts.target, scene, {
          ...viewport, label: 'Quadratic surface with the y-axis cross-section highlighted',
          camera: { yaw: -40, pitch: 21, zoom: 1.14 }
        });
      }
    });
  }

  function carbonate(panel) {
    let view, parts;
    lesson(panel, {
      steps: [
        { title: 'Build the skeleton', text: 'Place carbon in the middle and connect the three oxygens. Carbonate has 24 valence electrons. Three single bonds use six of them.' },
        { title: 'Complete the octets', text: 'Place the remaining electrons on oxygen. Use one oxygen lone pair to make a C=O double bond and complete carbon’s octet. The two single-bonded oxygens each carry a −1 formal charge.' },
        { title: 'Compare a resonance contributor', text: 'Any of the three oxygens can be drawn with the double bond. The real ion has three equivalent C–O bonds and a net charge of −2.' }
      ],
      render(stage, { step }) {
        parts ??= visual(stage);
        parts.caption.textContent = ['CO₃²⁻ · Skeleton', 'CO₃²⁻ · One contributor', 'CO₃²⁻ · Another contributor'][step];
        const base = molecule('carbonate');
        const doubleBond = step === 2 ? 'O1' : 'O0';
        const atoms = base.atoms.map(atom => {
          if (atom.id === 'C') return atom;
          const isDouble = atom.id === doubleBond;
          const angle = Math.atan2(atom.y - 10, atom.x) * 180 / Math.PI;
          return {
            ...atom,
            color: step && isDouble ? cyan : undefined,
            charge: step && !isDouble ? -1 : 0,
            chargeAngle: angle - 42,
            electrons: step === 0 ? [] : isDouble ? [angle - 50, angle + 50] : [angle - 85, angle, angle + 85]
          };
        });
        const bonds = base.bonds.map(bond => {
          const active = step > 0 && bond.to === doubleBond;
          return { ...bond, order: active ? 2 : 1, color: active ? cyan : undefined };
        });
        const diagram = { ...base, atoms, bonds, label: parts.caption.textContent };
        if (view) view.setDiagram(diagram);
        else view = lewis(parts.target, diagram, {
          height: viewport.height, color: '#e8f1ff', bondColor: '#aec3e0',
          electronColor: '#a5c9ec', chargeColor: gold, bracketColor: '#91a6c4',
          padding: 39, bondThickness: 2.7
        });
      }
    });
  }

  function waves(panel) {
    let view, parts;
    lesson(panel, {
      steps: [
        {
          title: 'Start with one wave',
          text: 'At frequency 1, the sine curve repeats every 2π units. Its amplitude controls how high the peaks rise.',
          values: { f: 1, a: 1 }
        },
        {
          title: 'Double the frequency',
          text: 'At frequency 2, the wave repeats every π units. Twice as many cycles fit in the same space.',
          values: { f: 2, a: 1 }
        },
        {
          title: 'Change the amplitude',
          text: 'An amplitude of 1.5 moves the peaks and troughs farther from zero while keeping the same period.',
          values: { f: 2, a: 1.5 }
        }
      ],
      sliders: [
        { id: 'f', label: 'Frequency multiplier', min: .5, max: 3, step: .25, unit: '×' },
        { id: 'a', label: 'Amplitude', min: .25, max: 2, step: .25 }
      ],
      render(stage, { values: { f, a } }) {
        parts ??= visual(stage);
        parts.caption.textContent = 'y = ' + a + ' sin(' + f + 'x)';
        const model = {
          x: [-Math.PI, Math.PI], y: [-2.25, 2.25],
          curves: [
            { fn: Math.sin, color: '#8298b9', thickness: 1.6, dashed: true, opacity: .7 },
            { fn: x => a * Math.sin(f * x), color: cyan, thickness: 2.7 }
          ]
        };
        if (view) view.setPlot(model);
        else view = plot2d(parts.target, model, { ...viewport, label: 'Sine wave with adjustable frequency and amplitude' });
      }
    });
  }

  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const examples = [riseAndFall, carbonate, waves];
  const initialized = new Set();

  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = !selected;
      if (selected && !initialized.has(i)) {
        examples[i](panel);
        initialized.add(i);
      }
    });
    if (focus) tabs[index].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      let next;
      switch (event.key) {
        case 'ArrowRight': next = (index + 1) % tabs.length; break;
        case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
        case 'Home': next = 0; break;
        case 'End': next = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      selectTab(next, true);
    });
  });
  selectTab(0);

  const { text: guide, cdnUrl, version } = window.JRL_SHOWCASE_DOCS;
  const hasPinnedUrl = !cdnUrl.includes('/OWNER/');
  const isHosted = location.protocol === 'https:' || location.protocol === 'http:';
  const useHostedUrl = isHosted && !hasPinnedUrl;
  const onlineUrl = useHostedUrl ? document.getElementById('download-bundle').href : cdnUrl;
  const docs = guide.replaceAll(cdnUrl, onlineUrl);
  if (useHostedUrl) {
    const file = new Blob([docs], { type: 'text/markdown;charset=utf-8' });
    document.getElementById('download-docs').href = URL.createObjectURL(file);
  }
  const status = document.getElementById('copy-status');
  const dialog = document.getElementById('docs-dialog');
  const textarea = document.getElementById('docs-text');
  textarea.value = docs;
  document.getElementById('version').textContent = 'v' + version;
  let toastTimer;

  async function copyDocs() {
    try {
      await navigator.clipboard.writeText(docs);
      status.textContent = 'AI docs copied';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { status.textContent = ''; }, 3000);
    } catch {
      dialog.showModal();
      textarea.focus();
      textarea.select();
    }
  }

  for (const button of document.querySelectorAll('.copy-docs')) button.addEventListener('click', copyDocs);

  let onlineNote = 'Replace the sample URL with a public GitHub Pages or jsDelivr link.';
  if (useHostedUrl) onlineNote = 'Loads the bundle directly from this site.';
  if (hasPinnedUrl) onlineNote = 'Loads the pinned GitHub revision from jsDelivr.';
  const modes = document.querySelectorAll('[data-mode]');
  for (const button of modes) {
    button.addEventListener('click', () => {
      const online = button.dataset.mode === 'online';
      for (const mode of modes) mode.setAttribute('aria-pressed', String(mode === button));
      document.getElementById('code-source').textContent = '"' + (online ? onlineUrl : './js-render-lib.min.js') + '"';
      document.getElementById('code-note').textContent = online
        ? onlineNote
        : 'Put the bundle in the same folder as the HTML.';
    });
  }
})();
