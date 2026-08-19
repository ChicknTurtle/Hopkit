
import { Vec2 } from "../utils/lib.js"
import { Game } from "./../game.js"
import { Controls } from "./../controls.js"
import { InputManager } from "./../inputs.js"
import { EventBus } from "./../core/eventBus.js"
import { StateManager } from "./../core/stateManager.js"
import { Elements } from "./elements.js"
import { Editor } from "../states/editor.js"
import { World } from "./../world/world.js"
import { WorldUtils } from "./../world/utils.js"
import { WorldIO } from "./../world/io.js"
import { AudioPlayer } from "./../audio.js"
import { Text } from "./../text.js"
import { UI } from "./ui.js"
import { Spritesheets } from "../spritesheets.js"
import { CustomPopup } from "./../custom_popup.js"

export const EditorElements = {}

EditorElements.CanvasPaintArea = class extends Elements.Element {
  constructor() {
    super(new Vec2(0, Editor.SIDEBAR_HEIGHT), new Vec2(0, 0));
    this.anchor = new Vec2(0, 0);
    this.pivot = new Vec2(0, 0);
    this.z = -100;
    this.hover = false;
  }
  updateHover(to) {
    this.hover = !!to;
  }
  tick() {
    super.tick();
    const sidebarWidth = Editor.viewingPalette ? Editor.SIDEBAR_WIDTH + Editor.PALETTE_WIDTH : Editor.SIDEBAR_WIDTH;
    this.size.x = Math.max(0, Game.canvas.width*(1/Game.dpr) - sidebarWidth);
    this.size.y = Math.max(0, Game.canvas.height*(1/Game.dpr) - Editor.SIDEBAR_HEIGHT);
    this.screenPos = this.getScreenPos();

    if (Editor.hasPopup || !this.hover) {
      if (InputManager.inputsReleased['Mouse0'] || InputManager.inputsReleased['Mouse1']) {
        Editor.EditHistory.endStroke();
      }
      return;
    }

    // pan
    if (InputManager.inputs['Mouse2'] || InputManager.inputsClicked['Mouse2']) {
      EventBus.emit('editor:pan', { delta: Game.mouseVel.divided(World.cam.zoom) });
    }
    if (InputManager.inputsClicked['pan']) {
      EventBus.emit('editor:pan', { delta: InputManager.inputsClicked['pan'] });
    }
    // zoom
    if (InputManager.inputsClicked['scroll']) {
      EventBus.emit('editor:zoom', { amount: InputManager.inputsClicked['scroll'], pos: Game.mousePos });
    }

    if (InputManager.inputsClicked['Mouse0'] || InputManager.inputsClicked['Mouse1']) {
      Editor.EditHistory.beginStroke();
    }

    // paint/erase
    const prevMousePos = Game.prevMousePos ?? Game.mousePos;
    if (Game.mousePos && (InputManager.inputs['Mouse0'] || InputManager.inputsClicked['Mouse0'] || InputManager.inputs['Mouse1'] || InputManager.inputsClicked['Mouse1'])) {
      if (Editor.erasing) {
        let didChange = false;
        WorldUtils.getIntersectingTiles(WorldUtils.getGamePos(prevMousePos), WorldUtils.getGamePos(Game.mousePos)).forEach(tilepos => {
          Object.values(World.layers).forEach(layer => {
            didChange = Editor.setTileAt(tilepos, layer, null) || didChange;
          });
        });
        if (didChange) { AudioPlayer.playSound('ui.remove_tile'); }
      } else {
        let didChange = false;
        WorldUtils.getIntersectingTiles(WorldUtils.getGamePos(prevMousePos), WorldUtils.getGamePos(Game.mousePos)).forEach(tilepos => {
          didChange = Editor.setTileAt(tilepos, World.tileInfo[Editor.selectedTile.id]?.layer ?? 0, Editor.selectedTile.id) || didChange;
        });
        if (didChange) { AudioPlayer.playSound('ui.place_tile'); }
      }
      Editor.unsavedChanges = true;
    }

    if (InputManager.inputsReleased['Mouse0'] || InputManager.inputsReleased['Mouse1']) {
      Editor.EditHistory.endStroke();
      Editor.moveHotbarIndexToFront(Editor.selectedHotbarIndex);
    }
  }
  draw(ctx) {
  }
}

