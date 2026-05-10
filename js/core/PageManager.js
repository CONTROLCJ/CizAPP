/**
 * PageManager.js - Çoklu Sayfa Yöneticisi
 */
import { HistoryManager } from './HistoryManager.js';

export class PageManager {
    constructor() {
        this.pages = [];
        this.activePageIndex = 0;
        this.copiedPage = null; // Sayfa kopyalama panosu
        
        this.loadFromLocalStorage();
        if (this.pages.length === 0) {
            this.addPage();
        }
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('canvasPages');
            if (data) {
                const parsed = JSON.parse(data);
                this.pages = parsed.map(p => ({
                    id: p.id,
                    dataURL: p.dataURL,
                    paperType: p.paperType || 'none',
                    paperColor: p.paperColor || '#ffffff',
                    history: new HistoryManager() // History yenilemede sıfırlanır
                }));
            }
        } catch(e) {
            console.warn("Sayfalar yüklenemedi", e);
        }
    }

    saveToLocalStorage(canvasManager) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            if (canvasManager) {
                this.pages[this.activePageIndex].dataURL = canvasManager.mainCanvas.toDataURL('image/png');
            }
            try {
                // history nesnesini stringify sırasında silmek için
                const serialized = this.pages.map(p => ({
                    id: p.id,
                    dataURL: p.dataURL,
                    paperType: p.paperType,
                    paperColor: p.paperColor
                }));
                localStorage.setItem('canvasPages', JSON.stringify(serialized));
            } catch(e) {
                console.warn("Otomatik kayıt yapılamadı:", e);
            }
        }, 300); // Optimize edildi: 300ms debounce
    }

    addPage() {
        this.pages.push({
            id: Date.now() + Math.random(),
            dataURL: null,
            paperType: 'none',
            paperColor: '#ffffff',
            history: new HistoryManager()
        });
        return this.pages.length - 1;
    }

    deletePage(index) {
        if (this.pages.length > 1) {
            this.pages.splice(index, 1);
            if (this.activePageIndex >= this.pages.length) {
                this.activePageIndex = this.pages.length - 1;
            }
        }
    }
    
    copyPage(index) {
        const p = this.pages[index];
        this.copiedPage = {
            dataURL: p.dataURL,
            paperType: p.paperType,
            paperColor: p.paperColor
        };
    }
    
    pastePage() {
        if (!this.copiedPage) return;
        this.pages.push({
            id: Date.now() + Math.random(),
            dataURL: this.copiedPage.dataURL,
            paperType: this.copiedPage.paperType,
            paperColor: this.copiedPage.paperColor,
            history: new HistoryManager()
        });
        return this.pages.length - 1;
    }

    getActivePage() {
        return this.pages[this.activePageIndex];
    }
}
