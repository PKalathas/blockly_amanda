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
import './blocks/shapes';
import './blocks/python_raw';
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

  let penColor = 'black';
  ctx.strokeStyle = penColor;

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

    octx.beginPath();
    octx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(34, 197, 94, 0.9)';
    octx.fill();
    octx.strokeStyle = 'rgba(0,0,0,0.5)';
    octx.lineWidth = 1;
    octx.stroke();

    octx.beginPath();
    octx.arc(0, -18, 4, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(34, 197, 94, 0.9)';
    octx.fill();
    octx.stroke();

    octx.beginPath();
    octx.arc(-12, -6, 3, 0, Math.PI * 2);
    octx.arc(12, -6, 3, 0, Math.PI * 2);
    octx.arc(-12, 6, 3, 0, Math.PI * 2);
    octx.arc(12, 6, 3, 0, Math.PI * 2);
    octx.fillStyle = 'rgba(34, 197, 94, 0.85)';
    octx.fill();

    octx.beginPath();
    octx.moveTo(0, 14);
    octx.lineTo(0, 20);
    octx.strokeStyle = 'rgba(0,0,0,0.5)';
    octx.stroke();

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
    penColor = 'black';
    ctx.strokeStyle = penColor;
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
    setcolor(color) {
      penColor = String(color);
      ctx.strokeStyle = penColor;
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
    setcolor(color) {
      player.enqueue(() => turtle.setcolor(color));
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
  const rawLines = pyText.split('\n');
  const lines = rawLines.map((raw) => ({ raw, t: raw.trim() }));

  const steps = [];

  const turtleCallRe = new RegExp(
    `^(?:${alias}|turtle|turtlejs|t)\\.(forward|backward|left|right|penup|pendown|goto|setx|sety|setheading|setcolor)\\((.*)\\)\\s*$`
  );

  const printRe = /^print\((.*)\)\s*$/;

  const ifSqrtRe =
    /^if\s+(\d+(?:\.\d+)?)\s*(!=|==|<=|>=|<|>)\s*math\.sqrt\(\s*(\d+(?:\.\d+)?)\s*\)\s*:\s*$/;

  const assignRe = /^([A-Za-z_]\w*)\s*=\s*(.+)\s*$/;

  const opToBlockly = {
    '==': 'EQ',
    '!=': 'NEQ',
    '<': 'LT',
    '<=': 'LTE',
    '>': 'GT',
    '>=': 'GTE',
  };

  let rawBuf = [];

  const flushRaw = () => {
    if (rawBuf.length === 0) return;
    while (rawBuf.length && rawBuf[0].trim() === '') rawBuf.shift();
    while (rawBuf.length && rawBuf[rawBuf.length - 1].trim() === '') rawBuf.pop();
    if (rawBuf.length) steps.push({ kind: 'raw', code: rawBuf.join('\n') });
    rawBuf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const { raw, t } = lines[i];

    if (/^import\s+math\s*$/.test(t)) continue;
    if (/^import\s+turtlejs\s+as\s+t\s*$/.test(t)) continue;

    if (!t) {
      flushRaw();
      if (steps.length && steps[steps.length - 1].kind !== 'sep') {
        steps.push({ kind: 'sep' });
      }
      continue;
    }

    if (t.startsWith('#')) {
      rawBuf.push(raw);
      continue;
    }

    const im = t.match(ifSqrtRe);
    if (im) {
      let j = i + 1;
      while (j < lines.length && lines[j].t === '') j++;

      if (j >= lines.length || !/^\s+/.test(lines[j].raw)) {
        rawBuf.push(raw);
        continue;
      }

      const bodyTrim = lines[j].t;
      const pm = bodyTrim.match(printRe);

      if (!pm) {
        rawBuf.push(raw);
        rawBuf.push(lines[j].raw);
        i = j;
        continue;
      }

      const inside = (pm[1] ?? '').trim();
      const str = inside ? parsePyStringLiteral(inside) : '';
      if (str == null) {
        rawBuf.push(raw);
        rawBuf.push(lines[j].raw);
        i = j;
        continue;
      }

      flushRaw();

      steps.push({
        kind: 'if_sqrt_print',
        leftNum: Number(im[1]),
        op: opToBlockly[im[2]] ?? 'NEQ',
        sqrtArg: Number(im[3]),
        printText: str,
      });

      i = j;
      continue;
    }

    const pm = t.match(printRe);
    if (pm) {
      const inside = (pm[1] ?? '').trim();
      const str = inside ? parsePyStringLiteral(inside) : '';
      if (str == null) {
        rawBuf.push(raw);
        continue;
      }
      flushRaw();
      steps.push({ kind: 'print', text: str ?? '' });
      continue;
    }

    const tm = t.match(turtleCallRe);
    if (tm) {
      const fn = tm[1];
      const argsRaw = (tm[2] ?? '').trim();
      const args = argsRaw
        ? argsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      flushRaw();
      steps.push({ kind: 'turtle', fn, args });
      continue;
    }

    const am = t.match(assignRe);
    if (am) {
      const name = am[1];
      const rhs = (am[2] ?? '').trim();

      if (/^-?\d+(?:\.\d+)?$/.test(rhs)) {
        flushRaw();
        steps.push({
          kind: 'var_set',
          name,
          value: { kind: 'number', value: Number(rhs) },
        });
        continue;
      }

      if (/^[A-Za-z_]\w*$/.test(rhs)) {
        flushRaw();
        steps.push({
          kind: 'var_set',
          name,
          value: { kind: 'var_get', name: rhs },
        });
        continue;
      }
    }

    rawBuf.push(raw);
  }

  flushRaw();
  while (steps.length && steps[steps.length - 1].kind === 'sep') steps.pop();
  return { ok: true, steps };
}

function numberShadow(n) {
  return { shadow: { type: 'math_number', fields: { NUM: String(n) } } };
}

function textShadow(s) {
  return { shadow: { type: 'text', fields: { TEXT: String(s) } } };
}

function varId(name) {
  return `var_${name}`;
}

function collectVariableNamesFromSteps(steps) {
  const set = new Set();
  for (const step of steps) {
    if (step.kind === 'var_set') {
      set.add(step.name);
      if (step.value?.kind === 'var_get') set.add(step.value.name);
    }
  }
  return [...set];
}

function stepsToWorkspaceJson(steps, posById = {}) {
  const topBlocks = [];

  let first = null;
  let prev = null;

  const startNewStack = () => {
    first = null;
    prev = null;
  };

  const pushStackIfAny = () => {
    if (!first) return;
    topBlocks.push(first);
    startNewStack();
  };

  const append = (block) => {
    if (!first) first = block;
    if (prev) prev.next = { block };
    prev = block;
  };

  let fallbackX = 20;
  let fallbackY = 20;
  const bumpFallback = () => {
    fallbackY += 140;
    if (fallbackY > 700) {
      fallbackY = 20;
      fallbackX += 380;
    }
  };

  const placeTopBlock = (block) => {
    const p = posById[block.id];
    if (p) {
      block.x = p.x;
      block.y = p.y;
    } else {
      block.x = fallbackX;
      block.y = fallbackY;
      bumpFallback();
    }
  };

  steps.forEach((step, i) => {
    if (step.kind === 'sep') {
      pushStackIfAny();
      return;
    }

    if (step.kind === 'raw') {
      append({
        type: 'python_raw',
        id: `raw${i}`,
        fields: { CODE: step.code ?? '' },
      });
      return;
    }

    if (step.kind === 'print') {
      append({
        type: 'text_print',
        id: `p${i}`,
        inputs: { TEXT: textShadow(step.text ?? '') },
      });
      return;
    }

    if (step.kind === 'if_sqrt_print') {
      append({
        type: 'controls_if',
        id: `if${i}`,
        inputs: {
          IF0: {
            block: {
              type: 'logic_compare',
              id: `cmp${i}`,
              fields: { OP: step.op },
              inputs: {
                A: numberShadow(step.leftNum),
                B: {
                  block: {
                    type: 'math_single',
                    id: `sqrt${i}`,
                    fields: { OP: 'ROOT' },
                    inputs: { NUM: numberShadow(step.sqrtArg) },
                  },
                },
              },
            },
          },
          DO0: {
            block: {
              type: 'text_print',
              id: `ifp${i}`,
              inputs: { TEXT: textShadow(step.printText ?? '') },
            },
          },
        },
      });
      return;
    }

    if (step.kind === 'var_set') {
      const lhsName = step.name;
      const lhsId = varId(lhsName);

      const block = {
        type: 'variables_set',
        id: `vset${i}`,
        fields: {
          VAR: { name: lhsName, id: lhsId },
        },
        inputs: {},
      };

      if (step.value?.kind === 'number') {
        block.inputs.VALUE = numberShadow(step.value.value);
      } else if (step.value?.kind === 'var_get') {
        const rhsName = step.value.name;
        const rhsId = varId(rhsName);
        block.inputs.VALUE = {
          block: {
            type: 'variables_get',
            id: `vget${i}`,
            fields: {
              VAR: { name: rhsName, id: rhsId },
            },
          },
        };
      } else {
        block.inputs.VALUE = numberShadow(0);
      }

      append(block);
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
        setcolor: 'turtle_setcolor',
      };

      const type = TYPE[step.fn];
      if (!type) {
        append({
          type: 'python_raw',
          id: `rawt${i}`,
          fields: { CODE: `# unsupported turtle call: ${step.fn}\n` },
        });
        return;
      }

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
      } else if (step.fn === 'setcolor') {
        block.inputs.COLOR = textShadow(
          (step.args[0] ?? '').replace(/^['"]|['"]$/g, '')
        );
      }

      append(block);
    }
  });

  pushStackIfAny();
  topBlocks.forEach((b) => placeTopBlock(b));

  const variableNames = collectVariableNamesFromSteps(steps);
  const variables = variableNames.map((name) => ({
    name,
    id: varId(name),
    type: '',
  }));

  return {
    variables,
    blocks: {
      languageVersion: 0,
      blocks: topBlocks,
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

  function trySyncBlocksFromPython(pyText) {
    const parsed = parsePythonToSteps(pyText);
    if (!parsed.ok) {
      statusEl.textContent = parsed.reason || 'Cannot sync blocks from Python';
      return;
    }

    const posById = {};
    ws.getTopBlocks(false).forEach((b) => {
      const xy = b.getRelativeToSurfaceXY();
      posById[b.id] = { x: xy.x, y: xy.y };
    });

    const wsJson = stepsToWorkspaceJson(parsed.steps, posById);

    isApplyingTextToBlocks = true;
    try {
      ws.clear();

      Blockly.serialization.workspaces.load(wsJson, ws);

      ws.getTopBlocks(false).forEach((b) => {
        const p = posById[b.id];
        if (p) {
          b.moveBy(
            p.x - b.getRelativeToSurfaceXY().x,
            p.y - b.getRelativeToSurfaceXY().y
          );
        }
      });

      ws.render();

      statusEl.textContent = 'Synced Python → Blocks';
      if (!isEditingCodeBox) codeDirty = false;
    } finally {
      isApplyingTextToBlocks = false;
    }
  }

  codeBox.addEventListener('input', () => {
    codeDirty = true;
    if (isApplyingTextToBlocks) return;

    debounce(() => {
      trySyncBlocksFromPython(codeBox.value);
    }, 250);
  });

  ws.addChangeListener((e) => {
    if (!e.isUiEvent) save(ws);
    if (isApplyingTextToBlocks) return;

    if (e.type !== Blockly.Events.UI) {
      codeDirty = false;
      updateGeneratedFromBlocks();
      statusEl.textContent = 'Synced Blocks → Python';
    }
  });

  updateGeneratedFromBlocks();

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