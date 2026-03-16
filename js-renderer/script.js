// ace editor
const editor = ace.edit("editor");
editor.setTheme("ace/theme/twilight");
editor.session.setMode("ace/mode/javascript");
editor.setShowPrintMargin(false);
editor.session.setUseWorker(false);

const defaultCode = `
// ==========================================
// JS RENDER ENGINE: ULTIMATE SHOWCASE
// ==========================================
// Controls:
// [N] Next Screen
// [P] Previous Screen
// [Arrows/Space] Interact in specific screens
// ==========================================

// --- ASSETS ---
const BG_URL = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80"; 
const ICON_URL = "https://cdn-icons-png.flaticon.com/512/4712/4712035.png";

// --- STATE ---
let currentScreen = 0;
const MAX_SCREENS = 4;

// Transition Animation (Slide offset)
// FIX: Changed from 'const' to 'let' so we can modify it later
let transitionAnim = Animation.seconds(0.8, 0, 0, Easing.ELASTIC_OUT);

// --- SCREEN 1 STATE: Primitives & Math ---
let shapes = [];
for(let i=0; i<10; i++) shapes.push({ off: i * 0.5, speed: 1 + i * 0.2 });

// --- SCREEN 2 STATE: Input & Physics ---
let player = { x: 300, y: 300, vy: 0, isGrounded: false };
const GRAVITY = 1200;
const JUMP_FORCE = -500;
const SPEED = 250;

// --- SCREEN 3 STATE: Gradients & Glow ---
let glowAnim = Animation.seconds(1.0, 10, 40, Easing.SINE_IN_OUT);

// ==========================================
// MAIN LOOP
// ==========================================
void onRender(dt, time) {
    clear(0x050505);

    // 1. Calculate Transition Slide
    let slideOffset = transitionAnim.getValue();
    
    // 2. Render the current screen based on index
    // We apply the slideOffset to 'x' coordinates to create the slide effect
    
    if (currentScreen === 0) renderPrimitives(dt, time, slideOffset);
    if (currentScreen === 1) renderInputPhysics(dt, time, slideOffset);
    if (currentScreen === 2) renderVisuals(dt, time, slideOffset);
    if (currentScreen === 3) renderImagesFilters(dt, time, slideOffset);

    // 3. Draw Global HUD
    drawUI(time);
}

// ==========================================
// SCREEN 1: PRIMITIVES & MATH
// ==========================================
function renderPrimitives(dt, time, offX) {
    let cx = (width() / 2) + offX;
    let cy = height() / 2;

    // A. Rotating Pattern (Line & Circle)
    for (let i = 0; i < shapes.length; i++) {
        let s = shapes[i];
        let angle = time * s.speed + s.off;
        let r = 50 + (i * 15);
        
        let x = cx + Math.cos(angle) * r;
        let y = cy + Math.sin(angle) * r;
        
        // Dynamic Color based on angle
        let col = hsvToHex((angle % (Math.PI*2)) / (Math.PI*2), 1, 1);
        
        drawLine(cx, cy, x, y, 2, 0x222222);
        drawCircle(x, y, 5, col);
    }

    // B. Floating Text
    let hover = Math.sin(time * 3) * 10;
    drawRoundedRect(cx - 150, 50 + hover, 300, 60, 10, 0x222222);
    drawString(cx - 130, 85 + hover, "1. Primitives & Math", 0xFFFFFF);
    drawString(cx - 100, 350, "Sin/Cos/Circle/Line", 0x666666);
}

// ==========================================
// SCREEN 2: INPUT & PHYSICS
// ==========================================
function renderInputPhysics(dt, time, offX) {
    let baseX = offX; // Offset for screen transition

    // A. Input Handling
    if (isKeyPressed("ArrowLeft")) player.x -= SPEED * dt;
    if (isKeyPressed("ArrowRight")) player.x += SPEED * dt;

    // B. Physics (Gravity)
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    // Floor Collision
    let floorY = 350;
    if (player.y > floorY) {
        player.y = floorY;
        player.vy = 0;
        player.isGrounded = true;
    }

    // C. Draw Player
    // Squash and stretch effect based on velocity
    let stretch = 1 + (Math.abs(player.vy) / 2000);
    let w = 40 / stretch;
    let h = 40 * stretch;
    
    // Shadow Blur for player
    setShadow(20, 0x00AAFF);
    drawRoundedRect(baseX + player.x - (w/2), player.y - h, w, h, 8, 0x00AAFF);
    setShadow(0, 0); // Reset

    // Draw Floor
    drawRect(baseX, floorY, width(), height() - floorY, 0x333333);

    // Text
    drawString(baseX + 20, 50, "2. Input & Physics", 0xFFFFFF);
    drawString(baseX + 20, 80, "Arrows to Move, SPACE to Jump", 0xAAAAAA);
}

// ==========================================
// SCREEN 3: ADVANCED VISUALS
// ==========================================
function renderVisuals(dt, time, offX) {
    let cx = (width() / 2) + offX;
    
    // A. Animated Glow
    if (glowAnim.isDone()) {
        // Ping pong animation
        glowAnim.setEnd(glowAnim.getValue() > 20 ? 10 : 40);
    }
    let blurVal = glowAnim.getValue();

    // B. Gradient Card (The "RGB Box")
    let cardW = 300;
    let cardH = 180;
    let cardX = cx - (cardW / 2);
    let cardY = 110;

    // Animated colors
    let t = time * 0.5;
    let c1 = hsvToHex(t, 1, 1);
    let c2 = hsvToHex(t + 0.3, 1, 1);
    let c3 = hsvToHex(t + 0.6, 1, 1);
    let c4 = hsvToHex(t + 0.9, 1, 1);

    // GLOW BEHIND
    setShadow(blurVal, c1);
    drawRoundedGradient(cardX, cardY, cardW, cardH, c1, c2, c3, c4, 20);
    setShadow(0, 0);

    // Inner Content
    drawRoundedRect(cardX + 5, cardY + 5, cardW - 10, cardH - 10, 15, 0x111111);
    drawString(cardX + 20, cardY + 40, "Gradient & Shadow", 0xFFFFFF);
    
    // C. Gradient Bar
    let barW = 200;
    drawGradient(cx - 100, 320, barW, 20, 0xFF0000, 0xFFFF00, 0x00FF00, 0x0000FF);
    drawString(cx - 60, 360, "Linear Interpolation", 0x888888);
}

// ==========================================
// SCREEN 4: IMAGES & FILTERS
// ==========================================
function renderImagesFilters(dt, time, offX) {
    let baseX = offX;

    // A. Background Image
    // We render it at baseX so it slides with the screen
    drawImage(BG_URL, baseX, 0, width(), height());

    // B. Glassmorphism Panel (Blur behind content)
    let boxX = baseX + 100;
    let boxY = 100;
    
    // Semi-transparent dark box
    drawRoundedRect(boxX, boxY, 400, 200, 20, 0x000000); 
    
    // C. Icon with Blur Filter
    // 1. Sharp Icon
    drawImage(ICON_URL, boxX + 50, boxY + 50, 100, 100);
    drawString(boxX + 65, boxY + 170, "Sharp", 0xFFFFFF);

    // 2. Blurred Icon (using setBlur)
    let blurAmount = 10 + Math.sin(time * 4) * 5; // Pulse blur
    setBlur(Math.abs(blurAmount));
    drawImage(ICON_URL, boxX + 250, boxY + 50, 100, 100);
    setBlur(0); // TURN OFF BLUR
    drawString(boxX + 265, boxY + 170, "Blurred", 0xFFFFFF);

    drawString(baseX + 20, 50, "4. Images & Filters", 0xFFFFFF);
}

// ==========================================
// UTILS & INPUT
// ==========================================

function drawUI(time) {
    // Bottom Nav Bar
    drawRect(0, height() - 40, width(), 40, 0x000000);
    
    // Dots
    let cx = width() / 2;
    for(let i=0; i<MAX_SCREENS; i++) {
        let col = (i === currentScreen) ? 0x00FF00 : 0x555555;
        drawCircle(cx - 30 + (i * 20), height() - 20, 6, col);
    }
    
    // Helper Text
    let blink = Math.floor(time * 2) % 2 === 0;
    if(blink) drawString(width() - 150, height() - 15, "Press 'N' ->", 0x555555);
}

void onKey(key) {
    // Screen Navigation
    if (key === "n" || key === "N") {
        if (currentScreen < MAX_SCREENS - 1) {
            currentScreen++;
            // Create a NEW animation for the transition
            transitionAnim = Animation.seconds(0.8, width(), 0, Easing.ELASTIC_OUT);
            
            // Reset Player for Screen 2
            if(currentScreen === 1) { player.y = 0; player.vy = 0; }
        }
    }
    
    if (key === "p" || key === "P") {
        if (currentScreen > 0) {
            currentScreen--;
            transitionAnim = Animation.seconds(0.8, -width(), 0, Easing.ELASTIC_OUT);
        }
    }

    // Player Jump (Screen 2)
    if (currentScreen === 1 && key === " " && player.isGrounded) {
        player.vy = JUMP_FORCE;
        player.isGrounded = false;
        // Animation flare
        setShadow(30, 0xFFFFFF); // Flash effect handled in render
    }
}

// HSV Helper
function hsvToHex(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6); f = h * 6 - i; p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break;
    }
    return (Math.floor(r*255)<<16) | (Math.floor(g*255)<<8) | Math.floor(b*255);
}
`;

