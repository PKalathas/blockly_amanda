import * as Blockly from 'blockly';

const TURTLE_COLOR = 160;

const definitions = Blockly.common.createBlockDefinitionsFromJsonArray([
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_start',
        message0: 'start the turtle loop %1',
        args0: [
            { type: 'input_statement', name: 'DO' }
        ],
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_forward',
        message0: 'move turtle forward by %1',
        args0: [
            { type: 'input_value', name: 'STEPS', check: 'Number' }
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_backward',
        message0: 'move turtle backward by %1',
        args0: [
            { type: 'input_value', name: 'STEPS', check: 'Number' }
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_left',
        message0: 'turn turtle left by %1 degrees',
        args0: [
            { type: 'input_value', name: 'ANGLE', check: 'Number' }
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_right',
        message0: 'turn turtle right by %1 degrees',
        args0: [
            { type: 'input_value', name: 'ANGLE', check: 'Number' }
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_goto',
        message0: 'move turtle to x: %1 y: %2',
        args0: [
            { type: 'input_value', name: 'X', check: 'Number' },
            { type: 'input_value', name: 'Y', check: 'Number' },
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_setx',
        message0: "set turtle's x position to %1",
        args0: [
            { type: 'input_value', name: 'X', check: 'Number' }
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_sety',
        message0: "set turtle's y position to %1",
        args0: [
            { type: 'input_value', name: 'Y', check: 'Number' }
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_setheading',
        message0: "set turtle's heading to %1 degrees",
        args0: [
            { type: 'input_value', name: 'ANGLE', check: 'Number' }
        ],
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_penup',
        message0: 'pull turtle pen up',
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
    {
        // The type specifies the kind of input or field to be inserted
        type: 'turtle_pendown',
        message0: 'pull turtle pen down',
        // Adds an untyped previous connection to the top of the block
        previousStatement: null,
        // Adds an untyped next connection to the bottom of the block
        nextStatement: null,
        colour: TURTLE_COLOR,
    },
]);

// Register the definition
Blockly.common.defineBlocks(definitions);