import { Game } from "./game.js"
import { InputManager } from "./inputs.js";
import { EventBus } from "./core/eventBus.js";

export const Controls = {
  controls: {},
  _held: {},
  _clicked: {},
  _released: {},
  _primaryKeyIndex: {},
  _watchKeyIndex: {},
}
function makeStateCheck(stateMap) {
  return function(id) {
    const ids = Array.isArray(id) ? id : [id];
    if (ids.length === 0) return false;
    return ids.every(i => !!stateMap[i]);
  };
}

Controls.held = makeStateCheck(Controls._held);
Controls.clicked = makeStateCheck(Controls._clicked);
Controls.released = makeStateCheck(Controls._released);

// Register controls
Controls.registerControls = function() {
  Controls.addControl('leftMouse', 'Left Mouse', 'general', [{ key: 'Mouse0' }]);
  Controls.addControl('rightMouse', 'Right Mouse', 'general', [{ key: 'Mouse2' }]);
  Controls.addControl('middleMouse', 'Middle Mouse', 'general', [{ key: 'Mouse1' }]);
  Controls.addControl('moveLeft', 'Move Left', 'player', [{ key: 'KeyA' },{ key: 'ArrowLeft' }]);
  Controls.addControl('moveRight', 'Move Right', 'player', [{ key: 'KeyD' },{ key: 'ArrowRight' }]);
  Controls.addControl('jump', 'Jump', 'player', [{ key: 'KeyW' },{ key: 'ArrowUp' },{ key: 'Space' }]);
  Controls.addControl('crouch', 'Crouch', 'player', [{ key: 'KeyS' },{ key: 'ArrowDown' }]);
  Controls.addControl('attack', 'Attack', 'player', [{ key: 'KeyX' },{ key: 'KeyK' }]);
  Controls.addControl('editorCamLeft', 'Camera Left', 'editor', [{ key: 'KeyA' },{ key: 'ArrowLeft' }]);
  Controls.addControl('editorCamRight', 'Camera Right', 'editor', [{ key: 'KeyD' },{ key: 'ArrowRight' }]);
  Controls.addControl('editorCamUp', 'Camera Up', 'editor', [{ key: 'KeyW' },{ key: 'ArrowUp' }]);
  Controls.addControl('editorCamDown', 'Camera Down', 'editor', [{ key: 'KeyS' },{ key: 'ArrowDown' }]);
  Controls.addControl('editorZoomIn', 'Zoom In', 'editor', [{ key: 'Equal' }]);
  Controls.addControl('editorZoomOut', 'Zoom Out', 'editor', [{ key: 'Minus' }]);
  Controls.addControl('editorToggleGrid', 'Toggle Grid', 'editor', [{ key: 'KeyG' }]);
  Controls.addControl('editorUndo', 'Undo', 'editor', [{ key: 'KeyZ', modifiers: [['MetaLeft','MetaRight']], exclude: [['ShiftLeft','ShiftRight']] }]);
  Controls.addControl('editorRedo', 'Redo', 'editor', [{ key: 'KeyZ', modifiers: [['ShiftLeft','ShiftRight'], ['MetaLeft','MetaRight']] }]);
  Controls.addControl('exitMenu', 'Back', 'misc', [{ key: 'Escape' }]);
  Controls.addControl('frameByFrame', 'Frame by Frame', 'dev', [{ key: 'KeyP' }]);
  Controls.addControl('stepFrame', 'Step Frame', 'dev', [{ key: 'KeyO' }]);
}

function isKeybindActive(keybind) {
  if (!InputManager.inputs[keybind.key]) return false;
  if (keybind.modifiers && keybind.modifiers.length > 0) {
    const modifiersOk = keybind.modifiers.every(group => group.some(mod => !!InputManager.inputs[mod]));
    if (!modifiersOk) return false;
  }
  if (keybind.exclude && keybind.exclude.length > 0) {
    const excludeOk = keybind.exclude.every(group => group.every(mod => !InputManager.inputs[mod]));
    if (!excludeOk) return false;
  }
  return true;
}

