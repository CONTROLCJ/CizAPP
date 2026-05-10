/**
 * Commands.js - Command Pattern objeleri
 * 
 * Burada "Command" arayüzünü (interface) uygulayan (execute ve undo metodlarına sahip)
 * sınıflar yer alır. Flood Fill ve serbest çizim işlemleri ImageData bazlı kaydedileceği 
 * için her komut öncesinde ve sonrasında tuvalin bir fotoğrafını (ImageData) tutarız.
 */

// Temel Command Arayüzü (Soyut sınıf mantığında)
export class Command {
    execute() { throw new Error("execute() implement edilmeli."); }
    undo() { throw new Error("undo() implement edilmeli."); }
}

/**
 * Genel Çizim Komutu (Fırça, Çizgi, Dikdörtgen, Daire, Silgi, Boya Kovası vb.)
 * Çizim işlemi BAŞLAMADAN öncekiImageData ve BİTTİKTEN sonraki ImageData'yı tutarak
 * piksel bazlı kesin ve hatasız Undo/Redo sağlar.
 */
export class DrawCommand extends Command {
    /**
     * @param {CanvasManager} canvasManager - Tuval işlemleri için manager referansı
     * @param {ImageData} beforeState - İşlemden önceki canvas pikselleri
     * @param {ImageData} afterState - İşlemden sonraki canvas pikselleri
     */
    constructor(canvasManager, beforeState, afterState) {
        super();
        this.canvasManager = canvasManager;
        this.beforeState = beforeState;
        this.afterState = afterState;
    }

    execute() {
        // İleri al (Redo) durumunda veya komut HistoryManager'a eklendiğinde çalışır.
        // Zaten çizim bittikten sonra bu komut oluşturulduğu için ilk anda zaten 
        // canvas 'afterState' halindedir, ama Redo yapıldığında bu koda ihtiyaç vardır.
        if (this.afterState) {
            this.canvasManager.putMainImageData(this.afterState);
        }
    }

    undo() {
        // Geri al durumunda tuvali işlemden önceki pikselleriyle eziyoruz.
        if (this.beforeState) {
            this.canvasManager.putMainImageData(this.beforeState);
        }
    }
}

/**
 * Tuvali Temizleme Komutu
 */
export class ClearCommand extends Command {
    constructor(canvasManager, beforeState) {
        super();
        this.canvasManager = canvasManager;
        this.beforeState = beforeState;
    }

    execute() {
        this.canvasManager.clearMainCanvas();
    }

    undo() {
        if (this.beforeState) {
            this.canvasManager.putMainImageData(this.beforeState);
        }
    }
}
