import { CanvasManager } from './core/CanvasManager.js';
import { ToolManager } from './core/ToolManager.js';
import { HistoryManager } from './core/HistoryManager.js';
import { DrawCommand, ClearCommand } from './core/Commands.js';
import { applyFloodFill } from './tools/FloodFill.js';
import { PageManager } from './core/PageManager.js';
import { LayerManager } from './core/LayerManager.js';

class App {
    constructor() {
        this.canvasManager = new CanvasManager('canvas-container', 'main-canvas', 'draft-canvas');
        this.toolManager = new ToolManager();
        this.pageManager = new PageManager();
        this.historyManager = this.pageManager.getActivePage().history;

        // Layer sistemi
        const pw = this.canvasManager.mainCanvas.width;
        const ph = this.canvasManager.mainCanvas.height;
        this.layerManager = new LayerManager(pw, ph);
        this.canvasManager.setLayerManager(this.layerManager);

        this.isDrawing = false;
        this.isPanning = false;
        this.spacePressed = false;
        this.middleMousePressed = false;
        this.startPos = { x: 0, y: 0 };
        this.lastPos = { x: 0, y: 0 };
        this.beforeDrawState = null;
        
        this.floatingSelection = null; 
        this.selectionOffset = { x: 0, y: 0 };
        this.selectionState = 'none';
        this.lassoPoints = [];

        this.resizeHandles = ['tl', 'tr', 'bl', 'br'].map(pos => {
            const el = document.createElement('div');
            el.className = `resize-handle ${pos}`;
            el.dataset.pos = pos;
            this.canvasManager.container.appendChild(el);
            return el;
        });

        this.clipboardCanvas = null;
        this.favorites = JSON.parse(localStorage.getItem('canvasFavorites')) || [null, null, null, null, null];

        this.toolManager.onToolChange = (settings) => this.syncUIWithToolSettings(settings);

        this.initUI();
        this.initEvents();
        this.loadCurrentPage();
        this.renderLayersPanel();
    }

    // ---------------------- UI ve SENKRONİZASYON ----------------------
    syncUIWithToolSettings(settings) {
        if (!settings) return;
        document.getElementById('color-picker').value = settings.color;
        document.getElementById('opacity-slider').value = Math.round(settings.opacity * 100);
        document.getElementById('opacity-label').textContent = Math.round(settings.opacity * 100);
        document.getElementById('brush-size').value = settings.size;
        document.getElementById('size-label').textContent = settings.size;
    }

    renderFavorites() {
        document.querySelectorAll('.fav-btn').forEach((btn, index) => {
            const fav = this.favorites[index];
            if (fav) {
                btn.classList.add('saved');
                btn.style.backgroundColor = fav.color;
                const toolEmojis = { brush:'🖌️', line:'📏', rect:'⬛', circle:'⭕', eraser:'🧽', fill:'🪣', text:'🔤', eyedropper:'💉', select:'🔲' };
                btn.textContent = toolEmojis[fav.tool] || '';
            } else {
                btn.classList.remove('saved');
                btn.style.backgroundColor = 'transparent';
                btn.textContent = '';
            }
        });
    }

    saveFavorite(index) {
        this.favorites[index] = { tool: this.toolManager.getTool(), color: this.toolManager.getColor(), size: this.toolManager.getSize(), opacity: this.toolManager.getOpacity(), brushType: this.toolManager.brushType };
        localStorage.setItem('canvasFavorites', JSON.stringify(this.favorites));
        this.renderFavorites();
    }

