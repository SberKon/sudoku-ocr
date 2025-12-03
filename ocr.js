const input = document.getElementById("imgInput");
const status = document.getElementById("status");
const canvas = document.getElementById("preview");
const resultBox = document.getElementById("result");
const ctx = canvas.getContext("2d");

function preprocessImage(imageData) {
    const data = imageData.data;
    
    // Адаптивна обробка контрасту
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const threshold = 128;
        const value = gray > threshold ? 255 : 0;
        
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }
    
    return imageData;
}

function enhanceCell(cellCanvas) {
    const cellCtx = cellCanvas.getContext("2d");
    let cellData = cellCtx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
    const data = cellData.data;
    
    // Посилення контрасту для окремої клітинки
    let minGray = 255, maxGray = 0;
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        minGray = Math.min(minGray, gray);
        maxGray = Math.max(maxGray, gray);
    }
    
    const range = maxGray - minGray || 1;
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const normalized = ((gray - minGray) / range) * 255;
        const threshold = 140;
        const value = normalized > threshold ? 255 : 0;
        
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }
    
    cellCtx.putImageData(cellData, 0, 0);
    return cellCanvas;
}

function detectSudokuBounds(canvas) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let minX = canvas.width, maxX = 0;
    let minY = canvas.height, maxY = 0;
    
    // Пошук чорних пікселів (цифри і сітка)
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
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
    
    const SCALE = 200; // Масштабування для кращого розпізнавання
    const digits = [];
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const x = Math.floor(bounds.minX + col * cellWidth);
            const y = Math.floor(bounds.minY + row * cellHeight);
            const w = Math.ceil(cellWidth);
            const h = Math.ceil(cellHeight);
            
            // Вилучення і масштабування клітинки
            const cellCanvas = document.createElement("canvas");
            cellCanvas.width = SCALE;
            cellCanvas.height = SCALE;
            const cellCtx = cellCanvas.getContext("2d");
            cellCtx.drawImage(canvas, x, y, w, h, 0, 0, SCALE, SCALE);
            
            // Посилення клітинки
            enhanceCell(cellCanvas);
            
            digits.push({
                row,
                col,
                canvas: cellCanvas
            });
        }
    }
    
    return digits;
}

async function recognizeDigit(cellCanvas) {
    try {
        const { data: { text, confidence } } = await Tesseract.recognize(
            cellCanvas,
            "eng",
            {
                tessedit_char_whitelist: "123456789",
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR
            }
        );

        const digit = parseInt(text.trim());
        
        if (digit >= 1 && digit <= 9) {
            return { digit, confidence };
        }
    } catch (e) {
        console.log("Recognition error:", e);
    }
    
    return { digit: 0, confidence: 0 };
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
            const result = await recognizeDigit(cell.canvas);
            
            if (result.digit >= 1 && result.digit <= 9) {
                board[cell.row][cell.col] = result.digit;
                recognizedCount++;
                console.log(`[${cell.row},${cell.col}] = ${result.digit} (conf: ${(result.confidence * 100).toFixed(1)}%)`);
            }
        }

        console.log("Board:", board);

        if (recognizedCount < 17) {
            status.innerText = `❌ Recognized only ${recognizedCount} digits. Need at least 17.`;
            return;
        }

        status.innerText = "⚡ Solving...";

        let solved = solveSudoku(JSON.parse(JSON.stringify(board)));
        
        if (!solved || solved.every(r => r.every(c => c === 0))) {
            status.innerText = "❌ Could not solve sudoku. Board might be invalid.";
            resultBox.innerText = "Original board:\n\n" + board.map(r => r.join(" ")).join("\n");
            return;
        }

        resultBox.innerText =
            `Recognized: ${recognizedCount} digits\n\n` +
            "Solved Sudoku:\n\n" +
            solved.map(r => r.join(" ")).join("\n");

        status.innerText = "✅ Done!";
    };
};
