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

// ---------------- DUMMY DICTIONARY ----------------
const dictionaryArray = [
    "CAT", "DOG", "FISH", "BIRD", "TREE", "SUN", "MOON",
    "STAR", "SKY", "RAIN", "SNOW", "ICE", "FIRE", "ROCK"
];

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
    
    // --- LOAD SOUNDS ---
    this.load.audio('letterdrop', 'assets/sounds/letterdrop.wav');
    this.load.audio('wordfound', 'assets/sounds/wordfound.wav');
}

// ---------------- CREATE ----------------
function create() {

    // --- GRID PANEL ---
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

    // --- SIDEBAR ---
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
        LEFT_PANEL_WIDTH + 2, 2, RIGHT_PANEL_WIDTH - 4, GAME_HEIGHT - 4
    );

    // --- TITLE ---
    this.add.text(
        LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH / 2, 10,
        "Little Doug’s\nLetter Quest",
        { font: "32px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 2, align: 'center' }
    ).setOrigin(0.5, 0);

    // --- SCORE & LEVEL ---
    scoreText = this.add.text(LEFT_PANEL_WIDTH + 20, 90, "Score: 0",
        { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });

    levelText = this.add.text(LEFT_PANEL_WIDTH + 20, 140, "Level: 1",
        { font: "28px Courier", fill: "#00ffff", stroke: "#ff00ff", strokeThickness: 1 });

    // --- NEXT LETTER ---
    this.add.text(LEFT_PANEL_WIDTH + 20, 190, "Next:",
        { font: "28px Courier", fill: "#ffff00", stroke: "#ff00ff", strokeThickness: 1 });

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
    prepareDictionary(dictionaryArray);

    // --- SPAWN FIRST LETTER ---
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

// ---------------- SPAWN LETTER ----------------
function getRandomLetter() { return String.fromCharCode(65 + Math.floor(Math.random() * 26)); }

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

    dropTimer += delta;
    if (dropTimer > dropInterval) {
        currentLetter.y += CELL_SIZE;
        dropTimer = 0;
    }

    const row = Math.floor(currentLetter.y / CELL_SIZE);
    const col = Math.floor(currentLetter.x / CELL_SIZE);

    // --- LANDING CHECK ---
    if (row >= ROWS - 1 || grid[Math.min(row + 1, ROWS - 1)][col]) {
        const finalRow = Math.min(row, ROWS - 1);
        currentLetter.y = finalRow * CELL_SIZE;

        grid[finalRow][col] = currentLetter.text.toUpperCase();
        letters.push(currentLetter);

        // --- PLAY LETTER LAND SOUND ---
        this.sound.play('letterdrop');

        currentLetter = null;

        checkWordsOptimized(this); // scan whole grid continuously
        spawnLetter(this);
        updateLevel();
    }

    // --- CONTINUOUS WORD CHECK ---
    checkWordsOptimized(this); // optional: keeps detecting words mid-fall
}

// ---------------- DICTIONARY PREP ----------------
function prepareDictionary(dictionaryArray) {
    dictionarySet = new Set(dictionaryArray.map(w => w.toUpperCase()));
    minWordLength = Math.min(...dictionaryArray.map(w => w.length));
    maxWordLength = Math.max(...dictionaryArray.map(w => w.length));
    dictionaryByLength.clear();
    for (let word of dictionarySet) {
        const len = word.length;
        if (!dictionaryByLength.has(len)) dictionaryByLength.set(len, new Set());
        dictionaryByLength.get(len).add(word);
    }
}

// ---------------- WORD CHECK ----------------
function checkWordsOptimized(scene) {
    function flashLetter(letter) {
        scene.tweens.add({ targets: letter, alpha: 0, duration: 100, yoyo: true, repeat: 3 });
    }

    let foundWord = false;

    // --- HORIZONTAL ---
    for (let r = 0; r < ROWS; r++) {
        let rowWord = "";
        for (let c = 0; c < COLS; c++) rowWord += grid[r][c] || " ";
        for (let start = 0; start <= COLS - minWordLength; start++) {
            for (let len = minWordLength; len <= maxWordLength && start + len <= COLS; len++) {
                const sub = rowWord.slice(start, start + len).replace(/\s+/g, "");
                if (sub.length >= minWordLength && dictionaryByLength.get(len)?.has(sub) && !wordsCreated.includes(sub)) {
                    score += sub.length;
                    scoreText.setText("Score: " + score);
                    foundWord = true;
                    for (let i = start; i < start + len; i++) {
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

    // --- VERTICAL ---
    for (let c = 0; c < COLS; c++) {
        let colWord = "";
        for (let r = 0; r < ROWS; r++) colWord += grid[r][c] || " ";
        for (let start = 0; start <= ROWS - minWordLength; start++) {
            for (let len = minWordLength; len <= maxWordLength && start + len <= ROWS; len++) {
                const sub = colWord.slice(start, start + len).replace(/\s+/g, "");
                if (sub.length >= minWordLength && dictionaryByLength.get(len)?.has(sub) && !wordsCreated.includes(sub)) {
                    score += sub.length;
                    scoreText.setText("Score: " + score);
                    foundWord = true;
                    for (let r2 = start; r2 < start + len; r2++) {
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

    // --- PLAY WORD FOUND SOUND ---
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

