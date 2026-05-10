/**
 * FloodFill.js - Boya Kovası ve Alan Silgisi Algoritması
 */

function colorsMatch(data, pos, targetColor) {
    return (
        data[pos] === targetColor[0] &&
        data[pos + 1] === targetColor[1] &&
        data[pos + 2] === targetColor[2] &&
        data[pos + 3] === targetColor[3]
    );
}

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} width 
 * @param {number} height 
 * @param {number} startX 
 * @param {number} startY 
 * @param {number[]} fillColorRgba - Örn: [255, 0, 0, 255]
 * @param {boolean} isEraser - Doğruysa tıkladığı alanı şeffaf (silgi) yapar
 */
export function applyFloodFill(ctx, width, height, startX, startY, fillColorRgba, isEraser = false) {
    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const startPos = (startY * width + startX) * 4;
    const targetColor = [
        data[startPos],
        data[startPos + 1],
        data[startPos + 2],
        data[startPos + 3]
    ];
    
    // Aynı renge boyanmaya çalışılıyorsa çık
    if (!isEraser && 
        targetColor[0] === fillColorRgba[0] &&
        targetColor[1] === fillColorRgba[1] &&
        targetColor[2] === fillColorRgba[2] &&
        targetColor[3] === fillColorRgba[3]
    ) {
        return;
    }
    
    // Zaten boş bir alanı silmeye çalışıyorsa çık
    if (isEraser && targetColor[3] === 0) {
        return; 
    }

    const queue = [[startX, startY]];
    let head = 0;
    
    while (head < queue.length) {
        const [x, y] = queue[head++];
        const pos = (y * width + x) * 4;
        
        if (colorsMatch(data, pos, targetColor)) {
            if (isEraser) {
                // Alanı tamamen şeffaf yap
                data[pos + 3] = 0; 
            } else {
                // Renge boya
                data[pos] = fillColorRgba[0];
                data[pos + 1] = fillColorRgba[1];
                data[pos + 2] = fillColorRgba[2];
                data[pos + 3] = fillColorRgba[3];
            }
            
            if (x > 0) queue.push([x - 1, y]);
            if (x < width - 1) queue.push([x + 1, y]);
            if (y > 0) queue.push([x, y - 1]);
            if (y < height - 1) queue.push([x, y + 1]);
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}
