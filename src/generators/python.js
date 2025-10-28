import { pythonGenerator } from 'blockly/python';

const TURTLE_PREAMBLE = `import turtle \n\n`;

export function generatePython(ws) {
    const body = pythonGenerator.workspaceToCode(ws);

    // only add turtle library if there are turtle blocks
    const hasTurtle = ws.getAllBlocks(false).some(b => b.type.startsWith('turtle_'));
    return (hasTurtle ? TURTLE_PREAMBLE : '') + body;
}

pythonGenerator.forBlock['turtle_start'] = function (block) {
    const statements = pythonGenerator.statementToCode(block, 'DO') || '';
    return statements;
};

pythonGenerator.forBlock['turtle_forward'] = function (block) {
    const steps = pythonGenerator.valueToCode(block, 'STEPS', pythonGenerator.ORDER_NONE) || '0';
    return `t.forward(${steps})\n`;
};

pythonGenerator.forBlock['turtle_backward'] = function (block) {
    const steps = pythonGenerator.valueToCode(block, 'STEPS', pythonGenerator.ORDER_NONE) || '0';
    return `t.backward(${steps})\n`;
};

pythonGenerator.forBlock['turtle_left'] = function (block) {
    const angle = pythonGenerator.valueToCode(block, 'ANGLE', pythonGenerator.ORDER_NONE) || '0';
    return `t.left(${angle})\n`;
};

pythonGenerator.forBlock['turtle_right'] = function (block) {
    const angle = pythonGenerator.valueToCode(block, 'ANGLE', pythonGenerator.ORDER_NONE) || '0';
    return `t.right(${angle})\n`;
};

pythonGenerator.forBlock['turtle_goto'] = function (block) {
    const x = pythonGenerator.valueToCode(block, 'X', pythonGenerator.ORDER_NONE) || '0';
    const y = pythonGenerator.valueToCode(block, 'Y', pythonGenerator.ORDER_NONE) || '0';
    return `t.goto(${x}, ${y})\n`;
};

pythonGenerator.forBlock['turtle_setx'] = function (block) {
    const x = pythonGenerator.valueToCode(block, 'X', pythonGenerator.ORDER_NONE) || '0';
    return `t.setx(${x})\n`;
};

pythonGenerator.forBlock['turtle_sety'] = function (block) {
    const y = pythonGenerator.valueToCode(block, 'Y', pythonGenerator.ORDER_NONE) || '0';
    return `t.sety(${y})\n`;
};

pythonGenerator.forBlock['turtle_setheading'] = function (block) {
    const a = pythonGenerator.valueToCode(block, 'ANGLE', pythonGenerator.ORDER_NONE) || '0';
    return `t.setheading(${a})\n`;
};

pythonGenerator.forBlock['turtle_penup'] = () => `t.penup()\n`;
pythonGenerator.forBlock['turtle_pendown'] = () => `t.pendown()\n`;
