
import { Game } from "./game.js"
import { Controls } from "./controls.js"
import { Assets } from "./assets.js"
import { Core } from "./core/core.js"
import { Renderer } from "./core/rendering.js"
import { CustomPopup } from "./custom_popup.js"

async function init() {
  CustomPopup.init();
  Game.canvas = document.getElementById('gameCanvas');
  Game.textInput = document.getElementById('textInput');
  Game.fileInput = document.getElementById('fileInput');
  Game.ctx = Game.canvas.getContext('2d');
  Game.dpr = window.devicePixelRatio || 1;

  await Assets.load();

  Game.manifest = Game.jsons['manifest'];
  Game.version = Game.manifest.version;
  Game.id = Game.manifest.name;

  Core.init();

  requestAnimationFrame(update);
}

function update() {
  requestAnimationFrame(update);
  const frameStart = performance.now();

  const now = performance.now();
  let dt = (now - Game.lastTimestamp) / 1000;
  Game.lastTimestamp = now;
  if (dt <= 0) return;
  Game.dt = Math.min(dt, 1/30);
  Game.fps = 1 / dt;
  Game.gameTime += dt;

  if (Controls.clicked('stepFrame') || !Controls.held('frameByFrame')) {
    Core.update(Game.dt);
  }
  Renderer.draw(Game.ctx);

  Game.recentFrameTimes.push(performance.now() - frameStart);
}

init();
