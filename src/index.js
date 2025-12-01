/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import 'blockly/blocks';
import { generatePython } from './generators/python';
import './blocks/text';
import { save, load } from './serialization';
import { toolbox } from './toolbox';
import './index.css';
import './blocks/turtle';

window.Blockly = Blockly;

// Turtle implementation using Canvas
function makeTurtle(canvas) {
  const ctx = canvas.getContext('2d');
  let x = canvas.width / 2;
  let y = canvas.height / 2;
  let heading = 0;
  let pen = true;

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  const rad = d => (d * Math.PI) / 180;

  function moveTo(nx, ny) {
    if (pen) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }
    x = nx; y = ny;
  }

  return {
    forward(d)   { moveTo(x + d * Math.cos(rad(heading)), y - d * Math.sin(rad(heading))); },
    backward(d)  { this.forward(-d); },
    left(a)      { heading = (heading + a) % 360; },
    right(a)     { heading = (heading - a) % 360; },
    penup()      { pen = false; },
    pendown()    { pen = true; },
    goto(nx, ny) { moveTo(nx, ny); },
    setx(nx)     { moveTo(nx, y); },
    sety(ny)     { moveTo(x, ny); },
    setheading(a){ heading = a; },
    clear()      { ctx.clearRect(0, 0, canvas.width, canvas.height);
                   // reset to center/orientation so next run is consistent
                   x = canvas.width / 2; y = canvas.height / 2; heading = 0; }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const runBtn = document.getElementById('runBtn');
  const clearBtn = document.getElementById('clearBtn');
  const codeDiv = document.querySelector('#generatedCode code');
  const consoleDiv = document.getElementById('console');
  const statusEl = document.getElementById('status');
  const turtleCanvas = document.getElementById('turtleCanvas');

  if (!runBtn || !codeDiv || !consoleDiv || !turtleCanvas) {
    console.error('Missing essential DOM nodes');
    return;
  }

  // prevent early DropDownDiv crash
  if (Blockly.DropDownDiv?.createDom) Blockly.DropDownDiv.createDom();

  // workspace
  const ws = Blockly.inject('blocklyDiv', {
    toolbox,
    grid: { spacing: 20, length: 3, colour: '#eee', snap: true },
    zoom: { controls: true, wheel: true },
    trashcan: true,
  });

  load(ws);

  function updatePreview() {
    const py = generatePython(ws);
    codeDiv.textContent = py;
    return py;
  }
  updatePreview();

  ws.addChangeListener((e) => {
    if (!e.isUiEvent) save(ws);
    updatePreview();
  });

  // console helpers
  function clearConsole() { consoleDiv.textContent = ''; }
  function write(text) {
    consoleDiv.append(document.createTextNode(String(text)));
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
  }
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

  // Pyodide load + turtle setup
  let pyodide = null;
  let turtle = null;

  runBtn.disabled = true;
  if (statusEl) statusEl.textContent = 'Loading Pyodide…';

  (async () => {
    try {
      pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });

      // register turtle module
      turtle = makeTurtle(turtleCanvas);
      pyodide.registerJsModule('turtlejs', turtle);

      runBtn.disabled = false;
      runBtn.textContent = 'Run';
      if (statusEl) statusEl.textContent = 'Pyodide loaded';
    } catch (err) {
      console.error(err);
      runBtn.textContent = 'Load failed';
      if (statusEl) statusEl.textContent = 'Pyodide failed to load';
      consoleDiv.textContent = 'Pyodide failed to load.';
    }
  })();

  // run button click
  runBtn.addEventListener('click', async () => {
    if (!pyodide) return;
    clearConsole();
    if (turtle) turtle.clear(); // clear canvas

    const py = generatePython(ws);
    const fullCode = PY_PRELUDE + '\n' + py;

    try {
      await pyodide.runPythonAsync(fullCode);
      if (!consoleDiv.textContent.trim()) consoleDiv.textContent = '(no output)';
    } catch (err) {
      consoleDiv.append(document.createTextNode('\n' + String(err) + '\n'));
    }
  });

  clearBtn.addEventListener('click', clearConsole);
});