editor.setValue(defaultCode.trim(), -1);

// engine & state
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const errorLog = document.getElementById('error-log');

let animationId = null;
let userHooks = { onRender: null, onKey: null }; // Stores user functions
let startTime = 0;
let lastTime = 0;

// Input State
const keysPressed = new Set();

//region Input
// Track keys for isKeyPressed()
window.addEventListener('keydown', (e) => {
    // Ignore if typing in editor
    if (e.target.classList && e.target.classList.contains('ace_text-input')) return;

    if (!keysPressed.has(e.key)) {
        keysPressed.add(e.key);

        // Trigger Callback if defined
        // We pass e.key (e.g., "ArrowUp", " ", "a")
        if (userHooks.onKey) {
            try {
                userHooks.onKey(e.key);
            } catch (err) {
                showError(err);
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    keysPressed.delete(e.key);
});
//endregion

// small debounce helper so we don't reload continuously during window resize
function debounce(fn, wait) {
    let t = null;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}
const debouncedReloadEngine = debounce(() => {
    try { reloadEngine(); } catch (e) { console.error(e); }
}, 250);

//region API
const Easing = {
    LINEAR: 'LINEAR', SINE_IN: 'SINE_IN', SINE_OUT: 'SINE_OUT', SINE_IN_OUT: 'SINE_IN_OUT',
    QUAD_IN: 'QUAD_IN', QUAD_OUT: 'QUAD_OUT', QUAD_IN_OUT: 'QUAD_IN_OUT', ELASTIC_OUT: 'ELASTIC_OUT'
};

const Easings = {
    getEasingValue(x, type) {
        switch(type) {
            case Easing.SINE_IN: return 1 - Math.cos((x * Math.PI) / 2);
            case Easing.SINE_OUT: return Math.sin((x * Math.PI) / 2);
            case Easing.SINE_IN_OUT: return -(Math.cos(Math.PI * x) - 1) / 2;
            case Easing.ELASTIC_OUT:
                const c4 = (2 * Math.PI) / 3;
                return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
            default: return x;
        }
    }
};

class Animation {
    constructor(durationMs, start, end, easing = Easing.LINEAR) {
        this.start = start; this.end = end; this.value = start;
        this.easing = easing; this.duration = durationMs;
        this.increasing = end > start;
        this.changePerMillisecond = (durationMs > 0) ? (Math.abs(start - end) / durationMs) : 0;
        this.lastTime = Date.now();
    }
    static seconds(seconds, start, end, easing = Easing.LINEAR) {
        return new Animation(seconds * 1000, start, end, easing);
    }
    reset() { this.value = this.start; this.lastTime = Date.now(); }
    getValue() { return this.getEased(this.easing || Easing.LINEAR); }
    loadValue() {
        if(this.value === this.end) return this.value;
        const now = Date.now();
        const timePassed = now - this.lastTime;
        this.lastTime = now;
        if(this.increasing) {
            this.value += (this.changePerMillisecond * timePassed);
            if(this.value >= this.end) this.value = this.end;
        } else {
            this.value -= (this.changePerMillisecond * timePassed);
            if(this.value <= this.end) this.value = this.end;
        }
        return this.value;
    }
    isDone() { return this.value === this.end; }
    getEased(easingType) {
        if(easingType === Easing.LINEAR) return this.loadValue();
        if(this.start === this.end) return this.end;
        const linearCurrent = this.loadValue();
        const progress = this.map(linearCurrent, this.start, this.end, 0, 1);
        const curvedProgress = Easings.getEasingValue(progress, easingType);
        return this.map(curvedProgress, 0, 1, this.start, this.end);
    }
    map(value, minIn, maxIn, minOut, maxOut) {
        if(Math.abs(maxIn - minIn) < 0.0001) return minOut;
        return (value - minIn) / (maxIn - minIn) * (maxOut - minOut) + minOut;
    }
    setEnd(newEnd) {
        if(this.end === newEnd) return;
        this.start = this.value; this.end = newEnd;
        this.increasing = this.end > this.start;
        this.lastTime = Date.now();
        if(this.duration > 0) this.changePerMillisecond = Math.abs(this.start - this.end) / this.duration;
        else { this.changePerMillisecond = 0; this.value = this.end; }
    }
}

const toColor = (num) => {
    if (typeof num === 'undefined') return '#000000';
    return '#' + Math.floor(num).toString(16).padStart(6, '0');
};

// javascript
// Add this helper and API method into `js-renderer/script.js` near the other drawing helpers.

// Helper: convert numeric color (0xRRGGBB or 0xAARRGGBB) to RGBA components
function colorNumToRGBA(num) {
    if (typeof num === 'undefined' || num === null) num = 0;
    const n = Math.floor(num) >>> 0;
    // If color includes alpha in high byte (0xAARRGGBB) detect by value > 0xFFFFFF
    let a = 255;
    let r, g, b;
    if (n > 0xFFFFFF) {
        a = (n >>> 24) & 0xFF;
        r = (n >>> 16) & 0xFF;
        g = (n >>> 8)  & 0xFF;
        b = n & 0xFF;
    } else {
        r = (n >>> 16) & 0xFF;
        g = (n >>> 8)  & 0xFF;
        b = n & 0xFF;
    }
    return { r, g, b, a };
}

// --- NEW: Image Caching System ---
const imageCache = new Map();

function getImageFromCache(url) {
    if (!imageCache.has(url)) {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Attempt to handle CORS
        img.src = url;

        const entry = { img: img, loaded: false };
        imageCache.set(url, entry);

        img.onload = () => { entry.loaded = true; };
        img.onerror = () => { console.error("Failed to load image:", url); };

        return entry;
    }
    return imageCache.get(url);
}

function generateGradientTexture(w, h, colTL, colTR, colBR, colBL) {
    // clamp integer pixel sizes
    const iw = Math.max(1, Math.floor(Math.abs(w)));
    const ih = Math.max(1, Math.floor(Math.abs(h)));

    const off = document.createElement('canvas');
    off.width = iw;
    off.height = ih;
    const offCtx = off.getContext('2d');
    const img = offCtx.createImageData(iw, ih);
    const data = img.data;

    const cTL = colorNumToRGBA(colTL);
    const cTR = colorNumToRGBA(colTR);
    const cBR = colorNumToRGBA(colBR);
    const cBL = colorNumToRGBA(colBL);

    // Bilinear interpolate per pixel
    for (let j = 0; j < ih; j++) {
        const v = (ih === 1) ? 0 : j / (ih - 1);
        const invV = 1 - v;
        for (let i = 0; i < iw; i++) {
            const u = (iw === 1) ? 0 : i / (iw - 1);
            const invU = 1 - u;

            const r = (cTL.r * invU * invV + cTR.r * u * invV + cBR.r * u * v + cBL.r * invU * v);
            const g = (cTL.g * invU * invV + cTR.g * u * invV + cBR.g * u * v + cBL.g * invU * v);
            const b = (cTL.b * invU * invV + cTR.b * u * invV + cBR.b * u * v + cBL.b * invU * v);
            const a = (cTL.a * invU * invV + cTR.a * u * invV + cBR.a * u * v + cBL.a * invU * v);

            const idx = (j * iw + i) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
        }
    }
    offCtx.putImageData(img, 0, 0);
    return off;
}

const api = {
    // Input API
    isKeyPressed: (key) => keysPressed.has(key),

    // Drawing API
    clear: (c=0) => { ctx.fillStyle = toColor(c); ctx.fillRect(0, 0, canvas.width, canvas.height); },
    drawString: (x, y, t, c) => { ctx.fillStyle = toColor(c); ctx.font = "16px monospace"; ctx.fillText(t, x, y); },
    drawRect: (x, y, w, h, c) => { ctx.fillStyle = toColor(c); ctx.fillRect(x, y, w, h); },
    drawRoundedRect: (x, y, w, h, r, c) => {
        ctx.fillStyle = toColor(c); ctx.beginPath();
        if(typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
        else { /* fallback */ ctx.rect(x, y, w, h); }
        ctx.fill();
    },
    drawCircle: (x, y, r, c) => { ctx.fillStyle = toColor(c); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); },
    drawLine: (x1, y1, x2, y2, th, c) => {
        ctx.strokeStyle = toColor(c); ctx.lineWidth = th; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    },
    drawGradient: (x, y, w, h, colTL, colTR, colBR, colBL) => {
        const texture = generateGradientTexture(w, h, colTL, colTR, colBR, colBL);
        ctx.drawImage(texture, x, y, w, h);
    },
    drawRoundedGradient: (x, y, w, h, colTL, colTR, colBR, colBL, radii) => {
        const texture = generateGradientTexture(w, h, colTL, colTR, colBR, colBL);

        ctx.save();
        ctx.beginPath();
        if(typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, radii);
        } else {
            // Fallback for browsers without roundRect support (just draws square)
            ctx.rect(x, y, w, h);
        }
        ctx.clip(); // Clip drawing to the rounded shape
        ctx.drawImage(texture, x, y, w, h);
        ctx.restore();
    },
    setBackgroundImage: (url) => {
        const entry = getImageFromCache(url);
        if (entry.loaded) {
            ctx.drawImage(entry.img, 0, 0, canvas.width, canvas.height);
        }
    },
    drawImage: (url, x, y, w, h) => {
        const entry = getImageFromCache(url);
        if (entry.loaded) {
            ctx.drawImage(entry.img, x, y, w, h);
        }
    },

    setShadow: (radius, color, offX = 0, offY = 0) => {
        ctx.shadowBlur = radius;
        ctx.shadowColor = (radius > 0) ? toColor(color) : 'transparent';
        ctx.shadowOffsetX = offX;
        ctx.shadowOffsetY = offY;
    },
    setBlur: (radius) => {
        if (radius > 0) {
            ctx.filter = `blur(${radius}px)`;
        } else {
            ctx.filter = 'none';
        }
    },

    width: () => {
        const dpr = window.devicePixelRatio || 1;
        return canvas.width / dpr;
    },
    height: () => {
        const dpr = window.devicePixelRatio || 1;
        return canvas.height / dpr;
    },
    sin: Math.sin, cos: Math.cos, PI: Math.PI,
    Animation, Easing
};

//endregion

//region Engine Logic
function stopEngine() {
    if (animationId) cancelAnimationFrame(animationId);
    userHooks = { onRender: null, onKey: null };
}

function startLoop() {
    startTime = performance.now();
    lastTime = startTime;

    function loop(now) {
        const totalTime = (now - startTime) / 1000;
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        try {
            if (userHooks.onRender) userHooks.onRender(deltaTime, totalTime);
            animationId = requestAnimationFrame(loop);
        } catch (e) {
            showError(e);
            stopEngine();
        }
    }
    animationId = requestAnimationFrame(loop);
}

function reloadEngine() {
    stopEngine();
    hideError();
    keysPressed.clear(); // Reset keys on reload

    let rawCode = editor.getValue();

    // Pre-process special "void" syntax
    rawCode = rawCode.replace(/void\s+onRender/g, 'function onRender');
    rawCode = rawCode.replace(/void\s+onKey/g, 'function onKey');

    const wrappedCode = `
            "use strict";
            const {
                drawString, drawRect, drawRoundedRect, drawCircle, drawLine,
                clear, isKeyPressed, sin, cos, PI, Animation, Easing, width, height, drawGradient, drawRoundedGradient, setBackgroundImage, drawImage, setShadow, setBlur
            } = api;

            ${rawCode}

            // Return all hooks found
            return {
                onRender: (typeof onRender !== 'undefined' ? onRender : null),
                onKey: (typeof onKey !== 'undefined' ? onKey : null)
            };
        `;

    try {
        const factory = new Function('api', wrappedCode);
        userHooks = factory(api);

        if (!userHooks.onRender) throw new Error("Missing 'void onRender(dt, time)'");

        // Clear canvas and ensure sizes are correct before starting
        ctx.clearRect(0,0, canvas.width, canvas.height);
        editor.resize();
        resizeCanvas();
        startLoop();
    } catch (e) {
        showError(e);
    }
}

function showError(err) {
    errorLog.style.display = 'block';
    errorLog.innerText = "Runtime Error: " + err.message;
    console.error(err);
}
function hideError() { errorLog.style.display = 'none'; }

//endregion

//region Responsive canvas resizing (keeps drawing resolution crisp)
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
}

// Divider dragging logic to resize editor pane
(function setupDivider() {
    const divider = document.getElementById('divider');
    const editorPane = document.getElementById('editor-pane');
    let isDragging = false;

    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

    divider.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.classList.add('resizing');
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const min = 200;
        const max = window.innerWidth - 200;
        const newWidth = clamp(e.clientX, min, max);
        editorPane.style.width = newWidth + 'px';
        editor.resize();
        resizeCanvas();
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('resizing');
        // Re-run user code after finishing drag so state is reinitialized
        try { reloadEngine(); } catch (e) { console.error(e); }
    });

    // Touch support
    divider.addEventListener('touchstart', (e) => {
        isDragging = true;
        document.body.classList.add('resizing');
        e.preventDefault();
    }, {passive:false});
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const min = 200;
        const max = window.innerWidth - 200;
        const newWidth = clamp(touch.clientX, min, max);
        editorPane.style.width = newWidth + 'px';
        editor.resize();
        resizeCanvas();
    }, {passive:false});
    document.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('resizing');
        try { reloadEngine(); } catch (e) { console.error(e); }
    });
})();

// Keep canvas and editor sized on window resize and re-run code (debounced)
window.addEventListener('resize', () => {
    editor.resize();
    resizeCanvas();
    debouncedReloadEngine();
});
//endregion

window.onload = () => {
    // initial sizing
    editor.resize();
    resizeCanvas();
    reloadEngine();
};
