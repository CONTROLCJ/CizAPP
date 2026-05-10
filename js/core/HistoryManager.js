/**
 * HistoryManager.js - Command Pattern ile Undo/Redo yöneticisi
 * 
 * Bu sınıf, kullanıcının yaptığı her işlemi (çizim, silme, boyama) bir Command 
 * nesnesi olarak `undoStack` (Geri Al yığını) içinde saklar. 
 * Kullanıcı "Geri Al" dediğinde nesne `redoStack`'e geçer ve işlemi geri alır.
 */

export class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50; // Bellek yönetimi için maksimum işlem sınırı
    }

    /**
     * Yeni bir komut çalıştırır ve geçmişe ekler.
     * @param {Command} command - Çalıştırılacak komut nesnesi
     */
    executeCommand(command) {
        // Komutun ilk çalıştırılışı (Canvas'a çizim işleminin son halinin uygulanması
        // veya başlangıçta fırça darbesi bittiğinde oluşturulup kaydedilmesi)
        command.execute();
        
        // Komutu undo stack'ine ekle
        this.undoStack.push(command);

        // Maksimum limiti aştıysa en eskisini sil
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        // Yeni bir aksiyon yapıldığında ileri al (redo) geçmişi silinir
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;

        // En son yapılan işlemi yığından al
        const command = this.undoStack.pop();
        
        // İşlemin undo() metodunu çağırarak tuvali eski haline getir
        command.undo();
        
        // Bu komutu "İleri Al" yığınına taşı
        this.redoStack.push(command);
    }

    redo() {
        if (this.redoStack.length === 0) return;

        // İleri alınabilecek en son işlemi yığından al
        const command = this.redoStack.pop();
        
        // İşlemi tekrar çalıştır
        command.execute();
        
        // Yeniden Geri Al yığınına taşı
        this.undoStack.push(command);
    }
}
