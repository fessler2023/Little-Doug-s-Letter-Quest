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

let scoreText, levelText, nextLetterDisplay, wordsText;
let dictionarySet;
let dictionaryByLength = new Map();
let minWordLength = 3;
let maxWordLength = 7;

// ---------------- PHASER CONFIG ----------------
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'phaser-game',
    backgroundColor: 0x000000,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
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
function create() {
    // --- LEFT PANEL (GRID) ---
    this.add.rectangle(
        LEFT_PANEL_WIDTH / 2,
        GAME_HEIGHT / 2,
        LEFT_PANEL_WIDTH,
        GAME_HEIGHT,
        0x111111
    ).setOrigin(0.5);

    this.gridGraphics = this.add.graphics();
    drawGrid(this.gridGraphics, 0x00ffff);
    this.gridGraphics.lineStyle(3, 0xff00ff, 1);
    this.gridGraphics.strokeRect(0, 0, LEFT_PANEL_WIDTH, GAME_HEIGHT);

    // --- RIGHT PANEL (SIDEBAR) ---
    this.add.rectangle(
        LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2,
        GAME_HEIGHT / 2,
        RIGHT_PANEL_WIDTH,
        GAME_HEIGHT,
        0x222222
    ).setOrigin(0.5);

    this.sidebarGraphics = this.add.graphics();
    this.sidebarGraphics.lineStyle(3, 0xff00ff, 1);
    this.sidebarGraphics.strokeRect(LEFT_PANEL_WIDTH + 2, 2, RIGHT_PANEL_WIDTH - 4, GAME_HEIGHT - 4);

    // --- TITLE ---
    this.add.text(
        LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2,
        10,
        "Little Doug’s\nLetter Quest",
        { font: "32px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2, align: 'center' }
    ).setOrigin(0.5, 0);

    // --- SCORE & LEVEL ---
    scoreText = this.add.text(LEFT_PANEL_WIDTH + 20, 90, "Score: 0", { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });
    levelText = this.add.text(LEFT_PANEL_WIDTH + 20, 140, "Level: 1", { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });

    // --- NEXT LETTER ---
    this.add.text(LEFT_PANEL_WIDTH + 20, 190, "Next:", { font: "28px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 1 });
    const nextBox = this.add.rectangle(LEFT_PANEL_WIDTH + 140, 210, 50, 50, 0x000000).setStrokeStyle(2, 0xffff00);
    nextLetterDisplay = this.add.text(nextBox.x, nextBox.y, "?", { font: "32px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2 }).setOrigin(0.5);

    // --- WORDS CREATED ---
    wordsText = this.add.text(LEFT_PANEL_WIDTH + 20, 270, "Words:\n", {
        font: "26px Courier", fill: "#00ff00", stroke: "#00ffff", strokeThickness: 1,
        wordWrap: { width: RIGHT_PANEL_WIDTH - 40 }
    });

    // --- BACKGROUND IMAGE ---
    const bgImage = this.add.image(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, GAME_HEIGHT - 120, 'sidebarBg');
    const scaleX = (RIGHT_PANEL_WIDTH - 40) / bgImage.width;
    const scaleY = 100 / bgImage.height;
    bgImage.setScale(Math.min(scaleX, scaleY));

    // --- GRID DATA ---
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) grid[r][c] = null;
    }

    cursors = this.input.keyboard.createCursorKeys();

    // --- DICTIONARY PREP ---
    loadDictionary().then(() => {
        // --- SPAWN FIRST LETTER ---
        nextLetter = getRandomLetter();
        spawnLetter(this);
    });
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
        minWordLength = Math.min(...dictionaryArray.map(w => w.length));
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
    currentLetter = scene.add.text(Math.floor(COLS / 2) * CELL_SIZE, 0, nextLetter, { font: "32px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2 }).setOrigin(0);

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

    // --- MOVE ---
    if (Phaser.Input.Keyboard.JustDown(cursors.left)) currentLetter.x -= CELL_SIZE;
    if (Phaser.Input.Keyboard.JustDown(cursors.right)) currentLetter.x += CELL_SIZE;
    if (cursors.down.isDown) currentLetter.y += CELL_SIZE;

    // --- CLAMP TO GRID ---
    currentLetter.x = Phaser.Math.Clamp(currentLetter.x, 0, (COLS - 1) * CELL_SIZE);
    currentLetter.y = Phaser.Math.Clamp(currentLetter.y, 0, (ROWS - 1) * CELL_SIZE);

    // --- DROP TIMER ---
    dropTimer += delta;
    if (dropTimer > dropInterval) {
        currentLetter.y += CELL_SIZE;
        dropTimer = 0;
    }

    const row = Math.floor(currentLetter.y / CELL_SIZE);
    const col = Math.floor(currentLetter.x / CELL_SIZE);

    // --- LANDING ---
    if (row >= ROWS - 1 || grid[Math.min(row + 1, ROWS - 1)][col]) {
        const finalRow = Math.min(row, ROWS - 1);
        currentLetter.y = finalRow * CELL_SIZE;
        grid[finalRow][col] = currentLetter.text.toUpperCase();
        letters.push(currentLetter);

        // --- PLAY LAND SOUND ---
        this.sound.play('letterdrop');

        currentLetter = null;

        checkWordsOptimized(this);
        spawnLetter(this);
        updateLevel();
    }

    // --- CONTINUOUS WORD CHECK ---
    checkWordsOptimized(this);
}

// ---------------- WORD CHECK ----------------
function checkWordsOptimized(scene) {
    function flashLetter(letter) {
        scene.tweens.add({ targets: letter, alpha: 0, duration: 100, yoyo: true, repeat: 3 });
    }

    let foundWord = false;

    // --- HORIZONTAL SCAN ---
    for (let r = 0; r < ROWS; r++) {
        let start = 0;
        while (start < COLS) {
            while (start < COLS && !grid[r][start]) start++;
            if (start >= COLS) break;

            let end = start;
            while (end < COLS && grid[r][end]) end++;

            const sequence = [];
            for (let c = start; c < end; c++) sequence.push({ letter: grid[r][c], row: r, col: c });

            for (let len = minWordLength; len <= Math.min(maxWordLength, sequence.length); len++) {
                for (let i = 0; i <= sequence.length - len; i++) {
                    const word = sequence.slice(i, i + len).map(l => l.letter).join("");
                    if (!wordsCreated.includes(word) && dictionarySet.has(word)) {
                        score += word.length;
                        scoreText.setText("Score: " + score);
                        foundWord = true;

                        sequence.slice(i, i + len).forEach(l => {
                            letters.forEach(letterObj => {
                                if (Math.floor(letterObj.x / CELL_SIZE) === l.col && Math.floor(letterObj.y / CELL_SIZE) === l.row) flashLetter(letterObj);
                            });
                            grid[l.row][l.col] = null;
                        });

                        wordsCreated.push(word);
                        wordsText.setText("Words:\n" + wordsCreated.join("\n"));
                    }
                }
            }
            start = end;
        }
    }

    // --- VERTICAL SCAN ---
    for (let c = 0; c < COLS; c++) {
        let start = 0;
        while (start < ROWS) {
            while (start < ROWS && !grid[start][c]) start++;
            if (start >= ROWS) break;

            let end = start;
            while (end < ROWS && grid[end][c]) end++;

            const sequence = [];
            for (let r = start; r < end; r++) sequence.push({ letter: grid[r][c], row: r, col: c });

            for (let len = minWordLength; len <= Math.min(maxWordLength, sequence.length); len++) {
                for (let i = 0; i <= sequence.length - len; i++) {
                    const word = sequence.slice(i, i + len).map(l => l.letter).join("");
                    if (!wordsCreated.includes(word) && dictionarySet.has(word)) {
                        score += word.length;
                        scoreText.setText("Score: " + score);
                        foundWord = true;

                        sequence.slice(i, i + len).forEach(l => {
                            letters.forEach(letterObj => {
                                if (Math.floor(letterObj.x / CELL_SIZE) === l.col && Math.floor(letterObj.y / CELL_SIZE) === l.row) flashLetter(letterObj);
                            });
                            grid[l.row][l.col] = null;
                        });

                        wordsCreated.push(word);
                        wordsText.setText("Words:\n" + wordsCreated.join("\n"));
                    }
                }
            }
            start = end;
        }
    }

    if (foundWord) scene.sound.play('wordfound');
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
