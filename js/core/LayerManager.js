/**
 * LayerManager.js - Katman Yöneticisi
 * Her katman bağımsız bir offscreen canvas'a sahiptir.
 * composite() metodu tüm görünür katmanları display canvas'a birleştirir.
 */

export class LayerManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.layers = [];
        this.activeIndex = 0;
        this._addDefaultLayer();
    }

    _createLayerCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        return canvas;
    }

    _addDefaultLayer() {
        const canvas = this._createLayerCanvas();
        this.layers.push({
            id: Date.now(),
            name: 'Katman 1',
            canvas,
            ctx: canvas.getContext('2d'),
            visible: true,
            opacity: 1.0
        });
        this.activeIndex = 0;
    }

    get activeLayer() { return this.layers[this.activeIndex]; }
    get activeCtx()   { return this.layers[this.activeIndex].ctx; }

    addLayer() {
        const canvas = this._createLayerCanvas();
        const name = `Katman ${this.layers.length + 1}`;
        const newLayer = { id: Date.now(), name, canvas, ctx: canvas.getContext('2d'), visible: true, opacity: 1.0 };
        // Aktif katmanın ÜSTÜNE ekle
        this.layers.splice(this.activeIndex + 1, 0, newLayer);
        this.activeIndex = this.activeIndex + 1;
    }

    deleteLayer(index) {
        if (this.layers.length <= 1) return false;
        this.layers.splice(index, 1);
        this.activeIndex = Math.max(0, Math.min(this.activeIndex, this.layers.length - 1));
        return true;
    }

    setActive(index) {
        if (index >= 0 && index < this.layers.length) this.activeIndex = index;
    }

    moveUp(index) {
        if (index >= this.layers.length - 1) return;
        [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
        if (this.activeIndex === index) this.activeIndex++;
        else if (this.activeIndex === index + 1) this.activeIndex--;
    }

    moveDown(index) {
        if (index <= 0) return;
        [this.layers[index - 1], this.layers[index]] = [this.layers[index], this.layers[index - 1]];
        if (this.activeIndex === index) this.activeIndex--;
        else if (this.activeIndex === index - 1) this.activeIndex++;
    }

    setVisibility(index, visible) { this.layers[index].visible = visible; }
    setOpacity(index, opacity)    { this.layers[index].opacity = opacity; }
    renameLayer(index, name)      { this.layers[index].name = name; }

    /** Tüm görünür katmanları hedef ctx'e bileşik olarak çizer */
    composite(targetCtx) {
        targetCtx.clearRect(0, 0, this.width, this.height);
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            targetCtx.globalAlpha = layer.opacity;
            targetCtx.drawImage(layer.canvas, 0, 0);
        }
        targetCtx.globalAlpha = 1.0;
    }

    /** Aktif katmanın ImageData'sını döndürür (undo için) */
    getActiveImageData() {
        return this.activeCtx.getImageData(0, 0, this.width, this.height);
    }

    /** Aktif katmana ImageData yazar (undo için) */
    putActiveImageData(imageData) {
        this.activeCtx.putImageData(imageData, 0, 0);
    }

    /** Tüm katmanları data URL olarak serialize eder (kayıt için) */
    serialize() {
        return this.layers.map(l => ({
            id: l.id,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            data: l.canvas.toDataURL('image/png')
        }));
    }

    /** Serialize edilmiş datadan katmanları yeniden oluşturur (yükleme için) */
    deserialize(dataArray) {
        return new Promise(resolve => {
            if (!dataArray || dataArray.length === 0) { resolve(); return; }
            let loaded = 0;
            const newLayers = dataArray.map(ld => {
                const canvas = this._createLayerCanvas();
                const ctx = canvas.getContext('2d');
                return { id: ld.id || Date.now(), name: ld.name, canvas, ctx, visible: ld.visible !== false, opacity: ld.opacity ?? 1.0, _data: ld.data };
            });
            newLayers.forEach(layer => {
                if (layer._data && layer._data.length > 10) {
                    const img = new Image();
                    img.onload = () => { layer.ctx.drawImage(img, 0, 0); delete layer._data; loaded++; if (loaded === newLayers.length) { this.layers = newLayers; resolve(); } };
                    img.onerror = () => { delete layer._data; loaded++; if (loaded === newLayers.length) { this.layers = newLayers; resolve(); } };
                    img.src = layer._data;
                } else { delete layer._data; loaded++; if (loaded === newLayers.length) { this.layers = newLayers; resolve(); } }
            });
        });
    }

    /** Tüm katmanları temizler */
    clearAll() {
        this.layers.forEach(l => l.ctx.clearRect(0, 0, this.width, this.height));
    }
}
