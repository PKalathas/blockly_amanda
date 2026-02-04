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

function makeTurtlePlayer(delayMs = 80) {
  const queue = [];
  let isPlaying = false;

  function enqueue(fn) {
    queue.push(fn);
  }

  function clearQueue() {
    queue.length = 0;
  }

  async function play() {
    if (isPlaying) return;
    isPlaying = true;

    while (queue.length > 0) {
      const fn = queue.shift();
      if (fn) fn();
      await new Promise((r) => setTimeout(r, delayMs));
    }

    isPlaying = false;
  }

  return {
    enqueue,
    clearQueue,
    play,
  };
}

function makeQueuedTurtle(turtle, player) {
  return {
    forward(d) {
      player.enqueue(() => turtle.forward(d));
    },
    backward(d) {
      player.enqueue(() => turtle.backward(d));
    },
    left(a) {
      player.enqueue(() => turtle.left(a));
    },
    right(a) {
      player.enqueue(() => turtle.right(a));
    },
    penup() {
      player.enqueue(() => turtle.penup());
    },
    pendown() {
      player.enqueue(() => turtle.pendown());
    },
    goto(x, y) {
      player.enqueue(() => turtle.goto(x, y));
    },
    setx(x) {
      player.enqueue(() => turtle.setx(x));
    },
    sety(y) {
      player.enqueue(() => turtle.sety(y));
    },
    setheading(a) {
      player.enqueue(() => turtle.setheading(a));
    },
    clear() {
      player.enqueue(() => turtle.clear());
    },
  };
}

function debounceFactory() {
  let timer = null;
  return function debounce(fn, ms = 300) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

function detectTurtleAlias(pyText) {
  const m = pyText.match(/import\s+turtlejs\s+as\s+([A-Za-z_]\w*)/);
  if (m) return m[1];
  return 't';
}

function parsePyStringLiteral(s) {
  const t = s.trim();
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    const inner = t.slice(1, -1);
    return inner
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }
  return null;
}

function parsePythonToSteps(pyText) {
  const alias = detectTurtleAlias(pyText);

  const lines = pyText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const steps = [];

  const turtleCallRe = new RegExp(
    `^(?:${alias}|turtle|turtlejs|t)\\.(forward|backward|left|right|penup|pendown|goto|setx|sety|setheading)\\((.*)\\)\\s*$`
  );

  const printRe = /^print\((.*)\)\s*$/;

  for (const rawLine of lines) {
    if (
      rawLine.startsWith('import ') ||
      rawLine.startsWith('from ') ||
      rawLine.startsWith('sys.') ||
      rawLine.startsWith('class ') ||
      rawLine.startsWith('def ') ||
      rawLine === 'pass'
    ) {
      continue;
    }

    const line = rawLine.replace(/[;]+$/, '').trim();

    const pm = line.match(printRe);
    if (pm) {
      const inside = (pm[1] ?? '').trim();
      if (!inside) {
        steps.push({ kind: 'print', text: '' });
        continue;
      }
      const str = parsePyStringLiteral(inside);
      if (str == null) {
        return {
          ok: false,
          reason: `Only print('...') or print("...") supported for sync: ${rawLine}`,
        };
      }
      steps.push({ kind: 'print', text: str });
      continue;
    }

    const tm = line.match(turtleCallRe);
    if (!tm) {
      return { ok: false, reason: `Unsupported Python for sync: ${rawLine}` };
    }

    const fn = tm[1];
    const argsRaw = (tm[2] ?? '').trim();
    const args = argsRaw
      ? argsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    steps.push({ kind: 'turtle', fn, args });
  }

  return { ok: true, steps };
}

function numberShadow(n) {
  return {
    shadow: {
      type: 'math_number',
      fields: { NUM: String(n) },
    },
  };
}

function textShadow(s) {
  return {
    shadow: {
      type: 'text',
      fields: { TEXT: String(s) },
    },
  };
}

