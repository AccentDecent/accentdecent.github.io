# JS Render Engine Documentation

Welcome to the JS Render Engine. This tool allows you to write real-time graphical JavaScript code directly in the browser. It features a custom API for drawing, input handling, and a robust Animation system ported from Java.

## Core Concepts

### The Sandbox
Variables declared outside of functions persist between frames. This allows you to maintain state (like position, score, or animation instances).

```javascript
// This runs once when you click "RERUN"
let x = 0; 
let color = 0xFF0000;
```

### The `void` Keyword
While standard JavaScript uses `function`, this engine supports a C/Java-style syntax for specific system overrides.

*   **`void onRender(dt, time)`**: Called 60 times per second.
*   **`void onKey(key)`**: Called once when a key is pressed.

---

## 1. System Functions

### `void onRender(dt, time)`
The main game loop.
*   **`dt` (Delta Time)**: The time in **seconds** since the last frame. Use this to make movement smooth regardless of framerate. (e.g., `x += speed * dt`).
*   **`time`**: The total time in **seconds** since the code started running.

### `void onKey(key)`
An event listener that triggers once per keystroke.
*   **`key`**: A string representing the key (e.g., `" "`, `"ArrowUp"`, `"a"`, `"Enter"`).

---

## 2. Graphics API
All coordinates are in pixels. **Colors** are defined as Hex Integers (e.g., `0xFF0000` is Red), not strings.

| Function                                     | Description                                              |
|:---------------------------------------------|:---------------------------------------------------------|
| **`clear(color)`**                           | Fills the entire canvas with the specified color.        |
| **`drawString(x, y, text, color)`**          | Draws text at coordinates (x, y).                        |
| **`drawRect(x, y, w, h, color)`**            | Draws a solid rectangle.                                 |
| **`drawRoundedRect(x, y, w, h, r, color)`**  | Draws a rectangle with rounded corners (radius `r`).     |
| **`drawCircle(x, y, radius, color)`**        | Draws a solid circle.                                    |
| **`drawLine(x1, y1, x2, y2, thick, color)`** | Draws a line between two points with specific thickness. |
| **`drawGradient(x, y, w, h, colTL, colTR, colBR, colBL)`** | Draws a gradient with colors in each corner.             |
| **`width()`**                                | Gets the width of the canvas.                            |
| **`height()`**                               | Gets the height of the canvas.                           |

---

## 3. Input API

### `isKeyPressed(keyString)`
Checks if a specific key is currently being held down. Useful for continuous movement inside `onRender`.

```javascript
if (isKeyPressed("ArrowRight")) {
    x += 100 * dt; // Move right
}
```

---

## 4. Animation System
The engine includes a robust `Animation` class for smooth transitions.

### creating Animations
Use the static helper **`Animation.seconds`**:

```javascript
// Duration (sec), Start Value, End Value, Easing Type
const myAnim = Animation.seconds(2.0, 0, 100, Easing.ELASTIC_OUT);
```

### Animation Methods
| Method | Description |
| :--- | :--- |
| **`.getValue()`** | Returns the current calculated value based on time. |
| **`.isDone()`** | Returns `true` if the animation has reached the end value. |
| **`.reset()`** | Resets the animation to the start. |
| **`.setEnd(newValue)`** | Smoothly transitions from the *current* value to a new target value over the original duration. |

### Easing Types
You can use the `Easing` object to change the feel of the animation:
*   `Easing.LINEAR`
*   `Easing.SINE_IN`, `Easing.SINE_OUT`, `Easing.SINE_IN_OUT`
*   `Easing.QUAD_IN`, `Easing.QUAD_OUT`, `Easing.QUAD_IN_OUT`
*   `Easing.CUBIC_IN`, `Easing.CUBIC_OUT`, `Easing.CUBIC_IN_OUT`
*   `Easing.ELASTIC_OUT`

---

## 5. Math Helpers
Common Math functions are exposed directly to save typing:
*   `sin(x)` -> `Math.sin(x)`
*   `cos(x)` -> `Math.cos(x)`
*   `PI` -> `Math.PI`

---

## Examples

### Example 1: Bouncing Ball
A simple ball that moves back and forth.

```javascript
let x = 50;
let speed = 200;

void onRender(dt, time) {
    clear(0x222222);
    
    // Update position
    x += speed * dt;
    
    // Bounce logic
    if (x > 550 || x < 50) {
        speed *= -1; // Reverse direction
    }
    
    drawCircle(x, 200, 30, 0xFF0055);
    drawString(x - 20, 150, "Bouncing", 0xFFFFFF);
}
```

### Example 2: Interactive Animation
Click "Space" to animate a box growing, use Arrows to move it.

```javascript
// State
let x = 300, y = 200;
// Animate size from 20 to 20
let sizeAnim = Animation.seconds(0.5, 20, 20, Easing.ELASTIC_OUT);

void onRender(dt, time) {
    clear(0x111111);
    
    // Movement
    if (isKeyPressed("ArrowLeft")) x -= 150 * dt;
    if (isKeyPressed("ArrowRight")) x += 150 * dt;

    // Get current size from animation
    let size = sizeAnim.getValue();
    
    drawRoundedRect(x - size, y - size, size * 2, size * 2, 10, 0x00AAFF);
    drawString(20, 40, "Press SPACE to Pulse", 0xAAAAAA);
}

void onKey(key) {
    if (key === " ") {
        // Reset animation to go from 50 back to 20
        sizeAnim = Animation.seconds(0.5, 50, 20, Easing.ELASTIC_OUT);
    }
}
```

### Example 3: Smooth Toggle (setEnd)
Using `setEnd` to smoothly transition a toggle switch.

```javascript
// Animate X position from 0 (Off) to 100 (On)
const toggleAnim = Animation.seconds(0.4, 0, 100, Easing.SINE_IN_OUT);
let isOn = false;

void onRender(dt, time) {
    clear(0x000000);
    
    let val = toggleAnim.getValue();
    
    // Draw background pill
    drawRoundedRect(100, 100, 140, 40, 20, 0x333333);
    
    // Draw toggle circle
    // Color changes from Red (Off) to Green (On) based on position
    let color = val > 50 ? 0x00FF00 : 0xFF0000;
    drawCircle(120 + val, 120, 15, color);
    
    drawString(100, 160, "Click 'T' to Toggle", 0xFFFFFF);
}

void onKey(key) {
    if (key === "t") {
        isOn = !isOn;
        // Smoothly move to new target without snapping
        toggleAnim.setEnd(isOn ? 100 : 0);
    }
}
```