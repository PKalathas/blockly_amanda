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