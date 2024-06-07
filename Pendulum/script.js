//region Settings
let drawPendulums = true;
let drawTrails = true;
let diff = 2;
let xDamp = 0.99;
let yDamp = 0.99;
let massOff = 1;
let paused = false;
let btrRainbow = false;
//endregion

window.addEventListener('keydown', (event) => {
    if (event.code === "Space") {
        paused = !paused; // Toggle paused
        pauseInput.checked = paused; // Update the checkbox
    }
});

// on load
window.onload = function() {
    document.getElementById('numPendulums').value = 1;
    document.getElementById('diff').value = diff;
    document.getElementById('xdap').value = xDamp;
    document.getElementById('ydap').value = yDamp;
    document.getElementById('mass').value = massOff;
    document.getElementById('pause').checked = false;
    document.getElementById('drawPendulums').checked = drawPendulums;
    document.getElementById('drawTrails').checked = drawTrails;
    document.getElementById('rainbow').checked = btrRainbow;
};

//region UI Elements
let numPendulums = document.getElementById('numPendulums').value;

const canvas = document.getElementById('pendulumCanvas');
const infoText = document.getElementById('info');
const ctx = canvas.getContext('2d');

const drawPendulumsInput = document.getElementById('drawPendulums');
drawPendulumsInput.addEventListener('change', () => {
    drawPendulums = drawPendulumsInput.checked;
});

const drawTrailsInput = document.getElementById('drawTrails');
drawTrailsInput.addEventListener('change', () => {
    drawTrails = drawTrailsInput.checked;
});

const pauseInput = document.getElementById('pause');
pauseInput.addEventListener('change', () => {
    paused = pauseInput.checked;
});

const rainbow = document.getElementById('rainbow');
rainbow.addEventListener('change', () => {
    btrRainbow = rainbow.checked;
});

const diffInput = document.getElementById('diff');
diffInput.addEventListener('change', () => {
    diff = diffInput.value;
    initializePendulums()
});

document.getElementById('numPendulums').addEventListener('change', (event) => {
    numPendulums = event.target.value;
    initializePendulums();
});

const xDapInput = document.getElementById('xdap');
xDapInput.addEventListener('change', (event) => {
    xDamp = xDapInput.value;
    initializePendulums();
});

const yDapInput = document.getElementById('ydap');
yDapInput.addEventListener('change', (event) => {
    yDamp = yDapInput.value;
    initializePendulums();
});

const angleOffsetInput = document.getElementById('mass');
angleOffsetInput.addEventListener('change', (event) => {
    massOff = event.target.value;
    initializePendulums();
});
//endregion

const width = canvas.width;
const height = canvas.height;

class Pendulum {
    constructor(x, y, length1, length2, mass1, mass2, angle1, angle2) {
        this.origin = { x, y };
        this.x = x;
        this.y = y;
        this.length1 = length1;
        this.length2 = length2;
        this.length = [length1, length2];
        this.mass1 = mass1;
        this.mass = [mass1, mass2];
        this.mass2 = mass2;
        this.angle = angle1;

        this.angle1 = angle1;
        this.angle2 = angle2;
        this.aVel1 = 0;
        this.aVel2 = 0;
        this.aAcc1 = 0;
        this.aAcc2 = 0;
        this.trail = [];
        this.maxTrailLength = 40; // Adjust the trail length as needed
    }

