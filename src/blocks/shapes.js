import * as Blockly from 'blockly';

const SHAPES_COLOR = 210;

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
        colour: SHAPES_COLOR,
    },
]);