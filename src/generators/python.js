import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

pythonGenerator.forBlock['text_print'] = function (block, generator) {
  const msg =
    generator.valueToCode(block, 'TEXT', pythonGenerator.ORDER_NONE) || "''";
  return `print(${msg})\n`;
};

pythonGenerator.forBlock['python_raw'] = function (block) {
  const code = block.getFieldValue('CODE') || '';
  return code.endsWith('\n') ? code : `${code}\n`;
};

pythonGenerator.forBlock['shape_square'] = function (block, generator) {
  const size =
    generator.valueToCode(block, 'SIZE', pythonGenerator.ORDER_NONE) || '50';

  return `for _ in range(4):\n    t.forward(${size})\n    t.right(90)\n`;
};

pythonGenerator.forBlock['shape_triangle'] = function (block, generator) {
  const size =
    generator.valueToCode(block, 'SIZE', pythonGenerator.ORDER_NONE) || '50';

  return `for _ in range(3):\n    t.forward(${size})\n    t.right(120)\n`;
};

pythonGenerator.forBlock['shape_rectangle'] = function (block, generator) {
  const width =
    generator.valueToCode(block, 'WIDTH', pythonGenerator.ORDER_NONE) || '80';

  const height =
    generator.valueToCode(block, 'HEIGHT', pythonGenerator.ORDER_NONE) || '50';

  return `for _ in range(2):\n    t.forward(${width})\n    t.right(90)\n    t.forward(${height})\n    t.right(90)\n`;
};

pythonGenerator.forBlock['shape_pentagon'] = function (block, generator) {
  const size =
    generator.valueToCode(block, 'SIZE', pythonGenerator.ORDER_NONE) || '50';

  return `for _ in range(5):\n    t.forward(${size})\n    t.right(72)\n`;
};

pythonGenerator.forBlock['turtle_setcolor'] = function (block, generator) {
  const color =
    generator.valueToCode(block, 'COLOR', pythonGenerator.ORDER_NONE) || "'black'";
  return `t.setcolor(${color})\n`;
};

pythonGenerator.forBlock['turtle_forward'] = function (block, generator) {
  const steps =
    generator.valueToCode(block, 'STEPS', pythonGenerator.ORDER_NONE) || '0';
  return `t.forward(${steps})\n`;
};

pythonGenerator.forBlock['turtle_backward'] = function (block, generator) {
  const steps =
    generator.valueToCode(block, 'STEPS', pythonGenerator.ORDER_NONE) || '0';
  return `t.backward(${steps})\n`;
};

pythonGenerator.forBlock['turtle_left'] = function (block, generator) {
  const angle =
    generator.valueToCode(block, 'ANGLE', pythonGenerator.ORDER_NONE) || '0';
  return `t.left(${angle})\n`;
};

pythonGenerator.forBlock['turtle_right'] = function (block, generator) {
  const angle =
    generator.valueToCode(block, 'ANGLE', pythonGenerator.ORDER_NONE) || '0';
  return `t.right(${angle})\n`;
};

pythonGenerator.forBlock['turtle_penup'] = function () {
  return `t.penup()\n`;
};

pythonGenerator.forBlock['turtle_pendown'] = function () {
  return `t.pendown()\n`;
};

pythonGenerator.forBlock['turtle_goto'] = function (block, generator) {
  const x =
    generator.valueToCode(block, 'X', pythonGenerator.ORDER_NONE) || '0';
  const y =
    generator.valueToCode(block, 'Y', pythonGenerator.ORDER_NONE) || '0';
  return `t.goto(${x}, ${y})\n`;
};

pythonGenerator.forBlock['turtle_setx'] = function (block, generator) {
  const x =
    generator.valueToCode(block, 'X', pythonGenerator.ORDER_NONE) || '0';
  return `t.setx(${x})\n`;
};

pythonGenerator.forBlock['turtle_sety'] = function (block, generator) {
  const y =
    generator.valueToCode(block, 'Y', pythonGenerator.ORDER_NONE) || '0';
  return `t.sety(${y})\n`;
};

pythonGenerator.forBlock['turtle_setheading'] = function (block, generator) {
  const angle =
    generator.valueToCode(block, 'ANGLE', pythonGenerator.ORDER_NONE) || '0';
  return `t.setheading(${angle})\n`;
};

pythonGenerator.init = function (workspace) {
  this.definitions_ = Object.create(null);
  this.functionNames_ = Object.create(null);

  if (!this.nameDB_) {
    this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
  }

  this.nameDB_.reset();
  this.nameDB_.setVariableMap(workspace.getVariableMap());
};

pythonGenerator.finish = function (code) {
  const definitions = Object.values(this.definitions_ || {});
  const allCode = [...definitions, code].filter(Boolean).join('\n');

  const needsTurtle =
    /\bt\.(forward|backward|left|right|penup|pendown|goto|setx|sety|setheading|setcolor)\(/.test(
      allCode
    );

  const prefix = needsTurtle ? 'import turtlejs as t\n' : '';
  return `${prefix}${allCode}`.replace(/\n{3,}/g, '\n\n').trim() + '\n';
};

export function generatePython(workspace) {
  return pythonGenerator.workspaceToCode(workspace);
}