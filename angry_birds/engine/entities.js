/* =============================================================================
 * ANGRY BIRDS FRAMEWORK — ENTITY RENDERING
 * -----------------------------------------------------------------------------
 * Draws each entity in WORLD space (the renderer has already applied the camera
 * transform). Every draw checks AB.Assets for a texture override first and falls
 * back to procedural vector art. This is where custom textures actually appear.
 * ========================================================================== */

(function (root) {
  'use strict';
  const AB = root.AB = root.AB || {};

  const Entities = AB.Entities = {

    draw(ctx, track) {
      switch (track.ref.kind) {
        case 'block': return this.drawBlock(ctx, track);
        case 'bird':  return this.drawBird(ctx, track);
        case 'pig':   return this.drawPig(ctx, track);
        case 'boss':  return this.drawBoss(ctx, track);
        case 'egg':   return this.drawEgg(ctx, track);
        case 'projectile': return this.drawProjectile(ctx, track);
        default:      return this.drawDebris(ctx, track);
      }
    },

    /* ---- blocks ----------------------------------------------------------- */
    drawBlock(ctx, track) {
      const b = track.body, ref = track.ref, def = ref.def;
      const tex = AB.Assets.resolve(ref.texture, def, ref.type);
      const w = ref.width, h = ref.height, shape = ref.shape;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);

      if (shape === 'circle') {
        const r = Math.max(w, h) / 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        if (tex) { ctx.save(); ctx.clip(); ctx.drawImage(tex, -r, -r, r * 2, r * 2); ctx.restore(); ctx.strokeStyle = def.stroke; ctx.lineWidth = 2; ctx.stroke(); }
        else { ctx.fillStyle = def.color; ctx.fill(); ctx.strokeStyle = def.stroke; ctx.lineWidth = 2; ctx.stroke(); }
      } else if (shape === 'rect') {
        if (tex) { ctx.drawImage(tex, -w / 2, -h / 2, w, h); ctx.strokeStyle = def.stroke; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h); }
        else {
          ctx.fillStyle = def.color; ctx.strokeStyle = def.stroke; ctx.lineWidth = 2;
          roundRect(ctx, -w / 2, -h / 2, w, h, 2); ctx.fill(); ctx.stroke();
          // subtle grain highlight
          ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-w / 2 + 3, -h / 2 + 3); ctx.lineTo(w / 2 - 3, -h / 2 + 3); ctx.stroke();
        }
      } else {
        // polygon / triangle — path from world vertices (relative to center)
        const verts = b.vertices;
        ctx.restore(); ctx.save();       // draw polygon in world space directly
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
        ctx.closePath();
        if (tex) { ctx.save(); ctx.clip(); const bb = boundsOf(verts); ctx.drawImage(tex, bb.x, bb.y, bb.w, bb.h); ctx.restore(); }
        else { ctx.fillStyle = def.color; ctx.fill(); }
        ctx.strokeStyle = def.stroke; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        this._blockOverlays(ctx, track, true);
        return;
      }

      this._blockOverlaysLocal(ctx, track);
      ctx.restore();
    },

    // overlays drawn in local (translated/rotated) space
    _blockOverlaysLocal(ctx, track) {
      const ref = track.ref, def = ref.def, w = ref.width, h = ref.height;
      if (ref.frozen) { ctx.fillStyle = 'rgba(180,230,250,0.35)'; ctx.fillRect(-w / 2, -h / 2, w, h); }
      if (ref.explosive) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.28); ctx.lineTo(w * 0.28, h * 0.28);
        ctx.moveTo(w * 0.28, -h * 0.28); ctx.lineTo(-w * 0.28, h * 0.28); ctx.stroke();
      }
      if (ref.breakable && ref.hp < ref.maxHp * 0.55) drawCracks(ctx, w, h, 1 - ref.hp / ref.maxHp);
    },

    // overlays for polygon blocks (drawn in world space)
    _blockOverlays(ctx, track) {
      const ref = track.ref, b = track.body;
      if (ref.breakable && ref.hp < ref.maxHp * 0.55) {
        ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
        drawCracks(ctx, ref.width * 0.7, ref.height * 0.7, 1 - ref.hp / ref.maxHp); ctx.restore();
      }
    },

    /* ---- birds ------------------------------------------------------------ */
    drawBird(ctx, track) {
      const b = track.body, ref = track.ref;
      const def = ref.def || AB.birdDef(ref.type) || {};
      const r = ref.radius;
      const tex = AB.Assets.resolve(ref.texture, def, ref.type);
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);

      if (tex) {
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(tex, -r, -r, r * 2, r * 2); ctx.restore();
        ctx.strokeStyle = def.stroke || '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = def.color || '#e53935'; ctx.fill();
        ctx.strokeStyle = def.stroke || '#b71c1c'; ctx.lineWidth = 2; ctx.stroke();
        // face
        const eyeY = -r * 0.18;
        ctx.fillStyle = '#fff';
        circle(ctx, -r * 0.3, eyeY, r * 0.34); circle(ctx, r * 0.3, eyeY, r * 0.34);
        ctx.fillStyle = '#000';
        circle(ctx, -r * 0.24, eyeY, r * 0.16); circle(ctx, r * 0.36, eyeY, r * 0.16);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2.2;
        line(ctx, -r * 0.58, eyeY - r * 0.32, -r * 0.08, eyeY - r * 0.12);
        line(ctx, r * 0.58, eyeY - r * 0.32, r * 0.08, eyeY - r * 0.12);
        ctx.fillStyle = '#ff8f00';
        ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.08); ctx.lineTo(r * 1.15, r * 0.16); ctx.lineTo(r * 0.5, r * 0.34); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();

      // ability-ready pip (screen-aligned, not rotated)
      if (!ref.abilityUsed && ref.ability && ref.ability !== 'none' && !ref.isMini) {
        ctx.save(); ctx.fillStyle = 'rgba(255,240,120,0.95)';
        circle(ctx, b.position.x, b.position.y - r - 7, 3.5); ctx.restore();
      }
    },

    /* ---- pigs ------------------------------------------------------------- */
    drawPig(ctx, track) {
      const b = track.body, ref = track.ref;
      const def = ref.def || AB.pigDef(ref.type) || {};
      const r = ref.radius;
      const tex = AB.Assets.resolve(ref.texture, def, ref.type);
      const x = b.position.x, y = b.position.y;
      ctx.save(); ctx.translate(x, y);

      if (tex) {
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(tex, -r, -r, r * 2, r * 2); ctx.restore();
        ctx.strokeStyle = def.stroke || '#3e8e2f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = def.color || '#63c74d'; ctx.fill();
        ctx.strokeStyle = def.stroke || '#3e8e2f'; ctx.lineWidth = 2; ctx.stroke();
        if (def.armor || (def.id === 'helmet')) {
          ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 1.02, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = '#546e7a'; ctx.lineWidth = 2; ctx.stroke();
        }
        const eyeY = -r * 0.12;
        ctx.fillStyle = '#fff'; circle(ctx, -r * 0.3, eyeY, r * 0.3); circle(ctx, r * 0.3, eyeY, r * 0.3);
        ctx.fillStyle = '#000'; circle(ctx, -r * 0.24, eyeY, r * 0.13); circle(ctx, r * 0.36, eyeY, r * 0.13);
        ctx.fillStyle = '#a5d6a7'; ctx.beginPath(); ctx.ellipse(0, r * 0.28, r * 0.5, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3e8e2f'; circle(ctx, -r * 0.15, r * 0.25, r * 0.09); circle(ctx, r * 0.15, r * 0.25, r * 0.09);
      }
      ctx.restore();
      if (ref.hp < ref.maxHp) hpBar(ctx, x, y - r - 9, r * 1.6, ref.hp / ref.maxHp);
    },

    /* ---- bosses ----------------------------------------------------------- */
    drawBoss(ctx, track) {
      const b = track.body, ref = track.ref;
      const def = ref.def || {};
      const r = ref.radius;
      const phase = ref.phases[ref.phaseIndex] || ref.phases[0] || {};
      const color = phase.color || def.color || '#d4a017';
      const tex = AB.Assets.resolve(ref.texture, def, ref.type);
      const x = b.position.x, y = b.position.y;
      ctx.save(); ctx.translate(x, y);
      // aura
      const g = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.6);
      g.addColorStop(0, hexA(color, 0.35)); g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();

      if (tex) {
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(tex, -r, -r, r * 2, r * 2); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
        // crown
        ctx.fillStyle = '#ffd700'; ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.85); ctx.lineTo(-r * 0.28, -r * 1.2); ctx.lineTo(-r * 0.1, -r * 0.78);
        ctx.lineTo(r * 0.1, -r * 1.2); ctx.lineTo(r * 0.28, -r * 0.78); ctx.lineTo(r * 0.5, -r * 0.85);
        ctx.lineTo(r * 0.4, -r * 0.6); ctx.lineTo(-r * 0.4, -r * 0.6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; circle(ctx, -r * 0.25, -r * 0.15, r * 0.24); circle(ctx, r * 0.25, -r * 0.15, r * 0.24);
        ctx.fillStyle = '#c62828'; circle(ctx, -r * 0.2, -r * 0.12, r * 0.11); circle(ctx, r * 0.3, -r * 0.12, r * 0.11);
      }
      ctx.restore();

      // big HP bar + phase name
      const barW = r * 2.6;
      hpBar(ctx, x, y - r - 22, barW, ref.hp / ref.maxHp, 8);
      ctx.save(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText((def.name || 'Boss') + ' — ' + (phase.name || ''), x, y - r - 28); ctx.restore();
    },

    drawEgg(ctx, track) {
      const p = track.body.position;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(track.body.angle);
      ctx.fillStyle = '#fafafa'; ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    },

    drawProjectile(ctx, track) {
      const p = track.body.position, r = track.ref.radius || 9;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = track.ref.color || '#455a64'; ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    },

    drawDebris(ctx, track) {
      const p = track.body.position, r = track.ref.radius || 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = track.ref.color || '#8d6e63'; ctx.fill();
    }
  };

  /* ---- drawing helpers ---------------------------------------------------- */
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawCracks(ctx, w, h, intensity) {
    ctx.strokeStyle = 'rgba(0,0,0,' + (0.25 + 0.4 * intensity) + ')'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h * 0.2); ctx.lineTo(w * 0.05, h * 0.05); ctx.lineTo(-w * 0.1, h * 0.3);
    ctx.moveTo(w * 0.25, -h * 0.3); ctx.lineTo(-w * 0.05, h * 0.1); ctx.stroke();
  }
  function hpBar(ctx, x, y, w, ratio, hgt) {
    const h = hgt || 4; ratio = AB.util.clamp(ratio, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(x - w / 2, y, w * ratio, h);
  }
  function boundsOf(verts) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const v of verts) { minx = Math.min(minx, v.x); miny = Math.min(miny, v.y); maxx = Math.max(maxx, v.x); maxy = Math.max(maxy, v.y); }
    return { x: minx, y: miny, w: maxx - minx, h: maxy - miny };
  }
  function hexA(color, a) {
    if (color[0] === '#') {
      const n = color.length === 4
        ? [parseInt(color[1] + color[1], 16), parseInt(color[2] + color[2], 16), parseInt(color[3] + color[3], 16)]
        : [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
      return `rgba(${n[0]},${n[1]},${n[2]},${a})`;
    }
    return color;
  }

})(typeof window !== 'undefined' ? window : globalThis);
