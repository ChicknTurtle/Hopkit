
import { Vec2 } from "./utils/lib.js"
import { Game } from "./game.js"
import { EventBus } from "./core/eventBus.js";
import { CustomPopup } from "./custom_popup.js"

export const InputManager = {
  inputs: {},
  inputsClicked: {},
  inputsReleased: {},
}

InputManager.pressInput = function(input) {
  InputManager.inputs[input] = true;
  InputManager.inputsClicked[input] = true;
  EventBus.emit('input:pressed', input);
}

InputManager.releaseInput = function(input) {
  delete InputManager.inputs[input];
  InputManager.inputsReleased[input] = true;
  EventBus.emit('input:released', input);
}

InputManager.unfocusKeys = function() {
  const held = Object.keys(InputManager.inputs);
  InputManager.inputs = {};
  held.forEach(input => {
    InputManager.releaseInput(input);
  });
}

InputManager.unfocusMouse = function() {
  Game.mousePos = null;
  Game.prevMousePos = null;
}

InputManager.clearFrame = function() {
  InputManager.inputsClicked = {};
  InputManager.inputsReleased = {};
}

window.addEventListener('blur', function(event) {
  InputManager.unfocusKeys();
  InputManager.unfocusMouse();
});

window.addEventListener('visibilitychange', function(event) {
  InputManager.unfocusKeys();
  InputManager.unfocusMouse();
  if (Game.loading) return;
  if (Game.state === 'editor') {
    if (document.visibilityState === 'hidden') {
      EventBus.emit('editor:autosave');
    }
  }
});

window.addEventListener('pointerleave', function(event) {
  InputManager.unfocusMouse();
});

document.addEventListener('mousemove', function(event) {
  if (CustomPopup.showing) return;
  Game.mousePos = new Vec2(event.clientX, event.clientY);
});

document.addEventListener('mousedown', function(event) {
  if (CustomPopup.showing) return;
  Game.mousePos = new Vec2(event.clientX, event.clientY);
  InputManager.pressInput('Mouse'+event.button);
});

document.addEventListener('mouseup', function(event) {
  InputManager.releaseInput('Mouse'+event.button);
});

document.addEventListener('keydown', function(event) {
  if (Game.loading) return;
  if (event.metaKey) {
    if (event.code === 'KeyZ') event.preventDefault();
  } else {
    event.preventDefault();
  }
  if (CustomPopup.showing) {
    if (event.code === 'Escape') CustomPopup.hide();
    return;
  }
  InputManager.pressInput(event.code);
});

document.addEventListener('keyup', function(event) {
  if (Game.loading) return;
  if (event.code === 'MetaLeft' || event.code === 'MetaRight') {
    InputManager.unfocusKeys();
    return;
  }
  InputManager.releaseInput(event.code);
});

document.addEventListener('contextmenu', function(event) {
  if (Game.loading) return;
  event.preventDefault();
});

document.addEventListener('wheel', function(event) {
  if (CustomPopup.showing) return;
  event.preventDefault();
  InputManager.inputsClicked['scroll'] ??= 0;
  InputManager.inputsClicked['scroll'] += event.deltaX+event.deltaY;
},{ passive:false });
