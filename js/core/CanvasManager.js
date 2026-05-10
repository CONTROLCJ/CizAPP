import { screenToWorld } from '../utils/math.js';

export class CanvasManager {
    constructor(containerId, mainCanvasId, draftCanvasId) {
        this.container = document.getElementById(containerId);
        this.wrapper = document.getElementById('canvas-wrapper');
        
        // Display canvas — sadece composite görüntü için
        this.mainCanvas = document.getElementById(mainCanvasId);
        this._displayCtx = this.mainCanvas.getContext('2d');
        
        this.draftCanvas = document.getElementById(draftCanvasId);
        this.draftCtx = this.draftCanvas.getContext('2d');

        // Sabit kağıt boyutları
        const paperWidth = 1200;
        const paperHeight = 1600;
        
        this.mainCanvas.width = paperWidth;
        this.mainCanvas.height = paperHeight;
        this.draftCanvas.width = paperWidth;
        this.draftCanvas.height = paperHeight;

        // Viewport
        this.scale = 1;
        this.translate = { x: 0, y: 0 };

        // LayerManager referansı (App.js tarafından setLayerManager ile atanır)
        this._layerManager = null;

        setTimeout(() => {
            const rect = this.container.getBoundingClientRect();
            this.translate.x = (rect.width - paperWidth) / 2;
            this.translate.y = Math.max(20, (rect.height - paperHeight) / 2);
            this.applyTransforms();
        }, 50);
    }

    /** LayerManager bağla — aktif katmanın ctx'ini mainCtx olarak sunar */
    setLayerManager(lm) {
        this._layerManager = lm;
    }

    /** mainCtx getter: layer varsa aktif layer ctx, yoksa display ctx */
    get mainCtx() {
        return this._layerManager ? this._layerManager.activeCtx : this._displayCtx;
    }

    /** Tüm görünür katmanları display canvas'a yaz */
    composite() {
        if (this._layerManager) {
            this._layerManager.composite(this._displayCtx);
        }
    }

    applyTransforms() {
        const transform = `translate(${this.translate.x}px, ${this.translate.y}px) scale(${this.scale})`;
        this.wrapper.style.transform = transform;
    }

    clearDraftCanvas() {
        this.draftCtx.clearRect(0, 0, this.draftCanvas.width, this.draftCanvas.height);
    }

    clearMainCanvas() {
        // Aktif katmanı temizle, sonra composite'i güncelle
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.composite();
    }

    getPointerPos(evt) {
        return screenToWorld(evt.clientX, evt.clientY, this.container, this.scale, this.translate);
    }

    /** Undo/Redo için aktif katmanın ImageData'sını döndürür */
    getMainImageData() {
        return this._layerManager
            ? this._layerManager.getActiveImageData()
            : this._displayCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    }

    /** Undo/Redo için aktif katmana ImageData yazar, sonra composite eder */
    putMainImageData(imageData) {
        if (this._layerManager) {
            this._layerManager.putActiveImageData(imageData);
            this.composite();
        } else {
            this._displayCtx.putImageData(imageData, 0, 0);
        }
    }
}
