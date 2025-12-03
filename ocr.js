const input = document.getElementById("imgInput");
const status = document.getElementById("status");
const canvas = document.getElementById("preview");
const resultBox = document.getElementById("result");
const ctx = canvas.getContext("2d");

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

        status.innerText = "🔍 Recognizing digits...";

        const { data: { text } } = await Tesseract.recognize(img, "eng", {
            tessedit_char_whitelist: "123456789",
        });

        status.innerText = "🧮 Building sudoku grid...";

        let digits = text.replace(/\D/g, "");
        if (digits.length < 20) {
            status.innerText = "❌ Could not read enough digits.";
            return;
        }

        let board = [];
        let i = 0;
        for (let r = 0; r < 9; r++) {
            board[r] = [];
            for (let c = 0; c < 9; c++) {
                board[r][c] = parseInt(digits[i] || "0");
                i++;
            }
        }

        status.innerText = "⚡ Solving...";

        let solved = solveSudoku(board);

        resultBox.innerText =
            "Solved Sudoku:\n\n" +
            solved.map(r => r.join(" ")).join("\n");

        status.innerText = "✅ Done!";
    };
};
