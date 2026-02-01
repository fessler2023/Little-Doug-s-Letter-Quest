const CELL_SIZE = 32;
const COLS = 10;
const ROWS = 20;

const LEFT_PANEL_WIDTH = COLS * CELL_SIZE;
const RIGHT_PANEL_WIDTH = 200;
const GAME_WIDTH = LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH;
const GAME_HEIGHT = ROWS * CELL_SIZE;

let grid = [];
let letters = [];
let currentLetter;
let nextLetter;
let cursors;
let score = 0;
let level = 1;
let dropTimer = 0;
let dropInterval = 500; // initial drop speed (ms)
let wordsCreated = [];

let scoreText, levelText, nextLetterText, wordsText;
let dictionarySet;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT + 60,
    backgroundColor: 0x000000,
    parent: 'phaser-game',
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ---------------- PRELOAD ----------------
function preload() {
    this.load.json('dictionary', 'dictionary.json'); // load external dictionary
}

// ---------------- CREATE ----------------
function create() {
    // Left panel (drop zone)
    this.add.rectangle(LEFT_PANEL_WIDTH / 2, GAME_HEIGHT / 2, LEFT_PANEL_WIDTH, GAME_HEIGHT, 0x111111).setOrigin(0.5);
    // Right panel (sidebar)
    this.add.rectangle(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, GAME_HEIGHT / 2, RIGHT_PANEL_WIDTH, GAME_HEIGHT, 0x222222).setOrigin(0.5);

    // Title
    this.add.text(GAME_WIDTH / 2, 10, "Little Doug’s Letter Quest", { font: "20px Courier", fill: "#fff" }).setOrigin(0.5, 0);

    // Sidebar
    scoreText = this.add.text(LEFT_PANEL_WIDTH + 10, 50, "Score: 0", { font: "16px Courier", fill: "#fff" });
    levelText = this.add.text(LEFT_PANEL_WIDTH + 10, 80, "Level: 1", { font: "16px Courier", fill: "#fff" });
    nextLetterText = this.add.text(LEFT_PANEL_WIDTH + 10, 110, "Next: ?", { font: "16px Courier", fill: "#fff" });
    wordsText = this.add.text(LEFT_PANEL_WIDTH + 10, 150, "Words:\n", { font: "16px Courier", fill: "#fff" });

    // Empty grid
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) {
            grid[r][c] = null;
        }
    }

    cursors = this.input.keyboard.createCursorKeys();

    // Load dictionary into a Set
    const dictionaryArray = this.cache.json.get('dictionary');
    dictionarySet = new Set(dictionaryArray);

    nextLetter = getRandomLetter();
    spawnLetter(this);

    // Draw grid lines
    this.gridGraphics = this.add.graphics();
    drawGrid(this.gridGraphics);
}

// ---------------- GRID ----------------
function drawGrid(graphics) {
    graphics.clear();
    graphics.lineStyle(1, 0x555555);
    for (let r = 0; r <= ROWS; r++) {
        graphics.moveTo(0, r * CELL_SIZE);
        graphics.lineTo(LEFT_PANEL_WIDTH, r * CELL_SIZE);
    }
    for (let c = 0; c <= COLS; c++) {
        graphics.moveTo(c * CELL_SIZE, 0);
        graphics.lineTo(c * CELL_SIZE, GAME_HEIGHT);
    }
    graphics.strokePath();
}

// ---------------- LETTER SPAWN ----------------
function getRandomLetter() {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function spawnLetter(scene) {
    currentLetter = scene.add.text(Math.floor(COLS / 2) * CELL_SIZE, 0, nextLetter, { font: "32px Courier", fill: "#ffff00" }).setOrigin(0);
    nextLetter = getRandomLetter();
    nextLetterText.setText("Next: " + nextLetter);

    const col = Math.floor(currentLetter.x / CELL_SIZE);
    if (grid[0][col]) {
        alert("Game Over!");
        scene.scene.restart();
        score = 0;
        level = 1;
        dropInterval = 500;
        wordsCreated = [];
    }
}

// ---------------- UPDATE LOOP ----------------
function update(time, delta) {
    if (!currentLetter) return;

    // Move left/right
    if (Phaser.Input.Keyboard.JustDown(cursors.left) && currentLetter.x >= 0) {
        currentLetter.x -= CELL_SIZE;
    }
    if (Phaser.Input.Keyboard.JustDown(cursors.right) && currentLetter.x < (COLS - 1) * CELL_SIZE) {
        currentLetter.x += CELL_SIZE;
    }

    // Move down faster
    if (cursors.down.isDown) {
        currentLetter.y += CELL_SIZE;
    }

    // Drop timer
    dropTimer += delta;
    if (dropTimer > dropInterval) {
        currentLetter.y += CELL_SIZE;
        dropTimer = 0;
    }

    // Check if landed
    const row = Math.floor(currentLetter.y / CELL_SIZE);
    const col = Math.floor(currentLetter.x / CELL_SIZE);

    if (row >= ROWS - 1 || grid[Math.min(row + 1, ROWS - 1)][col]) {
        // Clamp to bottom row if needed
        currentLetter.y = Math.min(row, ROWS - 1) * CELL_SIZE;

        grid[Math.floor(currentLetter.y / CELL_SIZE)][col] = currentLetter.text;
        letters.push(currentLetter);
        currentLetter = null;

        checkWords(scene);
        spawnLetter(scene);
        updateLevel();
    }

    drawLetters();
}

// ---------------- DRAW LETTERS ----------------
function drawLetters() {
    letters.forEach(l => l.setDepth(1));
}

// ---------------- OPTIMIZED WORD CHECK (HORIZONTAL + VERTICAL) ----------------
function checkWords(scene) {
    // Horizontal words
    for (let r = 0; r < ROWS; r++) {
        let rowWord = "";
        for (let c = 0; c < COLS; c++) rowWord += grid[r][c] || " ";

        for (let start = 0; start < rowWord.length; start++) {
            for (let end = start + 1; end <= rowWord.length; end++) {
                let sub = rowWord.slice(start, end).trim();
                if (dictionarySet.has(sub) && !wordsCreated.includes(sub)) {
                    // Word found horizontally
                    score += sub.length;
                    scoreText.setText("Score: " + score);

                    // Clear letters
                    for (let i = start; i < end; i++) grid[r][i] = null;
                    letters = letters.filter(l => Math.floor(l.y / CELL_SIZE) !== r);

                    wordsCreated.push(sub);
                    wordsText.setText("Words:\n" + wordsCreated.join("\n"));
                }
            }
        }
    }

    // Vertical words (top-down)
    for (let c = 0; c < COLS; c++) {
        let colWord = "";
        for (let r = 0; r < ROWS; r++) colWord += grid[r][c] || " ";

        for (let start = 0; start < colWord.length; start++) {
            for (let end = start + 1; end <= colWord.length; end++) {
                let sub = colWord.slice(start, end).trim();
                if (dictionarySet.has(sub) && !wordsCreated.includes(sub)) {
                    // Word found vertically
                    score += sub.length;
                    scoreText.setText("Score: " + score);

                    // Clear letters vertically
                    for (let i = start; i < end; i++) grid[i][c] = null;
                    letters = letters.filter(l => Math.floor(l.x / CELL_SIZE) !== c);

                    wordsCreated.push(sub);
                    wordsText.setText("Words:\n" + wordsCreated.join("\n"));
                }
            }
        }
    }
}

// ---------------- LEVELING ----------------
function updateLevel() {
    const newLevel = Math.floor(score / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelText.setText("Level: " + level);
        dropInterval = Math.max(500 - (level - 1) * 50, 100);
    }
}

