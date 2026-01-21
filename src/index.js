/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import 'blockly/blocks';
import { generatePython } from './generators/python';
import './blocks/text';
import './blocks/turtle';
import { save, load } from './serialization';
import { toolbox } from './toolbox';
import './index.css';

window.Blockly = Blockly;

function makeTurtle(drawCanvas, overlayCanvas) {
  const ctx = drawCanvas.getContext('2d', { alpha: false });
  const octx = overlayCanvas.getContext('2d');

  function paintWhiteBackground() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
    ctx.restore();
  }

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  let x = drawCanvas.width / 2;
  let y = drawCanvas.height / 2;
  let heading = 0; // degrees, 0 = east/right
  let pen = true;

  const rad = (d) => (d * Math.PI) / 180;

  function clearOverlay() {
    octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }

  function drawTurtleIcon() {
    clearOverlay();

    octx.save();
    octx.translate(x, y);
    octx.rotate(-rad(heading));

    const size = 10;

    octx.beginPath();
    octx.moveTo(size, 0);
    octx.lineTo(-size * 0.8, size * 0.6);
    octx.lineTo(-size * 0.8, -size * 0.6);
    octx.closePath();

    octx.fillStyle = 'rgba(34, 197, 94, 0.95)';
    octx.strokeStyle = 'rgba(0,0,0,0.6)';
    octx.lineWidth = 1;
    octx.fill();
    octx.stroke();

    octx.beginPath();
    octx.arc(0, 0, 2, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(0,0,0,0.45)';
    octx.fill();

    octx.restore();
  }

  function moveTo(nx, ny) {
    if (pen) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }
    x = nx;
    y = ny;
    drawTurtleIcon();
  }

  function resetState() {
    x = drawCanvas.width / 2;
    y = drawCanvas.height / 2;
    heading = 0;
    pen = true;
    drawTurtleIcon();
  }

  paintWhiteBackground();
  drawTurtleIcon();

  return {
    forward(d) {
      const dist = Number(d);
      const nx = x + dist * Math.cos(rad(heading));
      const ny = y - dist * Math.sin(rad(heading));
      moveTo(nx, ny);
    },
    backward(d) {
      this.forward(-Number(d));
    },
    left(a) {
      heading = (heading + Number(a)) % 360;
      drawTurtleIcon();
    },
    right(a) {
      heading = (heading - Number(a)) % 360;
      drawTurtleIcon();
    },
    penup() {
      pen = false;
    },
    pendown() {
      pen = true;
    },
    goto(nx, ny) {
      moveTo(Number(nx), Number(ny));
    },
    setx(nx) {
      moveTo(Number(nx), y);
    },
    sety(ny) {
      moveTo(x, Number(ny));
    },
    setheading(a) {
      heading = Number(a) % 360;
      drawTurtleIcon();
    },
    clear() {
      paintWhiteBackground();
      clearOverlay();
      resetState();
    },
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const runBtn = document.getElementById('runBtn');
  const clearBtn = document.getElementById('clearBtn');
  const clearTurtleBtn = document.getElementById('clearTurtleBtn');

  const codeEl = document.querySelector('#generatedCode code');
  const consoleEl = document.getElementById('console');
  const statusEl = document.getElementById('status');
  const turtleCanvas = document.getElementById('turtleCanvas');
  const turtleOverlay = document.getElementById('turtleOverlay');

  if (!runBtn || !clearBtn || !codeEl || !consoleEl || !statusEl || !turtleCanvas || !turtleOverlay) {
    console.error('Missing DOM nodes. Check ids in index.html.');
    return;
  }

  // prevent early DropDownDiv crash
  if (Blockly.DropDownDiv?.createDom) Blockly.DropDownDiv.createDom();

  const ws = Blockly.inject('blocklyDiv', {
    toolbox,
    grid: { spacing: 20, length: 3, colour: '#eee', snap: true },
    zoom: { controls: true, wheel: true },
    trashcan: true,
  });

  load(ws);

  function updateGenerated() {
    const py = generatePython(ws) || '';
    codeEl.textContent = py;
    return py;
  }

  ws.addChangeListener((e) => {
    if (!e.isUiEvent) save(ws);
    updateGenerated();
  });

  updateGenerated();

  // console helpers
  function clearConsole() {
    consoleEl.textContent = '';
  }
  function write(s) {
    consoleEl.textContent += String(s);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  function writeln(s) {
    write(String(s) + '\n');
  }

  clearBtn.addEventListener('click', clearConsole);
  clearTurtleBtn.addEventListener('click', () => {
    if (turtle) turtle.clear();
  });

  window._write = (s) => write(s);

  const PY_PRELUDE = `
import sys
class _JSWriter:
    def write(self, s):
        import js
        js._write(s)
    def flush(self): pass
sys.stdout = _JSWriter()
sys.stderr = _JSWriter()
`;

  // Pyodide + turtle module
  let pyodide = null;
  let turtle = null;

  runBtn.disabled = true;
  runBtn.textContent = 'Loading Python…';
  statusEl.textContent = 'Loading Pyodide…';

  (async () => {
    try {
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      });

      turtle = makeTurtle(turtleCanvas, turtleOverlay);
      pyodide.registerJsModule('turtlejs', turtle);

      runBtn.disabled = false;
      runBtn.textContent = 'Run';
      statusEl.textContent = 'Pyodide loaded';
    } catch (err) {
      console.error(err);
      runBtn.textContent = 'Load failed';
      statusEl.textContent = 'Pyodide failed to load';
      writeln('Failed to load Pyodide.');
    }
  })();

  // Run button
  runBtn.addEventListener('click', async () => {
    if (!pyodide) return;

    clearConsole();
    if (turtle) turtle.clear();

    const py = updateGenerated();
    const fullCode = PY_PRELUDE + '\n' + py;

    try {
      await pyodide.runPythonAsync(fullCode);
      if (!consoleEl.textContent.trim()) consoleEl.textContent = '(no output)';
    } catch (err) {
      writeln(String(err));
    }
  });
});
