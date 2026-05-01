import * as Blockly from 'blockly';

Blockly.defineBlocksWithJsonArray([
    {
        type: 'shape_square',
        message0: 'draw square with size %1',
        args0: [
            {
                type: 'input_value',
                name: 'SIZE',
                check: 'Number',
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 210,
    },
    {
        type: 'shape_triangle',
        message0: 'draw triangle with size %1',
        args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }],
        previousStatement: null,
        nextStatement: null,
        colour: 210,
    },
    {
        type: 'shape_rectangle',
        message0: 'draw rectangle width %1 height %2',
        args0: [
            { type: 'input_value', name: 'WIDTH', check: 'Number' },
            { type: 'input_value', name: 'HEIGHT', check: 'Number' },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 210,
    },
    {
        type: 'shape_pentagon',
        message0: 'draw pentagon with size %1',
        args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }],
        previousStatement: null,
        nextStatement: null,
        colour: 210,
    },
    {
        type: 'turtle_setcolor',
        message0: 'set pen color to %1',
        args0: [
            {
                type: 'input_value',
                name: 'COLOR',
                check: 'String',
            },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
    },
]);