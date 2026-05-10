/**
 * ToolManager.js - Araç ve Özellik Yöneticisi
 */

export class ToolManager {
    constructor() {
        this.activeTool = 'brush'; 
        
        // Her aracın bağımsız ayar hafızası (State Persistence)
        this.settings = {
            brush: { color: '#000000', size: 5, opacity: 1.0 },
            eraser: { color: '#ffffff', size: 20, opacity: 1.0 },
            line: { color: '#000000', size: 5, opacity: 1.0 },
            rect: { color: '#000000', size: 5, opacity: 1.0 },
            circle: { color: '#000000', size: 5, opacity: 1.0 },
            fill: { color: '#000000', size: 5, opacity: 1.0 },
            text: { color: '#000000', size: 5, opacity: 1.0 },
            eyedropper: { color: '#000000', size: 5, opacity: 1.0 },
            select: { color: '#000000', size: 5, opacity: 1.0 }
        };

        this.brushType = 'normal';
        this.selectType = 'rect';
        
        // Text Properties
        this.textFont = 'Arial';
        this.textBold = false;
        this.textItalic = false;

        this.initListeners();

        this.symmetryEnabled = false;
        this.gridEnabled = false;
        
        // UI güncellemesi için callback
        this.onToolChange = null; 
    }

    initListeners() {
        document.getElementById('select-type').addEventListener('change', (e) => {
            this.selectType = e.target.value;
        });

        const fontSelect = document.getElementById('text-font');
        const btnBold = document.getElementById('btn-text-bold');
        const btnItalic = document.getElementById('btn-text-italic');
        const textOptions = document.getElementById('text-options');

        fontSelect.addEventListener('change', (e) => { this.textFont = e.target.value; });
        btnBold.addEventListener('click', () => { 
            this.textBold = !this.textBold; 
            btnBold.classList.toggle('active', this.textBold);
        });
        btnItalic.addEventListener('click', () => { 
            this.textItalic = !this.textItalic; 
            btnItalic.classList.toggle('active', this.textItalic);
        });

        // Hide/Show text options when tool changes
        const originalSetTool = this.setTool.bind(this);
        this.setTool = (tool) => {
            originalSetTool(tool);
            if (textOptions) textOptions.style.display = tool === 'text' ? 'flex' : 'none';
        };
    }

    setTool(toolName) {
        this.activeTool = toolName;
        const container = document.getElementById('canvas-container');
        if (container) {
            Array.from(container.classList).forEach(cls => {
                if (cls.startsWith('tool-')) container.classList.remove(cls);
            });
            container.classList.add('tool-' + toolName);
        }
        
        // Araç değiştiğinde UI'ı o aracın en sonki ayarlarına göre güncelle
        if (this.onToolChange) {
            this.onToolChange(this.settings[this.activeTool]);
        }
    }

    getTool() { return this.activeTool; }

    setColor(colorHex) { this.settings[this.activeTool].color = colorHex; }
    getColor() { return this.settings[this.activeTool].color; }

    setSize(sizeInt) { this.settings[this.activeTool].size = sizeInt; }
    getSize() { return this.settings[this.activeTool].size; }

    setOpacity(opacityFloat) { this.settings[this.activeTool].opacity = opacityFloat; }
    getOpacity() { return this.settings[this.activeTool].opacity; }
    
    // Geçerli rengi RGB formatında döndürür
    getColorRgb() {
        const hex = this.settings[this.activeTool].color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }
}
