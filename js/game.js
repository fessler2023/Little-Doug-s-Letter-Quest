const CELL_SIZE = 32;
const COLS = 10;
const ROWS = 20;

const LEFT_PANEL_WIDTH = COLS * CELL_SIZE;
const RIGHT_PANEL_WIDTH = 400;
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
let dropInterval = 500;
let wordsCreated = [];

let scoreText, levelText, nextLetterText, wordsText;
let dictionarySet;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x000000,
    parent: 'phaser-game',
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ---------------- PRELOAD ----------------
function preload() {
    this.load.json('dictionary', 'dictionary.json'); // your large dictionary JSON
    this.load.image('sidebarBg', 'assets/sidebar-bg.png'); // optional PNG for sidebar background
}

// ---------------- CREATE ----------------
function create() {
    // ---------------- GRID (LEFT PANEL) ----------------
    this.add.rectangle(LEFT_PANEL_WIDTH / 2, GAME_HEIGHT / 2, LEFT_PANEL_WIDTH, GAME_HEIGHT, 0x111111).setOrigin(0.5);
    this.gridGraphics = this.add.graphics();
    drawGrid(this.gridGraphics, 0x00ffff);

    // ---------------- SIDEBAR (RIGHT PANEL) ----------------
    this.add.rectangle(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, GAME_HEIGHT / 2, RIGHT_PANEL_WIDTH, GAME_HEIGHT, 0x222222).setOrigin(0.5);
    this.sidebarGraphics = this.add.graphics();
    this.sidebarGraphics.lineStyle(3, 0xff00ff, 1);
    this.sidebarGraphics.strokeRect(LEFT_PANEL_WIDTH + 2, 2, RIGHT_PANEL_WIDTH - 4, GAME_HEIGHT - 4);

    // ---------------- TITLE ----------------
    this.add.text(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, 10, "Little Doug’s Letter Quest", 
        { font: "36px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2 }).setOrigin(0.5, 0);

    // ---------------- SCORE, LEVEL, NEXT ----------------
    scoreText = this.add.text(LEFT_PANEL_WIDTH + 20, 60, "Score: 0", { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });
    levelText = this.add.text(LEFT_PANEL_WIDTH + 20, 110, "Level: 1", { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });
    nextLetterText = this.add.text(LEFT_PANEL_WIDTH + 20, 160, "Next: ?", { font: "28px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 1 });

    // ---------------- WORDS CREATED ----------------
    wordsText = this.add.text(LEFT_PANEL_WIDTH + 20, 220, "Words:\n", { 
        font: "24px Courier", 
        fill: "#00ff00", 
        stroke: "#00ffff",
        strokeThickness: 1,
        wordWrap: { width: RIGHT_PANEL_WIDTH - 40 } 
    });

    // ---------------- BACKGROUND IMAGE SECTION ----------------
    this.add.rectangle(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, GAME_HEIGHT - 120, RIGHT_PANEL_WIDTH - 40, 100, 0x333333).setOrigin(0.5);
    this.add.image(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, GAME_HEIGHT - 120, 'sidebarBg')
        .setDisplaySize(RIGHT_PANEL_WIDTH - 40, 100);

    // ---------------- GRID DATA ----------------
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) grid[r][c] = null;
    }

    cursors = this.input.keyboard.createCursorKeys();

    // Load dictionary
    const dictionaryArray = this.cache.json.get('dictionary');
    if (!dictionaryArray) {
        alert("Dictionary JSON not found!");
        return;
    }
    dictionarySet = new Set(dictionaryArray.map(word => word.toUpperCase()));

    // Initialize nextLetter and spawn first letter
    nextLetter = getRandomLetter();
    spawnLetter(this);
}

// ---------------- GRID LINES ----------------
function drawGrid(graphics, color=0x00ffff) {
    graphics.clear();
    graphics.lineStyle(1, color);

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

// ---------------- SPAWN LETTER ----------------
function getRandomLetter() {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function spawnLetter(scene) {
    if (!nextLetter) nextLetter = getRandomLetter(); // fallback

    currentLetter = scene.add.text(Math.floor(COLS / 2) * CELL_SIZE, 0, nextLetter, { 
        font: "32px Courier", 
        fill: "#ffff00", 
        stroke: "#ff00ff", 
        strokeThickness: 2 
    }).setOrigin(0);

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

    if (Phaser.Input.Keyboard.JustDown(cursors.left) && currentLetter.x >= 0) currentLetter.x -= CELL_SIZE;
    if (Phaser.Input.Keyboard.JustDown(cursors.right) && currentLetter.x < (COLS - 1) * CELL_SIZE) currentLetter.x += CELL_SIZE;

    if (cursors.down.isDown) currentLetter.y += CELL_SIZE;

    dropTimer += delta;
    if (dropTimer > dropInterval) {
        currentLetter.y += CELL_SIZE;
        dropTimer = 0;
    }

    const row = Math.floor(currentLetter.y / CELL_SIZE);
    const col = Math.floor(currentLetter.x / CELL_SIZE);

    if (row >= ROWS - 1 || grid[Math.min(row + 1, ROWS - 1)][col]) {
        const finalRow = Math.min(row, ROWS - 1);
        currentLetter.y = finalRow * CELL_SIZE;
        grid[finalRow][col] = currentLetter.text.toUpperCase();
        letters.push(currentLetter);
        currentLetter = null;

        checkWordsOptimized(this, finalRow, col);
        spawnLetter(this);
        updateLevel();
    }
}

// ---------------- OPTIMIZED WORD CHECK ----------------
function checkWordsOptimized(scene, rowChanged, colChanged) {
    function flashLetter(letter) {
        scene.tweens.add({
            targets: letter,
            alpha: 0,
            duration: 100,
            yoyo: true,
            repeat: 3
        });
    }

    // ---------------- HORIZONTAL ----------------
    if (rowChanged !== undefined) {
        const r = rowChanged;
        let rowWord = "";
        for (let c = 0; c < COLS; c++) rowWord += grid[r][c] || " ";

        for (let start = 0; start < COLS; start++) {
            for (let end = start + 1; end <= COLS; end++) {
                const sub = rowWord.slice(start, end).replace(/\s+/g, "");
                if (sub.length > 0 && dictionarySet.has(sub) && !wordsCreated.includes(sub)) {
                    score += sub.length;
                    scoreText.setText("Score: " + score);

                    for (let i = start; i < end; i++) {
                        letters.forEach(l => {
                            if (Math.floor(l.y / CELL_SIZE) === r && Math.floor(l.x / CELL_SIZE) === i) flashLetter(l);
                        });
                        grid[r][i] = null;
                    }

                    wordsCreated.push(sub);
                    wordsText.setText("Words:\n" + wordsCreated.join("\n"));
                }
            }
        }
    }

    // ---------------- VERTICAL ----------------
    if (colChanged !== undefined) {
        const c = colChanged;
        let colWord = "";
        for (let r = 0; r < ROWS; r++) colWord += grid[r][c] || " ";

        for (let start = 0; start < ROWS; start++) {
            for (let end = start + 1; end <= ROWS; end++) {
                const sub = colWord.slice(start, end).replace(/\s+/g, "");
                if (sub.length > 0 && dictionarySet.has(sub) && !wordsCreated.includes(sub)) {
                    score += sub.length;
                    scoreText.setText("Score: " + score);

                    for (let r2 = start; r2 < end; r2++) {
                        letters.forEach(l => {
                            if (Math.floor(l.x / CELL_SIZE) === c && Math.floor(l.y / CELL_SIZE) === r2) flashLetter(l);
                        });
                        grid[r2][c] = null;
                    }

                    wordsCreated.push(sub);
                    wordsText.setText("Words:\n" + wordsCreated.join("\n"));
                }
            }
        }
    }
}

// ---------------- LEVEL ----------------
function updateLevel() {
    const newLevel = Math.floor(score / 10) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelText.setText("Level: " + level);
        dropInterval = Math.max(500 - (level - 1) * 50, 100);
    }
}

