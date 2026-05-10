/**
 * math.js - Screen to World koordinat dönüşüm yardımcıları
 * 
 * Pan (kaydırma) ve Zoom (yakınlaştırma) işlemleri yapıldığında, mouse'un
 * ekrandaki piksel koordinatları ile Canvas'ın gerçek dünya (world) koordinatları
 * birbirinden farklılaşır. Bu fonksiyon, formülize edilmiş bir şekilde
 * UI olaylarından gelen (clientX, clientY) değerlerini gerçek çizim uzayına çevirir.
 */

export const screenToWorld = (clientX, clientY, canvas, scale, translate) => {
    // 1. Canvas'ın ekrandaki bounding kutusunu al (margin/padding etkilerini yok etmek için)
    const rect = canvas.getBoundingClientRect();

    // 2. Ekranın neresine tıklandığını Canvas'ın sol üst köşesine göre bul (Screen Coords)
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // 3. Screen koordinatlarını World koordinatlarına dönüştür
    // Formül: World = (Screen - Translate) / Scale
    const worldX = (screenX - translate.x) / scale;
    const worldY = (screenY - translate.y) / scale;

    return { x: worldX, y: worldY };
};
