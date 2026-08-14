
import { Vec2 } from "../utils/lib.js"
import { Game } from "./../game.js"
import { Controls } from "./../controls.js"
import { EventBus } from "./../core/eventBus.js"
import { StateManager } from "./../core/stateManager.js"
import { Elements } from "./elements.js"
import { Editor } from "../states/editor.js"
import { World } from "./../world/world.js"
import { WorldIO } from "./../world/io.js"
import { Text } from "./../text.js"
import { UI } from "./ui.js"
import { drawNineSlice } from "../utils/rendering.js"
import { CustomPopup } from "./../custom_popup.js"

export const EditorElements = {}

EditorElements.EraseButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-11,190), new Vec2(52,52));
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
    this.onClick = () => {
      Editor.erasing = !Editor.erasing;
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    // button
    if (Editor.erasing) {
      ctx.drawImage(Game.textures['editor'], 52, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else if (this.hover) {
      ctx.drawImage(Game.textures['editor'], 26, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 0, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    }
    // icon
    ctx.drawImage(Game.textures['editor'], 0, 52, 15, 15, pos.x+11, pos.y+11, 30, 30);
  }
}

EditorElements.SaveButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-11,250), new Vec2(52,52));
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
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
    // button
    if (this.hover && Controls.held['leftMouse']) {
      ctx.drawImage(Game.textures['editor'], 52, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else if (this.hover) {
      ctx.drawImage(Game.textures['editor'], 26, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 0, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    }
    // icon
    ctx.drawImage(Game.textures['editor'], 15, 52, 15, 15, pos.x+11, pos.y+11, 30, 30);
  }
}

EditorElements.LoadButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-11,310), new Vec2(52,52));
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
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
    // button
    if (this.hover && Controls.held['leftMouse']) {
      ctx.drawImage(Game.textures['editor'], 52, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else if (this.hover) {
      ctx.drawImage(Game.textures['editor'], 26, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 0, 26, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    }
    // icon
    ctx.drawImage(Game.textures['editor'], 30, 52, 15, 15, pos.x+11, pos.y+11, 30, 30);
  }
}

EditorElements.UndoButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-11,-143), new Vec2(52,52));
    this.anchor = new Vec2(1,1);
    this.pivot = new Vec2(1,1);
    this.onClick = () => {
      Editor.EditHistory.undo();
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    // button
    if (this.hover) {
      ctx.drawImage(Game.textures['editor'], 79, 100, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 79, 75, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.RedoButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-11,-83), new Vec2(52,52));
    this.anchor = new Vec2(1,1);
    this.pivot = new Vec2(1,1);
    this.onClick = () => {
      Editor.EditHistory.redo();
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    // button
    if (this.hover) {
      ctx.drawImage(Game.textures['editor'], 104, 100, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 104, 75, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
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
      ctx.drawImage(Game.textures['editor'], 79, 25, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 79, 0, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.PlayButton = class extends Elements.Button {
  constructor(onClick=null) {
    super(new Vec2(-11,-11), new Vec2(52,52), onClick);
    this.anchor = new Vec2(1,1);
    this.pivot = new Vec2(1,1);
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (StateManager.current === 'editor_gameplay') {
      if (this.hover) {
        ctx.drawImage(Game.textures['editor'], 129, 25, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
      } else {
        ctx.drawImage(Game.textures['editor'], 129, 0, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
      }
    } else {
      if (this.hover) {
        ctx.drawImage(Game.textures['editor'], 104, 25, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
      } else {
        ctx.drawImage(Game.textures['editor'], 104, 0, 24, 24, pos.x, pos.y, this.size.x, this.size.y);
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
      ctx.drawImage(Game.textures['editor'], 52, 0, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else if (this.hover) {
      ctx.drawImage(Game.textures['editor'], 26, 0, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 0, 0, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
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
      const digit = this.index === 9 ? '0' : this.index+1;
      Text.parse(`<shadow:2,2,black>${digit}`).draw(ctx, pos.plus(new Vec2(-4,this.size.y+4)))
    }
  }
}

EditorElements.PaletteButton = class extends Elements.Button {
  constructor(onClick=null) {
    super(new Vec2(-12,10), new Vec2(54,54), onClick);
    this.anchor = new Vec2(1,0);
    this.pivot = new Vec2(1,0);
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (Editor.viewingPalette) {
      if (this.hover) {
        ctx.drawImage(Game.textures['editor'], 182, 28, 27, 27, pos.x, pos.y, this.size.x, this.size.y);
      } else {
        ctx.drawImage(Game.textures['editor'], 182, 0, 27, 27, pos.x, pos.y, this.size.x, this.size.y);
      }
    } else {
      if (this.hover) {
        ctx.drawImage(Game.textures['editor'], 154, 28, 27, 27, pos.x, pos.y, this.size.x, this.size.y);
      } else {
        ctx.drawImage(Game.textures['editor'], 154, 0, 27, 27, pos.x, pos.y, this.size.x, this.size.y);
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
    drawNineSlice(ctx, Game.textures['editor'], 24, 24, [4,4,4,4], pos.x, pos.y, this.size.x, this.size.y, 157, 56, 2);
  }
}

EditorElements.Popup = class extends Elements.Element {
  constructor() {
    super(new Vec2(0,0), new Vec2(400,300));
    this.anchor = new Vec2(0.5,0.5);
    this.pivot = new Vec2(0.5,0.5);
    this.z = 100;
  }
  tick() {
    super.tick();
    if (!Editor.hasPopup) {
      UI.managers.editor.destroy('PopupBackground');
      UI.managers.editor.destroy('PopupCloseButton');
      UI.managers.editor.destroy(this);
      return;
    }
    UI.managers.editor.show('PopupBackground', () =>
      new Elements.Background()
    );
    UI.managers.editor.get('PopupBackground').z = 99;
    UI.managers.editor.show('PopupCloseButton', () =>
      new EditorElements.PopupCloseButton()
    );
    if (Controls.clicked('exitMenu')) {
      Editor.hasPopup = false;
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    drawNineSlice(ctx, Game.textures['editor'], 24, 24, [4,4,4,4], pos.x, pos.y, this.size.x, this.size.y, 185, 56, 2);
  }
}

EditorElements.PopupCloseButton = class extends Elements.Button {
  constructor() {
    super(new Vec2(-400/2+6, -300/2+6), new Vec2(26,26));
    this.anchor = new Vec2(0.5,0.5);
    this.pivot = new Vec2(0,0);
    this.z = 101;
    this.onClick = () => {
      Editor.hasPopup = false;
    }
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (this.hover) {
      ctx.drawImage(Game.textures['editor'], 210, 70, 13, 13, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 210, 56, 13, 13, pos.x, pos.y, this.size.x, this.size.y);
    }
  }
}

EditorElements.PopupButton = class extends Elements.Button {
  constructor(pos=new Vec2(), text='Button', onClick=null) {
    super(pos, new Vec2(200,50));
    this.anchor = new Vec2(0.5,0.5);
    this.pivot = new Vec2(0.5,0.5);
    this.z = 101;
    this.text = text;
    this.onClick = onClick;
  }
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const pos = this.getScreenPos();
    if (this.hover) {
      drawNineSlice(ctx, Game.textures['editor'], 24, 24, [4,4,4,4], pos.x, pos.y, this.size.x, this.size.y, 104, 50, 2);
    } else {
      drawNineSlice(ctx, Game.textures['editor'], 24, 24, [4,4,4,4], pos.x, pos.y, this.size.x, this.size.y, 79, 50, 2);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '24px Pixellari';
    const text = new Text.Component(this.text);
    text.effects.shadowColor = 'black';
    text.effects.shadowOffset = new Vec2(2,2);
    Text.draw(ctx, text, pos.plus(this.size.times(0.5)));
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
      ctx.drawImage(Game.textures['editor'], 26, 0, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
    } else {
      ctx.drawImage(Game.textures['editor'], 0, 0, 26, 26, pos.x, pos.y, this.size.x, this.size.y);
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