    loadFavorite(index) {
        const fav = this.favorites[index];
        if (!fav) return;
        this.toolManager.brushType = fav.brushType;
        if(document.getElementById('brush-type')) document.getElementById('brush-type').value = fav.brushType || 'normal';
        this.toolManager.settings[fav.tool] = { color: fav.color, size: fav.size, opacity: fav.opacity };
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.tool-btn[data-tool="${fav.tool}"]`);
        if(btn) btn.classList.add('active');
        this.toolManager.setTool(fav.tool);
    }

    deleteFavorite(index) {
        this.favorites[index] = null;
        localStorage.setItem('canvasFavorites', JSON.stringify(this.favorites));
        this.renderFavorites();
    }

    initUI() {
        this.renderFavorites();
        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', () => { const idx = parseInt(btn.dataset.index); if (this.favorites[idx]) this.loadFavorite(idx); else this.saveFavorite(idx); });
            btn.addEventListener('contextmenu', (e) => { e.preventDefault(); this.deleteFavorite(parseInt(btn.dataset.index)); });
        });

        document.querySelectorAll('.q-color').forEach(qc => {
            qc.addEventListener('click', () => {
                const hex = qc.dataset.color;
                this.toolManager.setColor(hex);
                document.getElementById('color-picker').value = hex;
            });
        });

        document.getElementById('btn-paper-settings').addEventListener('click', () => {
            const p = document.getElementById('paper-settings-popup');
            p.style.display = p.style.display === 'none' ? 'block' : 'none';
            document.getElementById('pages-panel').style.display = 'none';
            document.getElementById('layers-panel').style.display = 'none';
        });
        document.getElementById('btn-pages-panel').addEventListener('click', () => {
            const p = document.getElementById('pages-panel');
            p.style.display = p.style.display === 'none' ? 'block' : 'none';
            document.getElementById('paper-settings-popup').style.display = 'none';
            document.getElementById('layers-panel').style.display = 'none';
            this.renderPagesList();
        });
        document.getElementById('btn-layers-panel').addEventListener('click', () => {
            const p = document.getElementById('layers-panel');
            p.style.display = p.style.display === 'none' ? 'flex' : 'none';
            document.getElementById('paper-settings-popup').style.display = 'none';
            document.getElementById('pages-panel').style.display = 'none';
            if (p.style.display !== 'none') this.renderLayersPanel();
        });

        document.querySelectorAll('.p-color').forEach(pc => {
            pc.addEventListener('click', () => {
                this.pageManager.getActivePage().paperColor = pc.dataset.color;
                this.applyPaperSettings();
                this.pageManager.saveToLocalStorage();
            });
        });
        document.getElementById('paper-pattern-select').addEventListener('change', (e) => {
            this.pageManager.getActivePage().paperType = e.target.value;
            this.applyPaperSettings();
            this.pageManager.saveToLocalStorage();
        });

        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.floatingSelection) this.commitSelection();
                this.toolManager.setTool(btn.dataset.tool);
            });
        });
        
        ['brush-type', 'select-type'].forEach(id => {
            document.getElementById(id).addEventListener('change', e => {
                const map = {'brush-type':'brushType', 'select-type':'selectType'};
                this.toolManager[map[id]] = e.target.value;
            });
        });

        document.getElementById('color-picker').addEventListener('input', e => this.toolManager.setColor(e.target.value));
        document.getElementById('opacity-slider').addEventListener('input', e => { this.toolManager.setOpacity(parseInt(e.target.value)/100); document.getElementById('opacity-label').textContent = e.target.value; });
        document.getElementById('brush-size').addEventListener('input', e => { this.toolManager.setSize(parseInt(e.target.value)); document.getElementById('size-label').textContent = e.target.value; });
        document.getElementById('symmetry-toggle').addEventListener('change', e => this.toolManager.symmetryEnabled = e.target.checked);
        
        document.getElementById('btn-undo').addEventListener('click', () => { if (this.floatingSelection) this.commitSelection(); this.historyManager.undo(); });
        document.getElementById('btn-redo').addEventListener('click', () => { if (this.floatingSelection) this.commitSelection(); this.historyManager.redo(); });
        document.getElementById('btn-clear').addEventListener('click', () => {
            const beforeState = this.canvasManager.getMainImageData();
            const cmd = new ClearCommand(this.canvasManager, beforeState);
            this.historyManager.executeCommand(cmd);
            this.pageManager.saveToLocalStorage(this.canvasManager);
        });
        
        document.getElementById('btn-download').addEventListener('click', () => this.exportAsPNG());
        document.getElementById('btn-export-pdf').addEventListener('click', () => this.exportAsPDF());
        
        document.getElementById('btn-reset').addEventListener('click', () => {
            if (confirm("Defterdeki tüm sayfalarınız, çizimleriniz ve favorileriniz KALICI olarak silinecektir.\n\nEmin misiniz?")) {
                localStorage.clear();
                window.location.reload();
            }
        });

        document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', e => this.handleImageImport(e));
        document.getElementById('btn-filter-bw').addEventListener('click', () => this.applyFilter('grayscale'));
        document.getElementById('btn-filter-invert').addEventListener('click', () => this.applyFilter('invert'));

        this.textInput = document.getElementById('text-input-overlay');
        this.textInput.addEventListener('blur', () => this.finalizeText());
        this.textInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.finalizeText(); });
        
        const ctxMenu = document.getElementById('context-menu');
        ['ctx-paste', 'ctx-cut', 'ctx-copy', 'ctx-delete', 'ctx-cancel'].forEach(id => {
            document.getElementById(id).addEventListener('click', () => {
                if(id==='ctx-paste') this.pasteSelection();
                else if(id==='ctx-cut') this.cutSelection();
                else if(id==='ctx-copy') this.copySelection();
                else if(id==='ctx-delete') this.deleteSelection();
                else if(id==='ctx-cancel') this.commitSelection();
                ctxMenu.style.display = 'none';
            });
        });

        document.getElementById('btn-new-page').addEventListener('click', () => {
            this.pageManager.saveToLocalStorage(this.canvasManager);
            this.pageManager.addPage();
            this.pageManager.activePageIndex = this.pageManager.pages.length - 1;
            this.loadCurrentPage();
            this.renderPagesList();
        });
        
        ['pctx-copy', 'pctx-cut', 'pctx-delete', 'pctx-paste', 'pctx-cancel'].forEach(id => {
            document.getElementById(id).addEventListener('click', () => {
                if(id==='pctx-copy') this.pageManager.copyPage(this.contextPageIndex);
                else if(id==='pctx-cut') { this.pageManager.copyPage(this.contextPageIndex); this.pageManager.deletePage(this.contextPageIndex); this.loadCurrentPage(); this.renderPagesList(); }
                else if(id==='pctx-delete') { this.pageManager.deletePage(this.contextPageIndex); this.loadCurrentPage(); this.renderPagesList(); }
                else if(id==='pctx-paste') { this.pageManager.pastePage(); this.renderPagesList(); }
                document.getElementById('page-context-menu').style.display='none';
            });
        });

        this.toolManager.setTool(this.toolManager.getTool());
    }

    // ---------------------- EXPORT (PNG & PDF) ----------------------
    exportAsPNG() {
        const cWidth = this.canvasManager.mainCanvas.width;
        const cHeight = this.canvasManager.mainCanvas.height;
        const page = this.pageManager.getActivePage();
        
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = cWidth; tmpCanvas.height = cHeight;
        const ctx = tmpCanvas.getContext('2d');
        
        ctx.fillStyle = page.paperColor;
        ctx.fillRect(0, 0, cWidth, cHeight);
        
        if (page.paperType === 'grid') {
            ctx.strokeStyle = 'rgba(100,100,100,0.3)';
            ctx.lineWidth = 1;
            for(let x=0; x<cWidth; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,cHeight); ctx.stroke(); }
            for(let y=0; y<cHeight; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cWidth,y); ctx.stroke(); }
        } else if (page.paperType === 'lined') {
            ctx.strokeStyle = 'rgba(100,100,100,0.4)';
            ctx.lineWidth = 1;
            for(let y=40; y<cHeight; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cWidth,y); ctx.stroke(); }
        }
        
        ctx.drawImage(this.canvasManager.mainCanvas, 0, 0);
        
        const link = document.createElement('a');
        link.download = `defter-sayfa-${this.pageManager.activePageIndex + 1}.png`;
        link.href = tmpCanvas.toDataURL('image/png');
        link.click();
    }

    exportAsPDF() {
        this.pageManager.saveToLocalStorage(this.canvasManager);
        
        const printArea = document.createElement('div');
        printArea.id = 'print-area';
        document.body.appendChild(printArea);
        
        this.pageManager.pages.forEach((p, idx) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'print-page';
            
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = this.canvasManager.mainCanvas.width;
            tmpCanvas.height = this.canvasManager.mainCanvas.height;
            const ctx = tmpCanvas.getContext('2d');
            
            ctx.fillStyle = p.paperColor;
            ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
            
            if (p.paperType === 'grid') {
                ctx.strokeStyle = 'rgba(100,100,100,0.3)'; ctx.lineWidth = 1;
                for(let x=0; x<tmpCanvas.width; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,tmpCanvas.height); ctx.stroke(); }
                for(let y=0; y<tmpCanvas.height; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(tmpCanvas.width,y); ctx.stroke(); }
            } else if (p.paperType === 'lined') {
                ctx.strokeStyle = 'rgba(100,100,100,0.4)'; ctx.lineWidth = 1;
                for(let y=40; y<tmpCanvas.height; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(tmpCanvas.width,y); ctx.stroke(); }
            }
            
            if (p.dataURL) {
                const img = new Image();
                img.src = p.dataURL;
                ctx.drawImage(img, 0, 0);
            }
            
            const finalImg = document.createElement('img');
            finalImg.src = tmpCanvas.toDataURL();
            finalImg.style.width = '100%';
            pageDiv.appendChild(finalImg);
            printArea.appendChild(pageDiv);
        });
        
        window.print();
        setTimeout(() => document.body.removeChild(printArea), 1000);
    }

    // ---------------------- SAYFA YÖNETİMİ ----------------------
    loadCurrentPage() {
        const page = this.pageManager.getActivePage();
        this.historyManager = page.history;
        
        document.getElementById('paper-pattern-select').value = page.paperType;
        this.applyPaperSettings();

        this.canvasManager.clearMainCanvas();
        if (page.dataURL) {
            const img = new Image();
            img.onload = () => { this.canvasManager.mainCtx.drawImage(img, 0, 0); };
            img.src = page.dataURL;
        }
    }

    applyPaperSettings() {
        const page = this.pageManager.getActivePage();
        const bgLayer = document.getElementById('background-layer');
        bgLayer.style.backgroundColor = page.paperColor;
        bgLayer.className = 'background-layer ' + page.paperType;
    }

    renderPagesList() {
        const list = document.getElementById('pages-list');
        list.innerHTML = '';
        this.pageManager.pages.forEach((page, index) => {
            const item = document.createElement('div');
            item.className = 'page-item' + (index === this.pageManager.activePageIndex ? ' active' : '');
            
            const thumb = document.createElement('img');
            thumb.className = 'page-thumb';
            thumb.src = page.dataURL || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            
            const info = document.createElement('div');
            info.className = 'page-info';
            info.textContent = `Sayfa ${index + 1}`;
            
            const dots = document.createElement('div');
            dots.className = 'page-options';
            dots.textContent = '•••';
            dots.addEventListener('click', (e) => {
                e.stopPropagation(); // Bubbling engelle
                this.contextPageIndex = index;
                const menu = document.getElementById('page-context-menu');
                const rect = this.canvasManager.container.getBoundingClientRect();
                menu.style.display = 'block';
                menu.style.left = (e.clientX - rect.left) + 'px';
                menu.style.top = (e.clientY - rect.top) + 'px';
                document.getElementById('pctx-paste').style.display = this.pageManager.copiedPage ? 'flex' : 'none';
            });
            
            item.appendChild(thumb); item.appendChild(info); item.appendChild(dots);
            
            item.addEventListener('click', () => {
                this.pageManager.saveToLocalStorage(this.canvasManager);
                this.pageManager.activePageIndex = index;
                this.loadCurrentPage();
                this.renderPagesList();
            });
            list.appendChild(item);
        });
    }

    // ---------------------- EVENTS & PAN / ZOOM ----------------------
    initEvents() {
        const container = this.canvasManager.container;

        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const ctxMenu = document.getElementById('context-menu');
            const pasteBtn = document.getElementById('ctx-paste');
            const editBtns = [document.getElementById('ctx-cut'), document.getElementById('ctx-copy'), document.getElementById('ctx-delete'), document.getElementById('ctx-cancel')];
            
            const rect = this.canvasManager.container.getBoundingClientRect();
            
            if (this.floatingSelection) {
                pasteBtn.style.display = 'none'; editBtns.forEach(b => b.style.display = 'flex');
                ctxMenu.style.display = 'block'; ctxMenu.style.left = (e.clientX - rect.left) + 'px'; ctxMenu.style.top = (e.clientY - rect.top) + 'px';
            } else if (this.clipboardCanvas) {
                pasteBtn.style.display = 'flex'; editBtns.forEach(b => b.style.display = 'none');
                this.lastContextPos = this.canvasManager.getPointerPos(e);
                ctxMenu.style.display = 'block'; ctxMenu.style.left = (e.clientX - rect.left) + 'px'; ctxMenu.style.top = (e.clientY - rect.top) + 'px';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.spacePressed) { this.spacePressed = true; container.classList.add('panning'); }
            // Kısayollar
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.historyManager.undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.historyManager.redo(); }
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); this.copySelection(); }
            if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) { e.preventDefault(); this.cutSelection(); }
            if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); this.pasteSelectionCentered(); }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') { this.spacePressed = false; this.isPanning = false; container.classList.remove('panning'); }
        });

        // Sürükle Bırak (Drag & Drop) Resim Yükleme
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.style.boxShadow = 'inset 0 0 10px #007acc';
        });
        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            container.style.boxShadow = 'none';
        });
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.style.boxShadow = 'none';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    this.handleImageImport({ target: { files: [file] } });
                }
            }
        });

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSensitivity = 0.1;
            const delta = e.deltaY < 0 ? 1 : -1;
            let newScale = this.canvasManager.scale * (1 + delta * zoomSensitivity);
            newScale = Math.max(0.1, Math.min(newScale, 5));

            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.canvasManager.translate.x) / this.canvasManager.scale;
            const worldY = (mouseY - this.canvasManager.translate.y) / this.canvasManager.scale;

            this.canvasManager.scale = newScale;
            this.canvasManager.translate.x = mouseX - worldX * newScale;
            this.canvasManager.translate.y = mouseY - worldY * newScale;
            this.canvasManager.applyTransforms();
            this.updateResizeHandlePos();
        }, { passive: false });

        container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        container.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
        
        window.addEventListener('pointerdown', (e) => {
            if (e.button === 0 && !e.target.closest('.context-menu')) {
                document.getElementById('context-menu').style.display = 'none';
                document.getElementById('page-context-menu').style.display = 'none';
            }
            if (e.button === 0 && !e.target.closest('.floating-panel') && !e.target.closest('.document-tools')) {
                document.getElementById('paper-settings-popup').style.display = 'none';
                document.getElementById('pages-panel').style.display = 'none';
                document.getElementById('layers-panel').style.display = 'none';
            }
        });
    }

    onPointerDown(e) {
        if (e.button === 1) { 
            this.middleMousePressed = true; this.isPanning = true; this.lastPos = { x: e.clientX, y: e.clientY };
            this.canvasManager.container.classList.add('panning'); return;
        }

        if (e.button !== 0 && e.pointerType === 'mouse') return;

        const pos = this.canvasManager.getPointerPos(e);

        if (this.spacePressed) { this.isPanning = true; this.lastPos = { x: e.clientX, y: e.clientY }; return; }

        const tool = this.toolManager.getTool();

        // Taşan tıkı engelle
        if (pos.x < 0 || pos.y < 0 || pos.x > this.canvasManager.mainCanvas.width || pos.y > this.canvasManager.mainCanvas.height) return;

        if (tool === 'eyedropper') {
            const pixel = this.canvasManager.mainCtx.getImageData(pos.x, pos.y, 1, 1).data;
            if (pixel[3] > 0) {
                const hex = "#" + (1 << 24 | pixel[0] << 16 | pixel[1] << 8 | pixel[2]).toString(16).slice(1);
                this.toolManager.setColor(hex); document.getElementById('color-picker').value = hex;
            }
            return;
        }

        // Universal Floating Selection Interaction
        if (this.floatingSelection) {
            const handle = e.target.closest('.resize-handle');
            if (handle) {
                this.selectionState = 'resizing'; this.resizeCorner = handle.dataset.pos; this.startPos = pos;
                this.origSelectionWidth = this.floatingSelection.width; this.origSelectionHeight = this.floatingSelection.height;
                this.origSelectionX = this.floatingSelection.x; this.origSelectionY = this.floatingSelection.y;
                return;
            }
            if (pos.x >= this.floatingSelection.x && pos.x <= this.floatingSelection.x + this.floatingSelection.width && pos.y >= this.floatingSelection.y && pos.y <= this.floatingSelection.y + this.floatingSelection.height) {
                this.selectionState = 'dragging'; this.selectionOffset = { x: pos.x - this.floatingSelection.x, y: pos.y - this.floatingSelection.y };
                this.canvasManager.container.classList.add('dragging'); return;
            } else {
                this.commitSelection();
            }
        }

        if (tool === 'select') {
            this.selectionState = 'selecting'; this.startPos = pos; this.lassoPoints = [pos];
            return;
        }

        this.isDrawing = true; this.startPos = pos; this.lastPos = pos;
        this.beforeDrawState = this.canvasManager.getMainImageData();

        if (tool === 'fill') {
            const rgba = this.toolManager.getColorRgb(); rgba.push(this.toolManager.getOpacity() * 255); 
            applyFloodFill(this.canvasManager.mainCtx, this.canvasManager.mainCanvas.width, this.canvasManager.mainCanvas.height, pos.x, pos.y, rgba, false);
            this.finalizeDrawing(); return;
        }

        if (tool === 'text') {
            if (this.textInput.style.display === 'block') this.finalizeText();
            else this.showTextInput(e.clientX, e.clientY, pos); return;
        }

        if (tool === 'brush' || tool === 'eraser') this.drawShape(this.canvasManager.mainCtx, pos, pos);
    }

    onPointerMove(e) {
        if (this.isPanning && (this.spacePressed || this.middleMousePressed)) {
            const dx = e.clientX - this.lastPos.x; const dy = e.clientY - this.lastPos.y;
            this.canvasManager.translate.x += dx; this.canvasManager.translate.y += dy;
            this.canvasManager.applyTransforms(); this.updateResizeHandlePos();
            this.lastPos = { x: e.clientX, y: e.clientY }; return;
        }

        const pos = this.canvasManager.getPointerPos(e);
        const tool = this.toolManager.getTool();

        if (this.floatingSelection) {
            if (pos.x >= this.floatingSelection.x && pos.x <= this.floatingSelection.x + this.floatingSelection.width && pos.y >= this.floatingSelection.y && pos.y <= this.floatingSelection.y + this.floatingSelection.height) {
                this.canvasManager.container.style.cursor = 'move';
            } else {
                this.canvasManager.container.style.cursor = 'crosshair';
            }
        } else {
            this.canvasManager.container.style.cursor = 'crosshair';
        }

        if (this.selectionState === 'resizing') {
            const dx = pos.x - this.startPos.x; const dy = pos.y - this.startPos.y;
            if (this.resizeCorner === 'br') {
                this.floatingSelection.width = Math.max(10, this.origSelectionWidth + dx);
                this.floatingSelection.height = Math.max(10, this.origSelectionHeight + dy);
            } else if (this.resizeCorner === 'tl') {
                const newWidth = Math.max(10, this.origSelectionWidth - dx);
                const newHeight = Math.max(10, this.origSelectionHeight - dy);
                this.floatingSelection.x = this.origSelectionX + (this.origSelectionWidth - newWidth);
                this.floatingSelection.y = this.origSelectionY + (this.origSelectionHeight - newHeight);
                this.floatingSelection.width = newWidth;
                this.floatingSelection.height = newHeight;
            } else if (this.resizeCorner === 'tr') {
                const newHeight = Math.max(10, this.origSelectionHeight - dy);
                this.floatingSelection.y = this.origSelectionY + (this.origSelectionHeight - newHeight);
                this.floatingSelection.width = Math.max(10, this.origSelectionWidth + dx);
                this.floatingSelection.height = newHeight;
            } else if (this.resizeCorner === 'bl') {
                const newWidth = Math.max(10, this.origSelectionWidth - dx);
                this.floatingSelection.x = this.origSelectionX + (this.origSelectionWidth - newWidth);
                this.floatingSelection.width = newWidth;
                this.floatingSelection.height = Math.max(10, this.origSelectionHeight + dy);
            }
            this.drawFloatingSelection(); return;
        }

        if (this.selectionState === 'dragging') {
            this.floatingSelection.x = pos.x - this.selectionOffset.x; this.floatingSelection.y = pos.y - this.selectionOffset.y; this.drawFloatingSelection();
            return;
        }

        if (tool === 'select') {
            if (this.selectionState === 'selecting') {
                this.canvasManager.clearDraftCanvas();
                const ctx = this.canvasManager.draftCtx; ctx.setLineDash([5, 5]); ctx.strokeStyle = '#007acc'; ctx.lineWidth = 1;
                if (this.toolManager.selectType === 'rect') ctx.strokeRect(this.startPos.x, this.startPos.y, pos.x - this.startPos.x, pos.y - this.startPos.y);
                else if (this.toolManager.selectType === 'lasso') {
                    this.lassoPoints.push(pos); ctx.beginPath(); ctx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
                    for (let i = 1; i < this.lassoPoints.length; i++) ctx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y); ctx.stroke();
                }
                ctx.setLineDash([]);
            }
            return;
        }

        if (!this.isDrawing) return;

        if (tool === 'brush' || tool === 'eraser') {
            this.drawShape(this.canvasManager.mainCtx, this.lastPos, pos);
            this.canvasManager.composite(); // Canlı görüntü için katmanları birleştir
            this.lastPos = pos;
        } else if (tool === 'line' || tool === 'rect' || tool === 'circle') {
            this.canvasManager.clearDraftCanvas(); this.drawShape(this.canvasManager.draftCtx, this.startPos, pos);
        }
    }

    onPointerUp(e) {
        if (this.middleMousePressed) { this.middleMousePressed = false; this.isPanning = false; this.canvasManager.container.classList.remove('panning'); return; }
        if (this.isPanning) { this.isPanning = false; return; }

        const pos = this.canvasManager.getPointerPos(e);
        const tool = this.toolManager.getTool();

        if (this.selectionState === 'resizing') { this.selectionState = 'none'; return; }

        if (tool === 'select') {
            if (this.selectionState === 'selecting') this.finalizeSelectionProcess(pos);
            else if (this.selectionState === 'dragging') { this.selectionState = 'none'; this.canvasManager.container.classList.remove('dragging'); }
            return;
        }

        if (this.selectionState === 'dragging') { this.selectionState = 'none'; this.canvasManager.container.classList.remove('dragging'); return; }

        if (!this.isDrawing) return;

        if (tool === 'rect' || tool === 'circle') {
            this.canvasManager.clearDraftCanvas(); 
            const padding = this.toolManager.getSize() + 10;
            let rx = Math.min(this.startPos.x, pos.x) - padding;
            let ry = Math.min(this.startPos.y, pos.y) - padding;
            let rw = Math.abs(pos.x - this.startPos.x) + padding * 2;
            let rh = Math.abs(pos.y - this.startPos.y) + padding * 2;

            if (rw < padding*2 + 5 || rh < padding*2 + 5) { this.finalizeDrawing(); return; } // Çok küçük çizimse direkt bitir

            const tempCanvas = document.createElement('canvas'); tempCanvas.width = rw; tempCanvas.height = rh;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.translate(-rx, -ry);
            this.drawShape(tCtx, this.startPos, pos);
            
            this.beforeDrawState = this.canvasManager.getMainImageData();
            this.floatingSelection = { canvas: tempCanvas, x: rx, y: ry, width: rw, height: rh };
            this.drawFloatingSelection();
            this.isDrawing = false;
        } else if (tool === 'line') {
            this.canvasManager.clearDraftCanvas(); this.drawShape(this.canvasManager.mainCtx, this.startPos, pos);
            this.finalizeDrawing();
        } else {
            this.finalizeDrawing();
        }
    }

    drawShape(ctx, start, end) {
        this._drawPrimitive(ctx, start, end);
        if (this.toolManager.symmetryEnabled) {
            const centerX = this.canvasManager.mainCanvas.width / 2;
            const symStart = { x: centerX + (centerX - start.x), y: start.y };
            const symEnd = { x: centerX + (centerX - end.x), y: end.y };
            this._drawPrimitive(ctx, symStart, symEnd);
        }
    }

    _drawPrimitive(ctx, start, end) {
        const tool = this.toolManager.getTool(); const bType = this.toolManager.brushType; const eType = this.toolManager.eraserType;

        ctx.lineWidth = this.toolManager.getSize(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalAlpha = this.toolManager.getOpacity(); ctx.globalCompositeOperation = 'source-over'; 

        if (tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; } 
        else if (tool === 'brush' && bType === 'marker') { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = this.toolManager.getOpacity() * 0.5; }
        
        ctx.strokeStyle = this.toolManager.getColor(); ctx.fillStyle = this.toolManager.getColor();

        if (tool === 'brush' && bType === 'spray') {
            const density = this.toolManager.getSize() * 2; const radius = this.toolManager.getSize() * 2;
            for (let i = 0; i < density; i++) { const offsetX = (Math.random() * 2 - 1) * radius; const offsetY = (Math.random() * 2 - 1) * radius; ctx.fillRect(end.x + offsetX, end.y + offsetY, 1, 1); }
            return; 
        }

        ctx.beginPath();
        if (tool === 'brush' || tool === 'eraser' || tool === 'line') { ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke(); }
        else if (tool === 'rect') { ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y); ctx.stroke(); }
        else if (tool === 'circle') { 
            const centerX = (start.x + end.x) / 2;
            const centerY = (start.y + end.y) / 2;
            const radiusX = Math.abs(end.x - start.x) / 2;
            const radiusY = Math.abs(end.y - start.y) / 2;
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI); 
            ctx.stroke(); 
        }
        
        ctx.globalAlpha = 1.0; ctx.globalCompositeOperation = 'source-over';
    }

    finalizeDrawing() {
        this.isDrawing = false;
        const afterDrawState = this.canvasManager.getMainImageData();
        const cmd = new DrawCommand(this.canvasManager, this.beforeDrawState, afterDrawState);
        this.historyManager.executeCommand(cmd);
        this.beforeDrawState = null;
        this.canvasManager.composite(); // Tüm katmanları display canvas'a yaz
        this.pageManager.saveToLocalStorage(this.canvasManager);
    }

    finalizeSelectionProcess(pos) {
        let rx, ry, rw, rh; let isLasso = this.toolManager.selectType === 'lasso';
        this.beforeDrawState = this.canvasManager.getMainImageData();

        if (!isLasso) {
            const width = pos.x - this.startPos.x; const height = pos.y - this.startPos.y;
            if (Math.abs(width) < 5 || Math.abs(height) < 5) { this.canvasManager.clearDraftCanvas(); this.selectionState = 'none'; return; }
            rx = Math.floor(width < 0 ? pos.x : this.startPos.x); ry = Math.floor(height < 0 ? pos.y : this.startPos.y);
            rw = Math.floor(Math.abs(width)); rh = Math.floor(Math.abs(height));
            
            const imageData = this.canvasManager.mainCtx.getImageData(rx, ry, rw, rh);
            const tempCanvas = document.createElement('canvas'); tempCanvas.width = rw; tempCanvas.height = rh; tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
            this.canvasManager.mainCtx.clearRect(rx, ry, rw, rh);
            this.floatingSelection = { canvas: tempCanvas, x: rx, y: ry, width: rw, height: rh };
        } else {
            if (this.lassoPoints.length < 3) { this.canvasManager.clearDraftCanvas(); this.selectionState = 'none'; return; }
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            this.lassoPoints.forEach(p => { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; });
            rx = Math.floor(minX); ry = Math.floor(minY); rw = Math.floor(maxX - minX); rh = Math.floor(maxY - minY);

            const tempCanvas = document.createElement('canvas'); tempCanvas.width = rw; tempCanvas.height = rh; const tCtx = tempCanvas.getContext('2d');
            tCtx.beginPath(); tCtx.moveTo(this.lassoPoints[0].x - rx, this.lassoPoints[0].y - ry);
            for (let i = 1; i < this.lassoPoints.length; i++) tCtx.lineTo(this.lassoPoints[i].x - rx, this.lassoPoints[i].y - ry); tCtx.closePath(); tCtx.clip();
            tCtx.drawImage(this.canvasManager.mainCanvas, -rx, -ry);
            
            const mCtx = this.canvasManager.mainCtx; mCtx.save(); mCtx.beginPath(); mCtx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
            for (let i = 1; i < this.lassoPoints.length; i++) mCtx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y); mCtx.closePath(); mCtx.globalCompositeOperation = 'destination-out'; mCtx.fill(); mCtx.restore();

            this.floatingSelection = { canvas: tempCanvas, x: rx, y: ry, width: rw, height: rh };
        }
        
        this.selectionState = 'none'; this.drawFloatingSelection();
    }

    drawFloatingSelection() {
        this.canvasManager.clearDraftCanvas();
        if (!this.floatingSelection) return;
        const ctx = this.canvasManager.draftCtx;
        ctx.drawImage(this.floatingSelection.canvas, this.floatingSelection.x, this.floatingSelection.y, this.floatingSelection.width, this.floatingSelection.height);
        ctx.setLineDash([5, 5]); ctx.strokeStyle = '#007acc'; ctx.lineWidth = 1; ctx.strokeRect(this.floatingSelection.x, this.floatingSelection.y, this.floatingSelection.width, this.floatingSelection.height); ctx.setLineDash([]);
        this.updateResizeHandlePos();
    }

    updateResizeHandlePos() {
        if (!this.floatingSelection) { this.resizeHandles.forEach(h => h.style.display = 'none'); return; }
        const leftX = this.floatingSelection.x; const rightX = this.floatingSelection.x + this.floatingSelection.width; 
        const topY = this.floatingSelection.y; const bottomY = this.floatingSelection.y + this.floatingSelection.height;
        const sLx = leftX * this.canvasManager.scale + this.canvasManager.translate.x;
        const sRx = rightX * this.canvasManager.scale + this.canvasManager.translate.x;
        const sTy = topY * this.canvasManager.scale + this.canvasManager.translate.y;
        const sBy = bottomY * this.canvasManager.scale + this.canvasManager.translate.y;
        
        this.resizeHandles.forEach(h => {
            h.style.display = 'block';
            if (h.dataset.pos === 'tl') { h.style.left = (sLx - 7) + 'px'; h.style.top = (sTy - 7) + 'px'; h.style.cursor = 'nwse-resize'; }
            if (h.dataset.pos === 'tr') { h.style.left = (sRx - 7) + 'px'; h.style.top = (sTy - 7) + 'px'; h.style.cursor = 'nesw-resize'; }
            if (h.dataset.pos === 'bl') { h.style.left = (sLx - 7) + 'px'; h.style.top = (sBy - 7) + 'px'; h.style.cursor = 'nesw-resize'; }
            if (h.dataset.pos === 'br') { h.style.left = (sRx - 7) + 'px'; h.style.top = (sBy - 7) + 'px'; h.style.cursor = 'nwse-resize'; }
        });
    }

    commitSelection() {
        if (!this.floatingSelection) return;
        this.canvasManager.container.style.cursor = 'crosshair';
        this.canvasManager.clearDraftCanvas(); this.resizeHandles.forEach(h => h.style.display = 'none');
        this.canvasManager.mainCtx.drawImage(this.floatingSelection.canvas, this.floatingSelection.x, this.floatingSelection.y, this.floatingSelection.width, this.floatingSelection.height);
        const afterDrawState = this.canvasManager.getMainImageData(); const cmd = new DrawCommand(this.canvasManager, this.beforeDrawState, afterDrawState);
        this.historyManager.executeCommand(cmd); this.pageManager.saveToLocalStorage(this.canvasManager);
        this.floatingSelection = null; this.beforeDrawState = null;
    }

    pasteSelection() {
        if (!this.clipboardCanvas || !this.lastContextPos) return;
        if (this.floatingSelection) this.commitSelection();
        this.beforeDrawState = this.canvasManager.getMainImageData();
        const rw = this.clipboardCanvas.width; const rh = this.clipboardCanvas.height;
        const rx = this.lastContextPos.x - rw/2; const ry = this.lastContextPos.y - rh/2;

        const tempCanvas = document.createElement('canvas'); tempCanvas.width = rw; tempCanvas.height = rh; tempCanvas.getContext('2d').drawImage(this.clipboardCanvas, 0, 0);
        this.floatingSelection = { canvas: tempCanvas, x: rx, y: ry, width: rw, height: rh };
        this.toolManager.setTool('select'); document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); document.querySelector(`.tool-btn[data-tool="select"]`).classList.add('active');
        this.drawFloatingSelection();
    }

    pasteSelectionCentered() {
        if (!this.clipboardCanvas) return;
        if (this.floatingSelection) this.commitSelection();
        this.beforeDrawState = this.canvasManager.getMainImageData();
        const rw = this.clipboardCanvas.width; const rh = this.clipboardCanvas.height;
        const cw = this.canvasManager.mainCanvas.width; const ch = this.canvasManager.mainCanvas.height;
        const rx = (cw - rw) / 2; const ry = (ch - rh) / 2;

        const tempCanvas = document.createElement('canvas'); tempCanvas.width = rw; tempCanvas.height = rh; tempCanvas.getContext('2d').drawImage(this.clipboardCanvas, 0, 0);
        this.floatingSelection = { canvas: tempCanvas, x: rx, y: ry, width: rw, height: rh };
        this.toolManager.setTool('select'); document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); document.querySelector(`.tool-btn[data-tool="select"]`).classList.add('active');
        this.drawFloatingSelection();
    }

    cutSelection() { if (!this.floatingSelection) return; this.clipboardCanvas = this.floatingSelection.canvas; this.canvasManager.clearDraftCanvas(); this.resizeHandles.forEach(h => h.style.display = 'none'); const afterDrawState = this.canvasManager.getMainImageData(); const cmd = new DrawCommand(this.canvasManager, this.beforeDrawState, afterDrawState); this.historyManager.executeCommand(cmd); this.pageManager.saveToLocalStorage(this.canvasManager); this.floatingSelection = null; this.beforeDrawState = null; }
    copySelection() { if (!this.floatingSelection) return; this.clipboardCanvas = this.floatingSelection.canvas; this.commitSelection(); }
    deleteSelection() { if (!this.floatingSelection) return; this.canvasManager.clearDraftCanvas(); this.resizeHandles.forEach(h => h.style.display = 'none'); const afterDrawState = this.canvasManager.getMainImageData(); const cmd = new DrawCommand(this.canvasManager, this.beforeDrawState, afterDrawState); this.historyManager.executeCommand(cmd); this.pageManager.saveToLocalStorage(this.canvasManager); this.floatingSelection = null; this.beforeDrawState = null; }

    handleImageImport(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const cw = this.canvasManager.mainCanvas.width; const ch = this.canvasManager.mainCanvas.height;
                let rw = img.width; let rh = img.height;
                if (rw > cw * 0.8) { rh = rh * (cw * 0.8 / rw); rw = cw * 0.8; }
                if (rh > ch * 0.8) { rw = rw * (ch * 0.8 / rh); rh = ch * 0.8; }
                const rx = (cw - rw) / 2; const ry = (ch - rh) / 2;

                if (this.floatingSelection) this.commitSelection();
                this.beforeDrawState = this.canvasManager.getMainImageData();
                
                const tempCanvas = document.createElement('canvas'); tempCanvas.width = rw; tempCanvas.height = rh; tempCanvas.getContext('2d').drawImage(img, 0, 0, rw, rh);
                this.floatingSelection = { canvas: tempCanvas, x: rx, y: ry, width: rw, height: rh };
                this.toolManager.setTool('select'); document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); document.querySelector('[data-tool="select"]').classList.add('active');
                this.drawFloatingSelection();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    applyFilter(filterType) {
        const before = this.canvasManager.getMainImageData(); const ctx = this.canvasManager.mainCtx;
        const w = this.canvasManager.mainCanvas.width; const h = this.canvasManager.mainCanvas.height;
        const idata = ctx.getImageData(0, 0, w, h); const data = idata.data;

        for (let i = 0; i < data.length; i += 4) {
            if (filterType === 'grayscale') { const avg = (data[i] + data[i + 1] + data[i + 2]) / 3; data[i] = avg; data[i + 1] = avg; data[i + 2] = avg; } 
            else if (filterType === 'invert') { data[i] = 255 - data[i]; data[i + 1] = 255 - data[i + 1]; data[i + 2] = 255 - data[i + 2]; }
        }
        ctx.putImageData(idata, 0, 0);
        const after = this.canvasManager.getMainImageData(); const cmd = new DrawCommand(this.canvasManager, before, after); this.historyManager.executeCommand(cmd); this.pageManager.saveToLocalStorage(this.canvasManager);
    }

    showTextInput(clientX, clientY, worldPos) {
        this.textPos = worldPos;
        // Offset by container rect so overlay appears exactly at the click point
        const rect = this.canvasManager.container.getBoundingClientRect();
        const fontSize = Math.max(16, this.toolManager.getSize() * 3) * this.canvasManager.scale;
        const fontStyle = this.toolManager.textItalic ? 'italic' : 'normal';
        const fontWeight = this.toolManager.textBold ? 'bold' : 'normal';
        const fontFamily = this.toolManager.textFont || 'Arial';

        this.textInput.style.display = 'block';
        this.textInput.style.left = (clientX - rect.left) + 'px';
        this.textInput.style.top  = (clientY - rect.top)  + 'px';
        this.textInput.style.color = this.toolManager.getColor();
        this.textInput.style.opacity = this.toolManager.getOpacity();
        this.textInput.style.fontSize = fontSize + 'px';
        this.textInput.style.fontFamily = fontFamily;
        this.textInput.style.fontWeight = fontWeight;
        this.textInput.style.fontStyle  = fontStyle;
        this.textInput.value = '';
        setTimeout(() => this.textInput.focus(), 10);
    }

    finalizeText() {
        if (this.textInput.style.display === 'none') return;
        this.textInput.style.display = 'none';
        const text = this.textInput.value.trim();
        if (!text) { this.beforeDrawState = null; this.isDrawing = false; return; }

        const fontSize  = Math.max(16, this.toolManager.getSize() * 3);
        const fontStyle  = this.toolManager.textItalic ? 'italic'  : 'normal';
        const fontWeight = this.toolManager.textBold   ? 'bold'    : 'normal';
        const fontFamily = this.toolManager.textFont || 'Arial';
        const fontStr    = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;

        // Measure text to size the temp canvas
        const measCtx = document.createElement('canvas').getContext('2d');
        measCtx.font = fontStr;
        const metrics = measCtx.measureText(text);
        const pad = 8;
        const tw = Math.ceil(metrics.width) + pad * 2;
        const th = fontSize + pad * 2;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tw; tempCanvas.height = th;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.font = fontStr;
        tCtx.fillStyle = this.toolManager.getColor();
        tCtx.globalAlpha = this.toolManager.getOpacity();
        tCtx.textBaseline = 'top';
        tCtx.fillText(text, pad, pad);

        // Commit any existing floating selection first
        if (this.floatingSelection) this.commitSelection();

        this.beforeDrawState = this.canvasManager.getMainImageData();
        // Place top-left at the world click position
        this.floatingSelection = { canvas: tempCanvas, x: this.textPos.x - pad, y: this.textPos.y - pad, width: tw, height: th };
        // Switch to select tool so the box can be dragged/resized immediately
        this.toolManager.setTool('select');
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const selBtn = document.querySelector('.tool-btn[data-tool="select"]');
        if (selBtn) selBtn.classList.add('active');
        this.drawFloatingSelection();

        this.isDrawing = false;
    }

    // ---------------------- KATMAN (LAYER) SİSTEMİ ----------------------

    renderLayersPanel() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        list.innerHTML = '';
        const lm = this.layerManager;

        for (let i = lm.layers.length - 1; i >= 0; i--) {
            const layer = lm.layers[i];
            const isActive = i === lm.activeIndex;

            const item = document.createElement('div');
            item.className = 'layer-item' + (isActive ? ' active' : '');
            item.dataset.index = i;

            const eye = document.createElement('button');
            eye.className = 'layer-eye';
            eye.title = layer.visible ? 'Gizle' : 'Göster';
            eye.textContent = layer.visible ? '👁' : '🚫';
            eye.addEventListener('click', (e) => {
                e.stopPropagation();
                lm.setVisibility(i, !layer.visible);
                this.canvasManager.composite();
                this.renderLayersPanel();
            });

            const thumb = document.createElement('canvas');
            thumb.className = 'layer-thumb';
            thumb.width = 48; thumb.height = 64;
            thumb.getContext('2d').drawImage(layer.canvas, 0, 0, 48, 64);

            const nameEl = document.createElement('span');
            nameEl.className = 'layer-name';
            nameEl.textContent = layer.name;
            nameEl.title = 'Çift tıkla → Yeniden adlandır';
            nameEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const newName = prompt('Katman adı:', layer.name);
                if (newName && newName.trim()) { lm.renameLayer(i, newName.trim()); this.renderLayersPanel(); }
            });

            const del = document.createElement('button');
            del.className = 'layer-del';
            del.title = 'Katmanı Sil';
            del.textContent = '🗑';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                if (lm.layers.length === 1) { alert('En az 1 katman olmalı!'); return; }
                if (confirm(`"${layer.name}" silinsin mi?`)) { lm.deleteLayer(i); this.canvasManager.composite(); this.renderLayersPanel(); }
            });

            item.append(eye, thumb, nameEl, del);
            item.addEventListener('click', () => { this.commitSelection(); lm.setActive(i); this.renderLayersPanel(); });
            list.appendChild(item);
        }
    }

    addLayer() {
        this.commitSelection();
        this.layerManager.addLayer();
        this.renderLayersPanel();
    }

    moveActiveLayerUp() {
        this.commitSelection();
        this.layerManager.moveUp(this.layerManager.activeIndex);
        this.canvasManager.composite();
        this.renderLayersPanel();
    }

    moveActiveLayerDown() {
        this.commitSelection();
        this.layerManager.moveDown(this.layerManager.activeIndex);
        this.canvasManager.composite();
        this.renderLayersPanel();
    }

    flattenAllLayers() {
        if (!confirm('Tüm katmanları birleştirmek istiyor musunuz?')) return;
        const flatCanvas = document.createElement('canvas');
        flatCanvas.width = this.canvasManager.mainCanvas.width;
        flatCanvas.height = this.canvasManager.mainCanvas.height;
        this.layerManager.composite(flatCanvas.getContext('2d'));
        const pw = flatCanvas.width, ph = flatCanvas.height;
        this.layerManager = new LayerManager(pw, ph);
        this.canvasManager.setLayerManager(this.layerManager);
        this.layerManager.activeCtx.drawImage(flatCanvas, 0, 0);
        this.canvasManager.composite();
        this.renderLayersPanel();
    }
}

window.addEventListener('DOMContentLoaded', () => { window.editorApp = new App(); });
