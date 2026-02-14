import * as Blockly from 'blockly';

Blockly.Blocks['python_raw'] = {
  init: function () {
    this.appendDummyInput().appendField('Python code');

    this.appendDummyInput().appendField(new Blockly.FieldTextInput(''), 'CODE');

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(15);
    this.setTooltip('Raw Python code (kept as-is).');
    this.setHelpUrl('');
  },
};
