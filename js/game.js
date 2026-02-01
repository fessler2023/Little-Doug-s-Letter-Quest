// ---------------- CONFIG ----------------
const CELL_SIZE = 32;
const COLS = 10;
const ROWS = 20;

const LEFT_PANEL_WIDTH = COLS * CELL_SIZE;
const RIGHT_PANEL_WIDTH = 450;
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

let scoreText, levelText, nextLetterDisplay, wordsText, versionText;
let dictionarySet;
let minWordLength = 3;
let maxWordLength = 7;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'phaser-game',
    backgroundColor: 0x000000,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ---------------- PRELOAD ----------------
function preload() {
    this.load.image('sidebarBg', 'assets/sidebar-bg.png');
    this.load.audio('letterdrop', 'assets/sounds/letterdrop.wav');
    this.load.audio('wordfound', 'assets/sounds/wordfound.wav');
}

// ---------------- CREATE ----------------
async function create() {
    // Grid background
    this.add.rectangle(LEFT_PANEL_WIDTH / 2, GAME_HEIGHT / 2, LEFT_PANEL_WIDTH, GAME_HEIGHT, 0x111111).setOrigin(0.5);

    this.gridGraphics = this.add.graphics();
    drawGrid(this.gridGraphics, 0x00ffff);
    this.gridGraphics.lineStyle(3, 0xff00ff, 1);
    this.gridGraphics.strokeRect(0, 0, LEFT_PANEL_WIDTH, GAME_HEIGHT);

    // Sidebar
    this.add.rectangle(
        LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2,
        GAME_HEIGHT / 2,
        RIGHT_PANEL_WIDTH,
        GAME_HEIGHT,
        0x222222
    ).setOrigin(0.5);

    this.sidebarGraphics = this.add.graphics();
    this.sidebarGraphics.lineStyle(3, 0xff00ff, 1);
    this.sidebarGraphics.strokeRect(
        LEFT_PANEL_WIDTH + 2,
        2,
        RIGHT_PANEL_WIDTH - 4,
        GAME_HEIGHT - 4
    );

    // Title
    this.add.text(
        LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2,
        10,
        "Little Doug’s\nLetter Quest",
        { font: "32px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2, align: 'center' }
    ).setOrigin(0.5, 0);

    // Score & Level
    scoreText = this.add.text(LEFT_PANEL_WIDTH + 20, 90, "Score: 0", { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });
    levelText = this.add.text(LEFT_PANEL_WIDTH + 20, 140, "Level: 1", { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });

    // Next Letter Box
    this.add.text(LEFT_PANEL_WIDTH + 20, 190, "Next:", { font: "28px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 1 });
    const nextBox = this.add.rectangle(LEFT_PANEL_WIDTH + 140, 210, 50, 50, 0x000000).setStrokeStyle(2, 0xffff00);
    nextLetterDisplay = this.add.text(nextBox.x, nextBox.y, "?", { font: "32px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2 }).setOrigin(0.5);

    // Words Created
    wordsText = this.add.text(LEFT_PANEL_WIDTH + 20, 270, "Words:\n", { font: "26px Courier", fill: "#00ff00", stroke: "#00ffff", strokeThickness: 1, wordWrap: { width: RIGHT_PANEL_WIDTH - 40 } });

    // Background image in sidebar
    const bgImage = this.add.image(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, GAME_HEIGHT - 120, 'sidebarBg');
    const bgWidth = RIGHT_PANEL_WIDTH - 40;
    const bgHeight = 100;
    const scaleX = bgWidth / bgImage.width;
    const scaleY = bgHeight / bgImage.height;
    bgImage.setScale(Math.min(scaleX, scaleY));

    // Version number
    versionText = this.add.text(
        LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH - 10,
        GAME_HEIGHT - 10,
        "V 1.0",
        { font: "16px Courier", fill: "#888888" }
    ).setOrigin(1, 1);

    // Initialize grid
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) grid[r][c] = null;
    }

    cursors = this.input.keyboard.createCursorKeys();

    // Load dictionary
    await loadDictionary();

    // Spawn first letter
    nextLetter = getRandomLetter();
    spawnLetter(this);
}

// ---------------- DRAW GRID ----------------
function drawGrid(graphics, color = 0x00ffff) {
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

// ---------------- DICTIONARY ----------------
async function loadDictionary() {
    try {
        const response = await fetch('./js/dictionary.json');
        const dictionaryArray = await response.json();
        dictionarySet = new Set(dictionaryArray.map(w => w.toUpperCase()));
        minWordLength = 3;
        maxWordLength = Math.max(...dictionaryArray.map(w => w.length));
    } catch (e) {
        alert("Failed to load dictionary: " + e);
    }
}

// ---------------- LETTER SPAWN ----------------
function getRandomLetter() {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function spawnLetter(scene) {
    if (!nextLetter) nextLetter = getRandomLetter();

    currentLetter = scene.add.text(
        Math.floor(COLS / 2) * CELL_SIZE,
        0,
        nextLetter,
        { font: "32px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2 }
    ).setOrigin(0);

    nextLetter = getRandomLetter();
    nextLetterDisplay.setText(nextLetter);

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

// ---------------- UPDATE ----------------
function update(time, delta) {
    if (!currentLetter) return;

    // ---------------- MOVEMENT ----------------
    if (Phaser.Input.Keyboard.JustDown(cursors.left)) {
        const col = Math.floor(currentLetter.x / CELL_SIZE);
        if (col > 0 && !grid[Math.floor(currentLetter.y / CELL_SIZE)][col - 1]) currentLetter.x -= CELL_SIZE;
    }
    if (Phaser.Input.Keyboard.JustDown(cursors.right)) {
        const col = Math.floor(currentLetter.x / CELL_SIZE);
        if (col < COLS - 1 && !grid[Math.floor(currentLetter.y / CELL_SIZE)][col + 1]) currentLetter.x += CELL_SIZE;
    }

    dropTimer += delta;
    if (dropTimer > dropInterval || cursors.down.isDown) {
        const row = Math.floor(currentLetter.y / CELL_SIZE);
        const col = Math.floor(currentLetter.x / CELL_SIZE);

        if (row < ROWS - 1 && !grid[row + 1][col]) {
            currentLetter.y += CELL_SIZE;
        } else {
            currentLetter.y = row * CELL_SIZE;
            grid[row][col] = currentLetter; // <-- store Phaser object instead of string
            letters.push(currentLetter);
            currentLetter = null;

            game.scene.scenes[0].sound.play('letterdrop');
            checkAllWordsWithGravityAndCombo(game.scene.scenes[0]);
            spawnLetter(game.scene.scenes[0]);
            updateLevel();
        }
        dropTimer = 0;
    }
}

// ---------------- WORD DETECTION WITH GRAVITY & COMBOS ----------------
function checkAllWordsWithGravityAndCombo(scene) {
    function flashLetter(letterObj) {
        scene.tweens.add({ targets: letterObj, alpha: 0, duration: 100, yoyo: true, repeat: 3 });
    }

    let clearedPositions = [];
    let wordsThisDrop = [];

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let cStart = 0; cStart < COLS; cStart++) {
            if (!grid[r][cStart]) continue;
            for (let len = minWordLength; len <= COLS - cStart; len++) {
                const lettersArr = [];
                for (let i = 0; i < len; i++) lettersArr.push(grid[r][cStart + i].text);
                const word = lettersArr.join("");
                if (dictionarySet.has(word) && !wordsCreated.includes(word) && !wordsThisDrop.includes(word)) {
                    wordsThisDrop.push(word);
                    for (let i = 0; i < len; i++) clearedPositions.push({ row: r, col: cStart + i });
                }
            }
        }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
        for (let rStart = 0; rStart < ROWS; rStart++) {
            if (!grid[rStart][c]) continue;
            for (let len = minWordLength; len <= ROWS - rStart; len++) {
                const lettersArr = [];
                for (let i = 0; i < len; i++) lettersArr.push(grid[rStart + i][c].text);
                const word = lettersArr.join("");
                if (dictionarySet.has(word) && !wordsCreated.includes(word) && !wordsThisDrop.includes(word)) {
                    wordsThisDrop.push(word);
                    for (let i = 0; i < len; i++) clearedPositions.push({ row: rStart + i, col: c });
                }
            }
        }
    }

    if (wordsThisDrop.length > 0) {
        let multiplier = 1 + (wordsThisDrop.length - 1) * 0.5;
        wordsThisDrop.forEach(word => {
            wordsCreated.push(word);
            score += Math.floor(word.length * multiplier);
        });

        wordsText.setText("Words:\n" + wordsCreated.join("\n"));
        scoreText.setText("Score: " + score);

        clearedPositions.forEach(pos => {
            const l = grid[pos.row][pos.col];
            if (l) flashLetter(l);
        });

        scene.sound.play('wordfound');

        setTimeout(() => {
            removeLettersAndApplyGravity(clearedPositions);
        }, 350);
    }

    function removeLettersAndApplyGravity(positions) {
        positions.forEach(pos => {
            const l = grid[pos.row][pos.col];
            if (l) {
                l.destroy();
                letters.splice(letters.indexOf(l), 1);
            }
            grid[pos.row][pos.col] = null;
        });

        // Apply gravity
        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS - 1; r >= 0; r--) {
                if (!grid[r][c]) {
                    let k = r - 1;
                    while (k >= 0 && !grid[k][c]) k--;
                    if (k >= 0) {
                        const movingLetter = grid[k][c];
                        movingLetter.y = r * CELL_SIZE;
                        grid[r][c] = movingLetter;
                        grid[k][c] = null;
                    }
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

