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
let dropInterval = 500; // initial speed
let wordsCreated = [];

let scoreText, levelText, nextLetterText, wordsText;

let dictionary = ["CAT","DOG","HELLO","WORLD","FUN","CODE"]; // sample

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT + 60, // extra for title
    backgroundColor: 0x000000,
    parent: 'phaser-game',
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload(){}

function create() {
    // Draw left panel (drop zone)
    this.add.rectangle(LEFT_PANEL_WIDTH/2, GAME_HEIGHT/2, LEFT_PANEL_WIDTH, GAME_HEIGHT, 0x111111).setOrigin(0.5);
    
    // Draw right panel (sidebar)
    this.add.rectangle(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH/2, GAME_HEIGHT/2, RIGHT_PANEL_WIDTH, GAME_HEIGHT, 0x222222).setOrigin(0.5);

    // Title
    this.add.text(GAME_WIDTH/2, 10, "Little Doug’s Letter Quest", { font: "20px Courier", fill: "#fff" }).setOrigin(0.5, 0);

    // Score / Level / Next Letter
    scoreText = this.add.text(LEFT_PANEL_WIDTH + 10, 50, "Score: 0", { font: "16px Courier", fill: "#fff" });
    levelText = this.add.text(LEFT_PANEL_WIDTH + 10, 80, "Level: 1", { font: "16px Courier", fill: "#fff" });
    nextLetterText = this.add.text(LEFT_PANEL_WIDTH + 10, 110, "Next: ?", { font: "16px Courier", fill: "#fff" });
    wordsText = this.add.text(LEFT_PANEL_WIDTH + 10, 150, "Words:\n", { font: "16px Courier", fill: "#fff" });

    // Initialize empty grid
    for(let r=0; r<ROWS; r++){
        grid[r] = [];
        for(let c=0; c<COLS; c++){
            grid[r][c] = null;
        }
    }

    cursors = this.input.keyboard.createCursorKeys();

    nextLetter = getRandomLetter();
    spawnLetter(this);
}

function getRandomLetter() {
    return String.fromCharCode(65 + Math.floor(Math.random()*26));
}

function spawnLetter(scene){
    currentLetter = scene.add.text(Math.floor(COLS/2)*CELL_SIZE, 0, nextLetter, { font: "32px Courier", fill: "#fff" }).setOrigin(0);
    nextLetter = getRandomLetter();
    nextLetterText.setText("Next: " + nextLetter);

    // Check for game over
    const col = Math.floor(currentLetter.x / CELL_SIZE);
    if(grid[0][col]){
        alert("Game Over!");
        scene.scene.restart();
        score = 0;
        level = 1;
        wordsCreated = [];
    }
}

function update(time, delta){
    if(!currentLetter) return;

    // Move left/right
    if(Phaser.Input.Keyboard.JustDown(cursors.left) && currentLetter.x >= 0){
        currentLetter.x -= CELL_SIZE;
    }
    if(Phaser.Input.Keyboard.JustDown(cursors.right) && currentLetter.x < (COLS-1)*CELL_SIZE){
        currentLetter.x += CELL_SIZE;
    }

    // Move down faster
    if(cursors.down.isDown){
        currentLetter.y += CELL_SIZE;
    }

    // Drop timer
    dropTimer += delta;
    if(dropTimer > dropInterval){
        currentLetter.y += CELL_SIZE;
        dropTimer = 0;
    }

    // Check if landed
    const row = Math.floor(currentLetter.y / CELL_SIZE);
    const col = Math.floor(currentLetter.x / CELL_SIZE);

    if(row >= ROWS-1 || grid[row+1][col]){
        grid[row][col] = currentLetter.text;
        letters.push(currentLetter);
        currentLetter = null;

        checkWords(this);
        spawnLetter(this);
    }
}

function checkWords(scene){
    for(let r=0; r<ROWS; r++){
        let rowWord = "";
        for(let c=0; c<COLS; c++){
            rowWord += grid[r][c] || " ";
        }

        dictionary.forEach(word=>{
            if(rowWord.includes(word)){
                score += word.length;
                scoreText.setText("Score: " + score);

                // Clear letters
                for(let i=0;i<COLS;i++){
                    if(grid[r][i] && word.includes(grid[r][i])) grid[r][i] = null;
                }

                // Remove letters from scene
                letters = letters.filter(l=>Math.floor(l.y / CELL_SIZE) !== r);
                letters.forEach(l=>{
                    if(!l.scene) scene.add.existing(l);
                });

                wordsCreated.push(word);
                wordsText.setText("Words:\n" + wordsCreated.join("\n"));
            }
        });
    }
}