    update() {

        if(paused) {
            return;
        }

        const g = 1;

        const num1 = -g * (2 * this.mass1 + this.mass2) * Math.sin(this.angle1);
        const num2 = -this.mass2 * g * Math.sin(this.angle1 - 2 * this.angle2);
        const num3 = -2 * Math.sin(this.angle1 - this.angle2) * this.mass2;
        const num4 = this.aVel2 * this.aVel2 * this.length2 + this.aVel1 * this.aVel1 * this.length1 * Math.cos(this.angle1 - this.angle2);
        const den = this.length1 * (2 * this.mass1 + this.mass2 - this.mass2 * Math.cos(2 * this.angle1 - 2 * this.angle2));

        this.aAcc1 = (num1 + num2 + num3 * num4) / den;

        const num5 = 2 * Math.sin(this.angle1 - this.angle2);
        const num6 = (this.aVel1 * this.aVel1 * this.length1 * (this.mass1 + this.mass2) + g * (this.mass1 + this.mass2) * Math.cos(this.angle1) + this.aVel2 * this.aVel2 * this.length2 * this.mass2 * Math.cos(this.angle1 - this.angle2));
        const den2 = this.length2 * (2 * this.mass1 + this.mass2 - this.mass2 * Math.cos(2 * this.angle1 - 2 * this.angle2));

        this.aAcc2 = (num5 * num6) / den2;

        this.angle1 += this.aVel1;
        this.angle2 += this.aVel2;
        this.aVel1 += this.aAcc1;
        this.aVel2 += this.aAcc2;

        this.aVel1 *= xDamp; // Damping to stabilize the motion
        this.aVel2 *= yDamp;

        // Update trail
        const x1 = this.x + this.length1 * Math.sin(this.angle1);
        const y1 = this.y + this.length1 * Math.cos(this.angle1);
        const x2 = x1 + this.length2 * Math.sin(this.angle2);
        const y2 = y1 + this.length2 * Math.cos(this.angle2);
        this.trail.push({ x: x2, y: y2 });

        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }


    draw() {
        const x1 = this.x + this.length1 * Math.sin(this.angle1);
        const y1 = this.y + this.length1 * Math.cos(this.angle1);

        const x2 = x1 + this.length2 * Math.sin(this.angle2);
        const y2 = y1 + this.length2 * Math.cos(this.angle2);

        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    drawTrail() {

        if(!btrRainbow) {
            const opacity = (pendulums.indexOf(this) + 1) / pendulums.length;
            const col = getRainbowColor(pendulums.indexOf(this), pendulums.length);
            ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${opacity})`;
        }

        for (let i = 0; i < this.trail.length - 1; i++) {

            if(btrRainbow) {
                const opacity = (i + 1) / this.trail.length;
                const col = getRainbowColor(i, this.trail.length);
                ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${opacity})`;
            }

            ctx.beginPath();
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

const pendulums = [];

function initializePendulums() {

    const numPendulums = document.getElementById('numPendulums').value;

    pendulums.length = 0;
    const initialLength1 = Math.random() * 100 + 50;
    const initialLength2 = Math.random() * 100 + 50;
    const initialMass1 = Math.random() * 20 + 10;
    const initialMass2 = Math.random() * 20 + 10;
    const initialAngle1 = Math.PI / 2;
    const initialAngle2 = Math.PI / 2;

    const diff = 10;

    for (let i = 0; i < numPendulums; i++) {

        let mass1 = initialMass1 + Math.floor(Math.random() * diff);
        let mass2 = initialMass2 + Math.floor(Math.random() * diff);

        if(massOff <= 0) {
            mass1 = initialMass1 + diff;
            mass2 = initialMass2 + diff;
        }

        const pendulum = new Pendulum(canvas.width / 2, canvas.height / 2, initialLength1, initialLength2, mass1, mass2, initialAngle1, initialAngle2);
        pendulums.push(pendulum);
    }
}

function updateSimulation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pendulums.forEach(pendulum => {
        pendulum.update();
        if (drawPendulums) pendulum.draw();
        if (drawTrails) pendulum.drawTrail();
    });

    requestAnimationFrame(updateSimulation);
}

function getRainbowColor(index, total) {
    const hue = (index / total) * 360;
    const saturation = 100; // 100% saturation for vivid colors
    const lightness = 50; // 50% lightness for standard brightness

    return hslToRgb(hue / 360, saturation / 100, lightness / 100);
}

const { abs, min, max, round } = Math;
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1/3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1/3);
    }

    return [round(r * 255), round(g * 255), round(b * 255)];
}

function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

initializePendulums(numPendulums);
updateSimulation();
