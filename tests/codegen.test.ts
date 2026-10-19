import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import { applyBlockMessages, defineBlocks, SAMPLE } from '../src/blocks/blocks';
import { toPython } from '../src/codegen/python';

defineBlocks();
applyBlockMessages('hu');

function generate(state: object): string {
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(state, ws);
  return toPython(ws, 'Négyzet', 'eseményfigyelés');
}

describe('Python generator', () => {
  it('turns the sample into an XRPLib program', () => {
    const py = generate(SAMPLE);
    expect(py.startsWith('# Négyzet · XRP Blocky\n')).toBe(true);
    expect(py).toContain('from XRPLib.defaults import *');
    expect(py).toContain('    for _ in range(int(4)):\n        drivetrain.straight(30, _speed)\n        drivetrain.turn(-90, _speed)');
    expect(py).toContain('on_start_1()\n');
    expect(py).toContain('_now = rangefinder.distance() < 15');
  });

  it('declares variables global inside event functions', () => {
    const py = generate({
      variables: [{ name: 'pont', id: 'v1' }],
      blocks: { languageVersion: 0, blocks: [{ type: 'xrp_when_button', next: { block: {
        type: 'variables_set', fields: { VAR: { id: 'v1' } }, inputs: { VALUE: { block: { type: 'math_number', fields: { NUM: 3 } } } } } } }] }
    });
    expect(py).toContain('global _speed, _t0, pont');
    expect(py).toContain('pont = 3');
    expect(py).toContain('on_button_1()');
  });
});