EditorElements.Sidebar = class extends Elements.Element {
  constructor() {
    super(new Vec2(0, Editor.SIDEBAR_HEIGHT), new Vec2(Editor.SIDEBAR_WIDTH, 0));
    this.anchor = new Vec2(1, 0);
    this.pivot = new Vec2(1, 0);
    this.z = -1;
  }
  updateHover(to) {
  }
  tick() {
    super.tick();
    this.size.y = Game.canvas.height*(1/Game.dpr) - Editor.SIDEBAR_HEIGHT;
    this.screenPos = this.getScreenPos();
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    ctx.globalAlpha = 0.5
    Spritesheets.drawExact(ctx, 'ui', 'sidebar-right', pos.x, pos.y + 8, this.size.x, this.size.y - 8);
    ctx.globalAlpha = 1
  }
}

EditorElements.TopBar = class extends Elements.Element {
  constructor() {
    super(new Vec2(0, 0), new Vec2(0, Editor.SIDEBAR_HEIGHT));
    this.anchor = new Vec2(0, 0);
    this.pivot = new Vec2(0, 0);
    this.z = -1;
  }
  updateHover(to) {
  }
  tick() {
    super.tick();
    this.size.x = Game.canvas.width*(1/Game.dpr);
    this.screenPos = this.getScreenPos();
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    ctx.globalAlpha = 0.5
    Spritesheets.drawExact(ctx, 'ui', 'sidebar-corner', this.size.x - 78, 0, 78, 78);
    Spritesheets.drawExact(ctx, 'ui', 'sidebar-top', pos.x, pos.y, this.size.x - 78, this.size.y);
    ctx.globalAlpha = 1
  }
}

EditorElements.EraseButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-9,190), new Vec2(48,48));
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
    this.onClick = () => {
      Editor.erasing = !Editor.erasing;
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (Editor.erasing) {
      if (this.hover) {
        Spritesheets.drawExact(ctx, 'ui', 'erase-button-active-hover', pos.x, pos.y, this.size.x, this.size.y);
      } else {
        Spritesheets.drawExact(ctx, 'ui', 'erase-button-active', pos.x, pos.y, this.size.x, this.size.y);
      }
    } else {
      if (this.hover) {
        Spritesheets.drawExact(ctx, 'ui', 'erase-button-hover', pos.x, pos.y, this.size.x, this.size.y);
      } else {
        Spritesheets.drawExact(ctx, 'ui', 'erase-button', pos.x, pos.y, this.size.x, this.size.y);
      }
    }
  }
}

