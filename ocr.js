const input = document.getElementById("imgInput");
const status = document.getElementById("status");
const canvas = document.getElementById("preview");
const resultBox = document.getElementById("result");
const ctx = canvas.getContext("2d");

function preprocessImage(imageData) {
    const data = imageData.data;
    
    // Посилення контрасту і порогування
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const threshold = 150;
        const value = gray > threshold ? 255 : 0;
        
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }
    
    return imageData;
}

function detectSudokuBounds(canvas) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let minX = canvas.width, maxX = 0;
    let minY = canvas.height, maxY = 0;
    
    // Пошук чорних пікселів (цифри і сітка)
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i + 3] > 128 ? (data[i] + data[i + 1] + data[i + 2]) / 3 : 255;
        if (gray < 200) {
            const pixelIndex = i / 4;
            const x = pixelIndex % canvas.width;
            const y = Math.floor(pixelIndex / canvas.width);
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }
    
    return { minX, maxX, minY, maxY };
}

function extractCellDigits(canvas, bounds) {
    const cellWidth = (bounds.maxX - bounds.minX) / 9;
    const cellHeight = (bounds.maxY - bounds.minY) / 9;
    
    const digits = [];
    const ctx = canvas.getContext("2d");
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const x = Math.floor(bounds.minX + col * cellWidth);
            const y = Math.floor(bounds.minY + row * cellHeight);
            const w = Math.ceil(cellWidth);
            const h = Math.ceil(cellHeight);
            
            // Вилучення клітинки
            const cellCanvas = document.createElement("canvas");
            cellCanvas.width = w;
            cellCanvas.height = h;
            const cellCtx = cellCanvas.getContext("2d");
            cellCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
            
            digits.push({
                row,
                col,
                canvas: cellCanvas,
                x: Math.floor(bounds.minX + col * cellWidth + cellWidth / 2),
                y: Math.floor(bounds.minY + row * cellHeight + cellHeight / 2)
            });
        }
    }
    
    return digits;
}

input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    status.innerText = "📥 Loading image...";

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        status.innerText = "🔍 Preprocessing image...";
        
        // Обробка зображення
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        imageData = preprocessImage(imageData);
        ctx.putImageData(imageData, 0, 0);

        status.innerText = "📍 Detecting sudoku grid...";
        
        // Пошук меж судоку
        const bounds = detectSudokuBounds(canvas);
        
        if (bounds.maxX - bounds.minX < 50 || bounds.maxY - bounds.minY < 50) {
            status.innerText = "❌ Could not detect sudoku grid. Try a clearer image.";
            return;
        }

        status.innerText = "🧮 Recognizing digits...";
        
        // Вилучення цифр з клітинок
        const cellDigits = extractCellDigits(canvas, bounds);
        
        const board = Array(9).fill(null).map(() => Array(9).fill(0));
        let recognizedCount = 0;

        for (const cell of cellDigits) {
            try {
                const { data: { text } } = await Tesseract.recognize(
                    cell.canvas,
                    "eng",
                    { tessedit_char_whitelist: "123456789" }
                );

                const digit = parseInt(text.trim());
                if (digit >= 1 && digit <= 9) {
                    board[cell.row][cell.col] = digit;
                    recognizedCount++;
                }
            } catch (e) {
                // Ігнорування помилок при розпізнаванні порожніх клітинок
            }
        }

        if (recognizedCount < 17) {
            status.innerText = `❌ Recognized only ${recognizedCount} digits. Need at least 17.`;
            return;
        }

        status.innerText = "⚡ Solving...";

        let solved = solveSudoku(JSON.parse(JSON.stringify(board)));

        resultBox.innerText =
            `Recognized: ${recognizedCount} digits\n\n` +
            "Solved Sudoku:\n\n" +
            solved.map(r => r.join(" ")).join("\n");

        status.innerText = "✅ Done!";
    };
};
