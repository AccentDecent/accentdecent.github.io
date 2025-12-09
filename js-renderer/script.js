// ace editor
const editor = ace.edit("editor");
editor.setTheme("ace/theme/twilight");
editor.session.setMode("ace/mode/javascript");
editor.setShowPrintMargin(false);
editor.session.setUseWorker(false);

const defaultCode = `
// Simple Snake game

// Config / state
const CELL = 20;
let cols = Math.max(10, Math.floor(width() / CELL));
let rows = Math.max(10, Math.floor(height() / CELL));
let snake = [];
let dir = {x: 1, y: 0};         // current direction
let nextDir = null;            // queued direction (applied on next tick)
let food = null;
let tickInterval = 0.12;       // seconds per move
let tickTimer = 0;
let score = 0;
let gameOver = false;

function placeFood() {
    // place food in a random empty cell
    let attempts = 0;
    while (attempts < 1000) {
        attempts++;
        const fx = Math.floor(Math.random() * cols);
        const fy = Math.floor(Math.random() * rows);
        let clash = snake.some(s => s.x === fx && s.y === fy);
        if (!clash) {
            food = {x: fx, y: fy};
            return;
        }
    }
    // fallback: if board full, set food null
    food = null;
}

function init() {
    cols = Math.max(10, Math.floor(width() / CELL));
    rows = Math.max(10, Math.floor(height() / CELL));
    const startX = Math.floor(cols / 2);
    const startY = Math.floor(rows / 2);
    snake = [
        {x: startX - 1, y: startY},
        {x: startX,     y: startY},
    ];
    dir = {x: 1, y: 0};
    nextDir = null;
    tickTimer = 0;
    score = 0;
    gameOver = false;
    placeFood();
}

// helper to test collision with snake body
function collidesWithSnake(x, y) {
    return snake.some(s => s.x === x && s.y === y);
}

init();

void onRender(dt, time) {
    // Keep grid in sync if canvas size changed (engine will reload on resize normally,
    // but ensure cols/rows are reasonable)
    cols = Math.max(10, Math.floor(width() / CELL));
    rows = Math.max(10, Math.floor(height() / CELL));

    // Background
    clear(0x0b0b0b);

    // If game over, show message and return
    if (gameOver) {
        drawString(20, 40, "Game Over - Press R to Restart", 0xFFFFFF);
        drawString(20, 70, "Score: " + score, 0xFFFFFF);
        return;
    }

    // Tick logic
    tickTimer += dt;
    while (tickTimer >= tickInterval) {
        tickTimer -= tickInterval;

        // Apply queued direction if present and not reversing
        if (nextDir) {
            if (!(nextDir.x === -dir.x && nextDir.y === -dir.y)) {
                dir = nextDir;
            }
            nextDir = null;
        }

        const head = snake[snake.length - 1];
        const nx = head.x + dir.x;
        const ny = head.y + dir.y;

        // wall collision
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
            gameOver = true;
            break;
        }
        // self collision
        if (collidesWithSnake(nx, ny)) {
            gameOver = true;
            break;
        }

        // move: add new head
        snake.push({x: nx, y: ny});

        // eat food?
        if (food && nx === food.x && ny === food.y) {
            score += 1;
            placeFood();
        } else {
            // remove tail
            snake.shift();
        }
    }

    // Draw food
    if (food) {
        drawRect(food.x * CELL, food.y * CELL, CELL, CELL, 0xFF3333);
    }

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        const s = snake[i];
        const color = (i === snake.length - 1) ? 0x88FF88 : 0x33CC33;
        drawRect(s.x * CELL, s.y * CELL, CELL - 1, CELL - 1, color);
    }

    // HUD
    drawString(10, 20, "Score: " + score, 0xFFFFFF);
    drawString(10, 40, "Controls: Arrows / WASD. R to restart.", 0xCCCCCC);
}

void onKey(key) {
    // Direction keys
    if (key === "ArrowUp" || key === "w" || key === "W") {
        nextDir = {x: 0, y: -1};
    }
    if (key === "ArrowDown" || key === "s" || key === "S") {
        nextDir = {x: 0, y: 1};
    }
    if (key === "ArrowLeft" || key === "a" || key === "A") {
        nextDir = {x: -1, y: 0};
    }
    if (key === "ArrowRight" || key === "d" || key === "D") {
        nextDir = {x: 1, y: 0};
    }

    // Restart
    if (key === "r" || key === "R") {
        init();
    }
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
