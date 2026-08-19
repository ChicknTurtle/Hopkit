
export const Spritesheets = {
  _sheets: new Map(),

  async load(basePath, name) {
    const key = name ?? basePath.split('/').pop();

    if (this._sheets.has(key)) {
      return this._sheets.get(key);
    }

    const [image, json] = await Promise.all([
      this._loadImage(`${basePath}.png`),
      this._loadJson(`${basePath}.json`),
    ]);

    const sheet = { image, sprites: json.sprites ?? {} };
    this._sheets.set(key, sheet);
    return sheet;
  },

  async loadAll(entries) {
    return Promise.all(entries.map(e => this.load(e.basePath, e.name)));
  },

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  },

  async _loadJson(src) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to load json: ${src} (${res.status})`);
    return res.json();
  },

  _getSheet(tilesetName) {
    const sheet = this._sheets.get(tilesetName);
    if (!sheet) {
      throw new Error(`Spritesheets: tileset "${tilesetName}" isn't loaded!`);
    }
    return sheet;
  },

  _getSprite(tilesetName, spriteName) {
    const sheet = this._getSheet(tilesetName);
    const sprite = sheet.sprites[spriteName];
    if (!sprite) {
      throw new Error(`Spritesheets: sprite "${spriteName}" doesn't exist in tileset "${tilesetName}".`);
    }
    return { sheet, sprite };
  },

  getBounds(tilesetName, spriteName) {
    return this._getSprite(tilesetName, spriteName).sprite.bounds;
  },

  draw(ctx, tilesetName, spriteName, x, y, scale = 1) {
    const { sheet, sprite } = this._getSprite(tilesetName, spriteName);
    const { x: sx, y: sy, w: sw, h: sh } = sprite.bounds;
    ctx.drawImage(sheet.image, sx, sy, sw, sh, x, y, sw * scale, sh * scale);
  },

  drawExact(ctx, tilesetName, spriteName, x, y, w, h) {
    const { sheet, sprite } = this._getSprite(tilesetName, spriteName);
    const { x: sx, y: sy, w: sw, h: sh } = sprite.bounds;
    ctx.drawImage(sheet.image, sx, sy, sw, sh, x, y, w, h);
  },

  drawNineSlice(ctx, tilesetName, spriteName, x, y, w, h, scale = 1) {
    const { sheet, sprite } = this._getSprite(tilesetName, spriteName);
    const { x: offsetX, y: offsetY, w: spriteW, h: spriteH } = sprite.bounds;

    if (!sprite.center) {
      throw new Error(`Spritesheets: sprite "${spriteName}" in tileset ${tilesetName} isn't valid for nine-slice!`);
    }

    const left = sprite.center.x;
    const top = sprite.center.y;
    const right = spriteW - (sprite.center.x + sprite.center.w);
    const bottom = spriteH - (sprite.center.y + sprite.center.h);

    this._drawNineSlice(
      ctx, sheet.image, spriteW, spriteH,
      [top, right, bottom, left],
      x, y, w, h, offsetX, offsetY, scale
    );
  },

  _drawNineSlice(ctx, img, spritesizeX, spritesizeY, slices, posX, posY, sizeX, sizeY, offsetX, offsetY, scale) {
    const x = posX, y = posY;
    let width = sizeX, height = sizeY;
    const top = slices[0], right = slices[1], bottom = slices[2], left = slices[3];

    width -= (left * scale - left) + (right * scale - right);
    height -= (top * scale - top) + (bottom * scale - bottom);
    if (width < left + right || height < top + bottom) return;

    const middleWidth = spritesizeX - left - right;
    const middleHeight = spritesizeY - top - bottom;
    const destMiddleWidth = width - left - right;
    const destMiddleHeight = height - top - bottom;

    const textureX = offsetX;
    const textureY = offsetY;

    const lS = left * scale, rS = right * scale, tS = top * scale, bS = bottom * scale;

    const dx0 = x;
    const dx1 = x + lS;
    const dx2 = dx1 + destMiddleWidth;
    const dy0 = y;
    const dy1 = y + tS;
    const dy2 = dy1 + destMiddleHeight;

    const sx0 = textureX;
    const sx1 = textureX + left;
    const sx2 = sx1 + middleWidth;
    const sy0 = textureY;
    const sy1 = textureY + top;
    const sy2 = sy1 + middleHeight;

    ctx.drawImage(img, sx0, sy0, left, top, dx0, dy0, lS, tS);
    ctx.drawImage(img, sx1, sy0, middleWidth, top, dx1, dy0, destMiddleWidth, tS);
    ctx.drawImage(img, sx2, sy0, right, top, dx2, dy0, rS, tS);
    ctx.drawImage(img, sx0, sy1, left, middleHeight, dx0, dy1, lS, destMiddleHeight);
    ctx.drawImage(img, sx1, sy1, middleWidth, middleHeight, dx1, dy1, destMiddleWidth, destMiddleHeight);
    ctx.drawImage(img, sx2, sy1, right, middleHeight, dx2, dy1, rS, destMiddleHeight);
    ctx.drawImage(img, sx0, sy2, left, bottom, dx0, dy2, lS, bS);
    ctx.drawImage(img, sx1, sy2, middleWidth, bottom, dx1, dy2, destMiddleWidth, bS);
    ctx.drawImage(img, sx2, sy2, right, bottom, dx2, dy2, rS, bS);
  },
};