function stepsToWorkspaceJson(steps) {
  let first = null;
  let prev = null;

  const append = (block) => {
    if (!first) first = block;
    if (prev) prev.next = { block };
    prev = block;
  };

  steps.forEach((step, i) => {
    if (step.kind === 'print') {
      append({
        type: 'text_print',
        id: `p${i}`,
        inputs: { TEXT: textShadow(step.text ?? '') },
      });
      return;
    }

    if (step.kind === 'turtle') {
      const TYPE = {
        forward: 'turtle_forward',
        backward: 'turtle_backward',
        left: 'turtle_left',
        right: 'turtle_right',
        goto: 'turtle_goto',
        setx: 'turtle_setx',
        sety: 'turtle_sety',
        setheading: 'turtle_setheading',
        penup: 'turtle_penup',
        pendown: 'turtle_pendown',
      };

      const type = TYPE[step.fn];
      if (!type) return;

      const block = { type, id: `t${i}`, inputs: {} };

      if (step.fn === 'forward' || step.fn === 'backward') {
        block.inputs.STEPS = numberShadow(step.args[0] ?? 0);
      } else if (
        step.fn === 'left' ||
        step.fn === 'right' ||
        step.fn === 'setheading'
      ) {
        block.inputs.ANGLE = numberShadow(step.args[0] ?? 0);
      } else if (step.fn === 'goto') {
        block.inputs.X = numberShadow(step.args[0] ?? 0);
        block.inputs.Y = numberShadow(step.args[1] ?? 0);
      } else if (step.fn === 'setx') {
        block.inputs.X = numberShadow(step.args[0] ?? 0);
      } else if (step.fn === 'sety') {
        block.inputs.Y = numberShadow(step.args[0] ?? 0);
      }

      append(block);
    }
  });

  const blocks = [];
  if (first) {
    first.x = 20;
    first.y = 20;
    blocks.push(first);
  }

  return {
    blocks: {
      languageVersion: 0,
      blocks,
    },
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const runBtn = document.getElementById('runBtn');
  const clearBtn = document.getElementById('clearBtn');
  const clearTurtleBtn = document.getElementById('clearTurtleBtn');

  const codeBox = document.getElementById('generatedCode');

  const consoleEl = document.getElementById('console');
  const statusEl = document.getElementById('status');
  const turtleCanvas = document.getElementById('turtleCanvas');
  const turtleOverlay = document.getElementById('turtleOverlay');

  if (
    !runBtn ||
    !clearBtn ||
    !clearTurtleBtn ||
    !codeBox ||
    !consoleEl ||
    !statusEl ||
    !turtleCanvas ||
    !turtleOverlay
  ) {
    console.error('Missing DOM nodes. Check ids in index.html.');
    return;
  }

  if (Blockly.DropDownDiv?.createDom) Blockly.DropDownDiv.createDom();

  const ws = Blockly.inject('blocklyDiv', {
    toolbox,
    grid: { spacing: 20, length: 3, colour: '#eee', snap: true },
    zoom: { controls: true, wheel: true },
    trashcan: true,
  });

  load(ws);

  let codeDirty = false;
  let isApplyingTextToBlocks = false;
  let isEditingCodeBox = false;
  const debounce = debounceFactory();

  codeBox.addEventListener('focus', () => (isEditingCodeBox = true));
  codeBox.addEventListener('blur', () => (isEditingCodeBox = false));

  function updateGeneratedFromBlocks() {
    const py = generatePython(ws) || '';
    if (!codeDirty && !isEditingCodeBox) {
      codeBox.value = py;
    }
    return py;
  }

  function workspaceIsTurtlePrintOnly() {
    const allowed = new Set(['text_print']);
    return ws
      .getAllBlocks(false)
      .filter((b) => !b.isShadow())
      .every((b) => b.type.startsWith('turtle_') || allowed.has(b.type));
  }

  function trySyncBlocksFromPython(pyText) {
    if (!workspaceIsTurtlePrintOnly()) {
      statusEl.textContent =
        'Python→Blocks sync supports only turtle + print for now.';
      return;
    }

    const parsed = parsePythonToSteps(pyText);
    if (!parsed.ok) {
      statusEl.textContent = parsed.reason || 'Cannot sync blocks from Python';
      return;
    }

    const wsJson = stepsToWorkspaceJson(parsed.steps);

    isApplyingTextToBlocks = true;
    try {
      Blockly.serialization.workspaces.load(wsJson, ws);
      if (!isEditingCodeBox) codeDirty = false;
      statusEl.textContent = 'Synced Python → Blocks';
    } finally {
      isApplyingTextToBlocks = false;
    }
  }

  codeBox.addEventListener('input', () => {
    codeDirty = true;
    if (isApplyingTextToBlocks) return;

    debounce(() => {
      trySyncBlocksFromPython(codeBox.value);
    }, 350);
  });

  ws.addChangeListener((e) => {
    if (!e.isUiEvent) save(ws);
    if (isApplyingTextToBlocks) return;

    if (e.type !== Blockly.Events.UI) {
      codeDirty = false;
      updateGeneratedFromBlocks();
      statusEl.textContent = 'Code Blocks → Python';
    }
  });

  updateGeneratedFromBlocks();

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

  let pyodide = null;
  let turtle = null;
  let turtlePlayer = null;

  clearTurtleBtn.addEventListener('click', () => {
    if (turtlePlayer) turtlePlayer.clearQueue();
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

  runBtn.disabled = true;
  runBtn.textContent = 'Loading Python…';
  statusEl.textContent = 'Loading Pyodide…';

  (async () => {
    try {
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      });

      turtle = makeTurtle(turtleCanvas, turtleOverlay);

      turtlePlayer = makeTurtlePlayer(80);
      const queuedTurtle = makeQueuedTurtle(turtle, turtlePlayer);
      pyodide.registerJsModule('turtlejs', queuedTurtle);

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

  runBtn.addEventListener('click', async () => {
    if (!pyodide) return;

    clearConsole();
    if (turtlePlayer) turtlePlayer.clearQueue();
    if (turtle) turtle.clear();

    const py = codeBox.value;
    const fullCode = PY_PRELUDE + '\n' + py;

    try {
      await pyodide.runPythonAsync(fullCode);

      if (turtlePlayer) {
        await turtlePlayer.play();
      }

      if (!consoleEl.textContent.trim()) consoleEl.textContent = '(no output)';
    } catch (err) {
      writeln(String(err));
    }
  });
});
