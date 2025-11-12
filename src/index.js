/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import 'blockly/blocks';
import { blocks } from './blocks/text';
import { generatePython } from './generators/python';
import { save, load } from './serialization';
import { toolbox } from './toolbox';
import './index.css';
import './blocks/turtle';

Blockly.common.defineBlocks(blocks);

window.addEventListener('DOMContentLoaded', () => {
  const codeDiv = document.querySelector('#generatedCode code');
  const consoleDiv = document.getElementById('console');
  const runBtn = document.getElementById('runBtn');
  const blocklyDiv = document.getElementById('blocklyDiv');

  if (!codeDiv || !consoleDiv || !runBtn || !blocklyDiv) {
    console.error('Missing DOM nodes: #generatedCode code, #console, #runBtn, #blocklyDiv');
    return;
  }

  const ws = Blockly.inject(blocklyDiv, { toolbox, autoCloseFlyout: false });

  function waitForSkulpt() {
    return new Promise((resolve) => {
      if (window.Sk) return resolve(window.Sk);
      const iv = setInterval(() => {
        if (window.Sk) {
          clearInterval(iv);
          resolve(window.Sk);
        }
      }, 50);
    });
  }

  // --- run generated Python ---
  async function runCode(pyCode) {
    const Sk = await waitForSkulpt();

    // clear console & show a quick status
    consoleDiv.textContent = '▶ running…\n';

    if (!Sk.builtinFiles || !Sk.builtinFiles.files) {
      consoleDiv.textContent += 'Skulpt stdlib not loaded.\n';
      return;
    }

    Sk.configure({
      output: (text) => {
        consoleDiv.append(document.createTextNode(text));
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
      },
      read: (name) => {
        const f = Sk.builtinFiles.files[name];
        if (f === undefined) throw new Error('File not found: ' + name);
        return f;
      },
      inputfunTakesPrompt: true,
      inputfun: (prompt) =>
        new Promise((resolve) => resolve(window.prompt(prompt || '') ?? '')),
      sysargv: ['skulpt'],
      execLimit: 0,
    });

    try {
      consoleDiv.textContent = '';
      await Sk.misceval.asyncToPromise(() =>
        Sk.importMainWithBody('<stdin>', false, pyCode, true)
      );
    } catch (err) {
      consoleDiv.append(document.createTextNode('\n' + err.toString() + '\n'));
    }

    if (!consoleDiv.textContent.trim()) {
      consoleDiv.textContent = '(no output)';
    }
  }

  // keep top-left preview in sync
  function updateCodePreview() {
    const py = generatePython(ws);
    codeDiv.textContent = py;
    return py;
  }

  load(ws);
  updateCodePreview();

  ws.addChangeListener((e) => { if (!e.isUiEvent) save(ws); });

  let debounce;
  ws.addChangeListener((e) => {
    if (e.isUiEvent || e.type === Blockly.Events.FINISHED_LOADING || ws.isDragging()) return;
    clearTimeout(debounce);
    debounce = setTimeout(updateCodePreview, 120);
  });

  // run button
  runBtn.type = 'button';
  runBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const py = updateCodePreview();
    await runCode(py);
  });

  window.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const py = updateCodePreview();
      await runCode(py);
    }
  });
});
