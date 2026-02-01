const config = {
    type: Phaser.AUTO,
    width: 320,
    height: 640,
    backgroundColor: '#222',
    parent: 'phaser-game',
    physics: { default: 'arcade' },
    scene: { preload, create, update }
};

const CELL_SIZE = 32;
const COLS = 10;
const ROWS = 20;

let grid = [];
let letters = [];
let currentLetter;
let cursors;
let score = 0;
let scoreText;
let dictionary = ["CAT","DOG","HELLO","WORLD","FUN","CODE"]; // sample words
let dropTimer = 0;
let dropInterval = 500;

const game = new Phaser.Game(config);

function preload() {}

function create() {
    // Title Text
    this.add.text(20, 20, "Little Doug’s Letter Quest", { font: "20px Arial", fill: "#fff" });

    // Score Text
    scoreText = this.add.text(10, 50, "Score: 0", { font: "16px Arial", fill: "#fff" });

    // Initialize grid
    for(let r = 0; r < ROWS; r++){
        grid[r] = [];
        for(let c = 0; c < COLS; c++){
            grid[r][c] = null;
        }
    }

    cursors = this.input.keyboard.createCursorKeys();
    spawnLetter(this);
}

function spawnLetter(scene){
    const letter = String.fromCharCode(65 + Math.floor(Math.random()*26));
    const x = Math.floor(COLS/2) * CELL_SIZE;
    const y = 0;

    currentLetter = scene.add.text(x, y, letter, { font: "32px Arial", fill: "#fff" });
    currentLetter.setOrigin(0);
}

function update(time, delta){
    if(!currentLetter) return;

    // Move left/right
    if(Phaser.Input.Keyboard.JustDown(cursors.left) && currentLetter.x >= CELL_SIZE){
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
        // Lock letter
        grid[row][col] = currentLetter.text;
        letters.push(currentLetter);
        currentLetter = null;

        checkWords(this);
        spawnLetter(this);
    }
}

function checkWords(scene){
    for(let r = 0; r < ROWS; r++){
        let rowWord = "";
        for(let c = 0; c < COLS; c++){
            rowWord += grid[r][c] || " ";
        }

        dictionary.forEach(word => {
            if(rowWord.includes(word)){
                score += word.length;
                scoreText.setText("Score: " + score);

                // Clear letters
                for(let i = 0; i < COLS; i++){
                    if(grid[r][i] && word.includes(grid[r][i])){
                        grid[r][i] = null;
                    }
                }

                // Remove letters from scene
                letters = letters.filter(l => Math.floor(l.y / CELL_SIZE) !== r);
                letters.forEach(l => {
                    if(!l.scene) scene.add.existing(l); // ensure remaining letters stay
                });
            }
        });
    }
}
