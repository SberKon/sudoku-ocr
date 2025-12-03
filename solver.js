function solveSudoku(board) {
    function valid(r, c, num) {
        for (let i = 0; i < 9; i++) {
            if (board[r][i] == num) return false;
            if (board[i][c] == num) return false;
        }
        let br = Math.floor(r / 3) * 3;
        let bc = Math.floor(c / 3) * 3;
        for (let i = br; i < br + 3; i++) {
            for (let j = bc; j < bc + 3; j++) {
                if (board[i][j] == num) return false;
            }
        }
        return true;
    }

    function solve() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (valid(r, c, num)) {
                            board[r][c] = num;
                            if (solve()) return true;
                            board[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    solve();
    return board;
}
