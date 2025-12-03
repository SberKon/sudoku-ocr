let currentBoard = Array(9).fill(null).map(() => Array(9).fill(0));
let originalBoard = Array(9).fill(null).map(() => Array(9).fill(0));
let solvedBoard = null;

function createGrid() {
    const gridContainer = document.getElementById("sudokuGrid");
    gridContainer.innerHTML = "";

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement("div");
            cell.className = "sudoku-cell";
            
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = "1";
            input.placeholder = ".";
            input.dataset.row = row;
            input.dataset.col = col;
            input.inputMode = "numeric";

            input.addEventListener("input", (e) => {
                const value = e.target.value.replace(/[^1-9]/g, "");
                e.target.value = value;
                
                if (value) {
                    currentBoard[row][col] = parseInt(value);
                } else {
                    currentBoard[row][col] = 0;
                }
            });

            input.addEventListener("keydown", (e) => {
                if (e.key === "ArrowUp" && row > 0) {
                    document.querySelector(`input[data-row="${row-1}"][data-col="${col}"]`).focus();
                } else if (e.key === "ArrowDown" && row < 8) {
                    document.querySelector(`input[data-row="${row+1}"][data-col="${col}"]`).focus();
                } else if (e.key === "ArrowLeft" && col > 0) {
                    document.querySelector(`input[data-row="${row}"][data-col="${col-1}"]`).focus();
                } else if (e.key === "ArrowRight" && col < 8) {
                    document.querySelector(`input[data-row="${row}"][data-col="${col+1}"]`).focus();
                } else if (e.key === "Backspace") {
                    e.target.value = "";
                    currentBoard[row][col] = 0;
                }
            });

            cell.appendChild(input);
            gridContainer.appendChild(cell);
        }
    }
}

function updateGridDisplay() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            const value = currentBoard[row][col];
            
            input.value = value || "";
            
            // Помічаємо заблоковані клітинки (з фото)
            if (originalBoard[row][col] !== 0) {
                input.parentElement.classList.add("locked");
                input.disabled = false;
            } else {
                input.parentElement.classList.remove("locked");
                input.disabled = false;
            }
        }
    }
}

function loadBoardFromOCR(board) {
    currentBoard = JSON.parse(JSON.stringify(board));
    originalBoard = JSON.parse(JSON.stringify(board));
    updateGridDisplay();
}

function clearBoard() {
    // Очищаємо тільки незаблоковані клітинки
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (originalBoard[row][col] === 0) {
                currentBoard[row][col] = 0;
            }
        }
    }
    updateGridDisplay();
    document.getElementById("result").innerText = "";
}

function resetBoard() {
    currentBoard = JSON.parse(JSON.stringify(originalBoard));
    updateGridDisplay();
    document.getElementById("result").innerText = "";
    solvedBoard = null;
}

function solveBoard() {
    const boardCopy = JSON.parse(JSON.stringify(currentBoard));
    solvedBoard = solveSudoku(boardCopy);

    if (!solvedBoard || solvedBoard.every(r => r.every(c => c === 0))) {
        showStatus("❌ Could not solve sudoku. Board might be invalid.", "error");
        displayResult("Invalid Sudoku", currentBoard);
        return;
    }

    displayResult("Solution Found", solvedBoard);
    showStatus("✅ Sudoku solved!", "success");
    
    // Показуємо рішення в гриді
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const input = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`);
            if (originalBoard[row][col] === 0) {
                input.value = solvedBoard[row][col];
                input.parentElement.classList.add("filled");
            }
        }
    }
}

function displayResult(title, board) {
    const resultBox = document.getElementById("result");
    resultBox.innerText = `${title}:\n\n${board.map(r => r.join(" ")).join("\n")}`;
}

function showStatus(message, type) {
    const status = document.getElementById("status");
    status.innerText = message;
    status.className = "status " + type;
}

// Event Listeners
document.getElementById("solveBtn").addEventListener("click", solveBoard);
document.getElementById("clearBtn").addEventListener("click", clearBoard);
document.getElementById("resetBtn").addEventListener("click", resetBoard);

// Ініціалізація гріду при завантаженні сторінки
document.addEventListener("DOMContentLoaded", createGrid);