function isControlActive(control) {
  return control.keybinds.some(isKeybindActive);
}

function keybindWatchKeys(keybind) {
  const modifierKeys = (keybind.modifiers || []).flat();
  const excludeKeys = (keybind.exclude || []).flat();
  return [...modifierKeys, ...excludeKeys];
}

function indexControl(control) {
  control.keybinds.forEach(keybind => {
    if (!Controls._primaryKeyIndex[keybind.key]) Controls._primaryKeyIndex[keybind.key] = new Set();
    Controls._primaryKeyIndex[keybind.key].add(control.id);

    keybindWatchKeys(keybind).forEach(key => {
      if (!Controls._watchKeyIndex[key]) Controls._watchKeyIndex[key] = new Set();
      Controls._watchKeyIndex[key].add(control.id);
    });
  });
}

function unindexControl(control) {
  control.keybinds.forEach(keybind => {
    Controls._primaryKeyIndex[keybind.key]?.delete(control.id);
    if (Controls._primaryKeyIndex[keybind.key]?.size === 0) delete Controls._primaryKeyIndex[keybind.key];

    keybindWatchKeys(keybind).forEach(key => {
      Controls._watchKeyIndex[key]?.delete(control.id);
      if (Controls._watchKeyIndex[key]?.size === 0) delete Controls._watchKeyIndex[key];
    });
  });
}

function reevaluateControl(id, allowActivate) {
  const control = Controls.controls[id];
  if (!control) return;
  const wasHeld = !!Controls._held[id];
  const isHeld = isControlActive(control);

  if (isHeld) {
    if (!allowActivate) return;
    Controls._held[id] = true;
    Controls._clicked[id] = true;
    EventBus.emit('control:pressed', id);
  } else if (!isHeld && wasHeld) {
    delete Controls._held[id];
    Controls._released[id] = true;
    EventBus.emit('control:released', id);
  }
}

Controls.addControl = function(id, name, category, keybinds) {
  if (!Array.isArray(keybinds)) keybinds = [keybinds];
  keybinds = keybinds.map(kb => ({
    key: kb.key,
    modifiers: kb.modifiers || [],
    exclude: kb.exclude || [],
  }));

  if (Controls.controls[id]) unindexControl(Controls.controls[id]);

  const control = { id, name, category, keybinds };
  Controls.controls[id] = control;
  indexControl(control);

  reevaluateControl(id, true);
}

Controls.removeControl = function(id) {
  const control = Controls.controls[id];
  if (!control) return;
  unindexControl(control);
  delete Controls.controls[id];
  delete Controls._held[id];
  delete Controls._clicked[id];
  delete Controls._released[id];
}

Controls.getControlsByCategory = function(category) {
  return Object.values(Controls.controls).filter(c => c.category === category);
}

Controls.clearFrame = function() {
  Object.keys(Controls._clicked).forEach(id => delete Controls._clicked[id]);
  Object.keys(Controls._released).forEach(id => delete Controls._released[id]);
}

function onPrimaryKeyPressed(key) {
  const affected = Controls._primaryKeyIndex[key];
  if (!affected) return;
  Array.from(affected).forEach(id => reevaluateControl(id, true));
}

function onKeyReleased(key) {
  const primary = Controls._primaryKeyIndex[key];
  const watched = Controls._watchKeyIndex[key];
  const affected = new Set([...(primary || []), ...(watched || [])]);
  affected.forEach(id => reevaluateControl(id, false));
}

function onWatchKeyPressed(key) {
  const affected = Controls._watchKeyIndex[key];
  if (!affected) return;
  Array.from(affected).forEach(id => reevaluateControl(id, false));
}

EventBus.on('input:pressed', key => {
  onPrimaryKeyPressed(key);
  onWatchKeyPressed(key);
});
EventBus.on('input:released', onKeyReleased);
