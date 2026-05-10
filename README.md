# 🎨 ÇizAPP - Profesyonel Dijital Defter ve Çizim Uygulaması

![ÇizAPP Logo](file:///C:/Users/ASUS/.gemini/antigravity/brain/37ac3de9-fc29-4b90-bcbb-c041d93b689c/cizapp_logo_1778439127404.png)

ÇizAPP, Vanilla JavaScript ve HTML5 Canvas kullanılarak sıfırdan geliştirilmiş, dış kütüphanelere bağımlı olmayan profesyonel bir çok sayfalı (multi-page) çizim aracı ve dijital not defteridir. Modern arayüzü, güçlü seçim ve boyutlandırma araçları, ve yüksek performanslı mimarisiyle sıradan bir web çizim aracından çok daha ötesini sunar.

## ✨ Öne Çıkan Özellikler

### 📄 Çoklu Sayfa ve Kağıt Mimarisi
- **Bağımsız Sayfalar:** Her sayfası ayrı bir kanvas gibi çalışan, geçiş yapabileceğiniz sayfa sekmesi sistemi.
- **Kağıt Özelleştirme:** Sayfalar için Saman Kağıdı, Soluk Mavi, Soluk Yeşil gibi farklı arka plan renkleri seçme imkanı. Çizgili defter ve Kareli (Grid) desen seçenekleri.
- **Gerçekçi Düzen:** 1200x1600 A4 formatında sabit boyutlu ana çalışma alanı. Sayfa içinde sınırsız **Orta Tuş (Middle Mouse)** ile gezinme ve Fare Tekerleği ile sonsuz yakınlaştırma (Zoom) desteği.

### 🧰 Gelişmiş Çizim Araçları
- **Evrensel Taşıma ve 4 Köşeden Boyutlandırma:** İster yeni bir Daire çizin, ister Dikdörtgen, ister bilgisayarınızdan resim sürükleyip bırakın; oluşturulan her obje ekrana yapışmadan önce **4 köşeli akıllı bir seçim kutusu** içerisine alınır. Şekli sürükleyebilir veya dilediğiniz gibi orantılayabilirsiniz.
- **Dinamik Fırçalar ve Araçlar:** Normal fırça, fosforlu kalem, sprey ve simetri modlu gelişmiş fırçalar. Metin (Text) aracı, Doldurma Kovası, Damlalık (Renk Seçici).
- **Akıllı Silgi:** Karmaşık modlardan arındırılmış, süper hızlı ve pürüzsüz çalışan vektör hisli standart silgi.

### 📋 Profesyonel Etkileşim ve Klavye Kısayolları
- **Tam Pano (Clipboard) Desteği:** `Ctrl+C` (Kopyala), `Ctrl+X` (Kes) ve `Ctrl+V` (Ekranın ortasına yapıştır) tam entegrasyonu. Sağ tıklayarak da "Yapıştır, Kopyala, Kes" gibi bağlamsal menülere ulaşma imkanı.
- **Sürükle-Bırak:** Masaüstünden herhangi bir fotoğrafı tuvalin üstüne sürükleyip bıraktığınızda resmi anında içeri aktarma ve 4 köşesinden boyutlandırma.
- **Geri/İleri Alma (Undo/Redo):** Yaptığınız her hareketi izleyen ve 50 adıma kadar geri-ileri alabilen yüksek bellekli işlem geçmişi (`Ctrl+Z`, `Ctrl+Y`).
- **Gelişmiş Favoriler:** Sık kullandığınız fırça, araç ve renk ayarlarını yıldızlı üst bara tek tıkla kaydedip sonradan çağırabilirsiniz.

### 💾 Dışa Aktarım ve Kayıt Sistemi
- **Otomatik Kayıt:** Çizim yapmayı bıraktığınız an 0.3 saniyelik "Debounce" algoritmasıyla arka planda pürüzsüzce tarayıcı önbelleğine (`localStorage`) kaydedilir, sekme kapansa bile veri kaybolmaz.
- **PDF ve PNG Çıktısı:** Sadece çizimleri değil, seçtiğiniz defter desenini (kareli/çizgili ve rengini) de dahil ederek çiziminizi **PNG** indirebilir veya tüm sayfalarınızı tek bir hamlede **PDF** formatında profesyonelce dışa aktarabilirsiniz.
- **Tamamen Sıfırla:** Uygulamanın tüm verilerini tek tıkla cihazdan kazıyan Reset özelliği.

## 🚀 Teknolojik Altyapı ve Optimizasyonlar
ÇizAPP, karmaşık raster işlemlerini hiçbir harici Framework (React, Vue vb.) veya dış kütüphane (Fabric.js vb.) kullanmadan, doğrudan **Vanilla JS** ve modüler bir yapıyla yürütür. 

* **State (Durum) Yöneticisi:** Sınıf tabanlı (OOP) `CanvasManager`, `ToolManager`, `HistoryManager` ve `PageManager` ile ayrıştırılmış mimari.
* **Double Buffering:** Çizim esnasındaki takılmaları engellemek için `mainCanvas` ve `draftCanvas` olarak çalışan çift katmanlı tuval motoru.
* **Performans Optimizasyonları:** Akıcı taşıma ve yakınlaştırma işlemleri için Canvas'ı her karede yeniden çizmek yerine **Donanım Hızlandırmalı CSS Transform (`translate`, `scale`)** kullanılmıştır. Fare koordinatları bu transform matrisine göre `screenToWorld` fonksiyonu ile mikrosaniye bazında gerçek zamanlı çevrilir.

---
**Geliştirici:** Sizin Vizyonunuz, AI'nin Kodlaması ile hayat buldu. 🌟