EditorElements.SaveButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-9,-120), new Vec2(48,48));
    this.anchor = new Vec2(1,1);
    this.pivot = new Vec2(1,1);
    this.onClick = () => {
      const code = WorldIO.getLevelCode();
      CustomPopup.show({
        title: "Save Level",
        text: code,
        buttons: [
          {
            label: "Copy",
            closeOnClick: false,
            onClick(btn) {
              CustomPopup.textInput.select();
              navigator.clipboard.writeText(code).then(() => {
                btn.textContent = "Copied!";
              }).catch(err => {
                console.error("Failed to copy:", err);
                alert("Failed to copy: " + err);
              });
            }
          },
          {
            label: "Download",
            onClick(btn) {
              WorldIO.saveToFile();
            }
          },
          { label: "Close", onClick: () => {} }
        ]
      });
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (this.hover) {
      Spritesheets.drawExact(ctx, 'ui', 'save-button-hover', pos.x, pos.y, this.size.x, this.size.y);
    } else {
      Spritesheets.drawExact(ctx, 'ui', 'save-button', pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.LoadButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-9,-70), new Vec2(48,48));
    this.anchor = new Vec2(1,1);
    this.pivot = new Vec2(1,1);
    this.onClick = () => {
      CustomPopup.show({
        title: "Load Level",
        buttons: [
          {
            label: "Open File",
            onClick(btn) {
              WorldIO.loadFromFile();
            }
          },
          {
            label: "Paste Code",
            onClick(btn) {
              WorldIO.loadFromCode();
            }
          },
          { label: "Close", onClick: () => {} }
        ]
      });
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (this.hover) {
      Spritesheets.drawExact(ctx, 'ui', 'load-button-hover', pos.x, pos.y, this.size.x, this.size.y);
    } else {
      Spritesheets.drawExact(ctx, 'ui', 'load-button', pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.UndoButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-9,250), new Vec2(48,48));
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
    this.onClick = () => {
      Editor.EditHistory.undo();
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    // button
    if (this.hover) {
      Spritesheets.drawExact(ctx, 'ui', 'undo-button-hover', pos.x, pos.y, this.size.x, this.size.y);
    } else {
      Spritesheets.drawExact(ctx, 'ui', 'undo-button', pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.RedoButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-9,300), new Vec2(48,48));
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
    this.onClick = () => {
      Editor.EditHistory.redo();
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    // button
    if (this.hover) {
      Spritesheets.drawExact(ctx, 'ui', 'redo-button-hover', pos.x, pos.y, this.size.x, this.size.y);
    } else {
      Spritesheets.drawExact(ctx, 'ui', 'redo-button', pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.BackButton = class extends Elements.Button {
  constructor(onClick=null) {
    super(new Vec2(7,9), new Vec2(48,48), onClick);
    this.anchor = new Vec2(0,0);
    this.pivot = new Vec2(0,0);
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (this.hover) {
      Spritesheets.drawExact(ctx, 'ui', 'back-button-hover', pos.x, pos.y, this.size.x, this.size.y);
    } else {
      Spritesheets.drawExact(ctx, 'ui', 'back-button', pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.PlayButton = class extends Elements.Button {
  constructor(onClick=null) {
    super(new Vec2(-9,-11), new Vec2(48,48), onClick);
    this.anchor = new Vec2(1,1);
    this.pivot = new Vec2(1,1);
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (StateManager.current === 'editor_gameplay') {
      if (this.hover) {
        Spritesheets.drawExact(ctx, 'ui', 'stop-button-hover', pos.x, pos.y, this.size.x, this.size.y);
      } else {
        Spritesheets.drawExact(ctx, 'ui', 'stop-button', pos.x, pos.y, this.size.x, this.size.y);
      }
    } else {
      if (this.hover) {
        Spritesheets.drawExact(ctx, 'ui', 'play-button-hover', pos.x, pos.y, this.size.x, this.size.y);
      } else {
        Spritesheets.drawExact(ctx, 'ui', 'play-button', pos.x, pos.y, this.size.x, this.size.y);
      }
    }
  }
}

EditorElements.HotbarIcon = class extends Elements.Button {
  constructor(index=0) {
    super(new Vec2(), new Vec2(52,52));
    this.index = index;
    this.pos.x = -100-this.index*60;
    this.pos.y = 10;
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
    this.onClick = () => {
      EventBus.emit('editor:switch_hotbar', this.index);
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    // box
    if (Editor.selectedHotbarIndex === this.index) {
      Spritesheets.drawExact(ctx, 'ui', 'hotbar-icon-selected', pos.x, pos.y, this.size.x, this.size.y);
    } else if (this.hover) {
      Spritesheets.drawExact(ctx, 'ui', 'hotbar-icon-hover', pos.x, pos.y, this.size.x, this.size.y);
    } else {
      Spritesheets.drawExact(ctx, 'ui', 'hotbar-icon', pos.x, pos.y, this.size.x, this.size.y);
    }
    // icon
    const tile = Editor.hotbar[this.index];
    if (tile.type === 'tile') {
      const tilesetPos = World.tileInfo[tile.id]?.pos?.times(World.TILE_SIZE) || new Vec2(0,0);
      ctx.drawImage(Game.textures['tiles'], tilesetPos.x, tilesetPos.y, World.TILE_SIZE, World.TILE_SIZE, pos.x+10, pos.y+10, 32, 32);
    } else if (tile.type === 'entity') {
      const icon = Game.entities[tile.id]?.icon;
      if (icon) {
        ctx.drawImage(Game.textures[icon.texture], icon.pos.x, icon.pos.y, icon.size.x, icon.size.y, pos.x+10, pos.y+10, 32, 32);
      }
    }
    // text
    ctx.imageSmoothingEnabled = true;
    if (this.index <= 9) {
      ctx.fillStyle = 'white';
      ctx.font = `${this.size.y*0.5}px Pixellari`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const digit = this.index === 0 ? '0' : 10-this.index;
      Text.parse(`<shadow:2,2,black>${digit}`).draw(ctx, pos.plus(new Vec2(-4,this.size.y+4)))
    }
  }
}

EditorElements.PaletteButton = class extends Elements.Button {
  constructor(onClick=null) {
    super(new Vec2(-9,9), new Vec2(48,48), onClick);
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos().add(new Vec2(-8,-8));
    if (Editor.viewingPalette) {
      if (this.hover) {
        Spritesheets.drawExact(ctx, 'ui', 'palette-button-open-hover', pos.x, pos.y, 64, 64);
      } else {
        Spritesheets.drawExact(ctx, 'ui', 'palette-button-open', pos.x, pos.y, 64, 64);
      }
    } else {
      if (this.hover) {
        Spritesheets.drawExact(ctx, 'ui', 'palette-button-hover', pos.x, pos.y, 64, 64);
      } else {
        Spritesheets.drawExact(ctx, 'ui', 'palette-button', pos.x, pos.y, 64, 64);
      }
    }
  }
}

EditorElements.PaletteBackground = class extends Elements.Element {
  constructor() {
    super(new Vec2(-Editor.SIDEBAR_WIDTH-2,Editor.SIDEBAR_HEIGHT+2), new Vec2(Editor.PALETTE_WIDTH,0));
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
  }
  tick() {
    super.tick();
    this.visible = Editor.viewingPalette;
    if (!this.visible) {
      Editor.palette.forEach((tile, idx) => {
        UI.managers.editor.destroy(`PaletteMenuButton_${idx}`);
      })
      return;
    };
    this.size.y = Game.canvas.height/Game.dpr-Editor.SIDEBAR_HEIGHT+8;
    Editor.palette.forEach((tile, idx) => {
      UI.managers.editor.show(`PaletteMenuButton_${idx}`, () =>
        new EditorElements.PaletteMenuButton(idx)
      );
      UI.managers.editor.get(`PaletteMenuButton_${idx}`).tile = tile;
    })
  }
  draw(ctx) {
    const pos = this.getScreenPos();
    Spritesheets.drawNineSlice(ctx, 'ui', 'palette-background', pos.x, pos.y, this.size.x, this.size.y, 2)
  }
}

EditorElements.PaletteMenuButton = class extends Elements.Button {
  constructor(index=0) {
    super(new Vec2(), new Vec2(52,52));
    this.index = index;
    this.tile = Editor.palette[index];
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
    this.z = 5;
    this.updatePos();
    this.onClick = () => {
      const idx = Editor.hotbar.findIndex(t => t && t.type === this.tile.type && t.id === this.tile.id);
      if (idx !== -1) {
        Editor.moveHotbarIndexToFront(idx);
      } else {
        Editor.hotbar.unshift(this.tile);
        Editor.selectedHotbarIndex = 0;
        Editor.selectedTile = Editor.hotbar[0];
      }
      Editor.viewingPalette = false;
    }
  }
  updatePos() {
    const columns = Math.floor((Editor.PALETTE_WIDTH-4) / 52);
    this.pos.x = -Editor.SIDEBAR_WIDTH - Editor.PALETTE_WIDTH + 4 + (this.index%columns)*52+52;
    this.pos.y = Editor.SIDEBAR_HEIGHT + 8 + Math.floor(this.index/columns)*52;
  }
  tick() {
    super.tick();
    this.updatePos();
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    // box
    if (this.hover) {
      Spritesheets.drawExact(ctx, 'ui', 'hotbar-icon-hover', pos.x, pos.y, this.size.x, this.size.y);
    } else {
      Spritesheets.drawExact(ctx, 'ui', 'hotbar-icon', pos.x, pos.y, this.size.x, this.size.y);
    }
    // icon
    if (this.tile.type === 'tile') {
      const tilesetPos = World.tileInfo[this.tile.id]?.pos?.times(World.TILE_SIZE) || new Vec2(0,0);
      ctx.drawImage(Game.textures['tiles'], tilesetPos.x, tilesetPos.y, World.TILE_SIZE, World.TILE_SIZE, pos.x+10, pos.y+10, 32, 32);
    } else if (this.tile.type === 'entity') {
      const icon = Game.entities[this.tile.id]?.icon;
      if (icon) {
        ctx.drawImage(Game.textures[icon.texture], icon.pos.x, icon.pos.y, icon.size.x, icon.size.y, pos.x+10, pos.y+10, 32, 32);
      }
    }
  }
}
