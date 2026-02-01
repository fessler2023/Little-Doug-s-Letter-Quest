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

// Weighted letters (feels better)
const LETTER_POOL =
"EEEEEEEEAAAAAAAIIIIIOOOOONNNNRRRRTTTTLLLLSSSSDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x000000,
    parent: 'phaser-game',
    scene: { preload, create, update }
};

new Phaser.Game(config);

// ---------------- PRELOAD ----------------
function preload() {
    this.load.image('sidebarBg', 'assets/sidebar-bg.png');
}

// ---------------- CREATE ----------------
async function create() {

    this.add.rectangle(LEFT_PANEL_WIDTH/2, GAME_HEIGHT/2,
        LEFT_PANEL_WIDTH, GAME_HEIGHT, 0x111111);

    this.gridGraphics = this.add.graphics();
    drawGrid(this.gridGraphics);

    this.add.rectangle(LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH/2,
        GAME_HEIGHT/2, RIGHT_PANEL_WIDTH, GAME_HEIGHT, 0x222222);

    scoreText = this.add.text(LEFT_PANEL_WIDTH+20,60,"Score: 0",{font:"24px Courier",fill:"#00ffff"});
    levelText = this.add.text(LEFT_PANEL_WIDTH+20,100,"Level: 1",{font:"24px Courier",fill:"#00ffff"});

    nextLetterDisplay = this.add.text(LEFT_PANEL_WIDTH+140,160,"?",{font:"32px Courier",fill:"#ffff00"});

    wordsText = this.add.text(LEFT_PANEL_WIDTH+20,220,"Words:\n",{font:"20px Courier",fill:"#00ff00"});

    for(let r=0;r<ROWS;r++){
        grid[r]=[];
        for(let c=0;c<COLS;c++) grid[r][c]=null;
    }

    cursors=this.input.keyboard.createCursorKeys();

    await loadDictionary();

    nextLetter=getRandomLetter();
    spawnLetter(this);
}

// ---------------- GRID DRAW ----------------
function drawGrid(g){
    g.lineStyle(1,0x00ffff);
    for(let r=0;r<=ROWS;r++){
        g.moveTo(0,r*CELL_SIZE);
        g.lineTo(LEFT_PANEL_WIDTH,r*CELL_SIZE);
    }
    for(let c=0;c<=COLS;c++){
        g.moveTo(c*CELL_SIZE,0);
        g.lineTo(c*CELL_SIZE,GAME_HEIGHT);
    }
    g.strokePath();
}

// ---------------- DICTIONARY ----------------
async function loadDictionary(){
    const res=await fetch('./js/dictionary.json');
    const arr=await res.json();

    dictionarySet=new Set(arr.map(w=>w.toUpperCase()));

    dictionaryByLength.clear();
    arr.forEach(w=>{
        const word=w.toUpperCase();
        const len=word.length;
        if(!dictionaryByLength.has(len)) dictionaryByLength.set(len,new Set());
        dictionaryByLength.get(len).add(word);
    });

    minWordLength=Math.min(...arr.map(w=>w.length));
    maxWordLength=Math.max(...arr.map(w=>w.length));
}

// ---------------- LETTERS ----------------
function getRandomLetter(){
    return LETTER_POOL[Math.floor(Math.random()*LETTER_POOL.length)];
}

function spawnLetter(scene){

    currentLetter=scene.add.text(
        Math.floor(COLS/2)*CELL_SIZE,0,nextLetter,
        {font:"32px Courier",fill:"#ffff00"}
    ).setOrigin(0);

    nextLetter=getRandomLetter();
    nextLetterDisplay.setText(nextLetter);
}

// ---------------- UPDATE ----------------
function update(time,delta){

    if(!currentLetter) return;

    const col=Math.floor(currentLetter.x/CELL_SIZE);

    if(Phaser.Input.Keyboard.JustDown(cursors.left)&&col>0)
        currentLetter.x-=CELL_SIZE;

    if(Phaser.Input.Keyboard.JustDown(cursors.right)&&col<COLS-1)
        currentLetter.x+=CELL_SIZE;

    if(cursors.down.isDown)
        currentLetter.y+=CELL_SIZE;

    dropTimer+=delta;
    if(dropTimer>dropInterval){
        currentLetter.y+=CELL_SIZE;
        dropTimer=0;
    }

    const row=Math.floor(currentLetter.y/CELL_SIZE);

    if(row>=ROWS-1 || grid[row+1]?.[col]){
        lockLetter(this,row,col);
    }
}

// ---------------- LOCK ----------------
function lockLetter(scene,row,col){

    const finalRow=Math.min(row,ROWS-1);

    currentLetter.y=finalRow*CELL_SIZE;
    grid[finalRow][col]=currentLetter.text;

    letters.push(currentLetter);
    currentLetter=null;

    checkWords(scene,finalRow,col);
    spawnLetter(scene);
    updateLevel();
}

// ---------------- WORD CHECK ----------------
function checkWords(scene,rowChanged,colChanged){

    let cleared=false;

    // HORIZONTAL
    let rowWord="";
    for(let c=0;c<COLS;c++)
        rowWord+=grid[rowChanged][c]||" ";

    for(let start=0;start<=COLS-minWordLength;start++){
        for(let len=minWordLength;len<=maxWordLength && start+len<=COLS;len++){

            const seg=rowWord.slice(start,start+len);
            if(seg.includes(" ")) continue;

            if(dictionaryByLength.get(len)?.has(seg)){
                clearCells(scene,
                    [...Array(len)].map((_,i)=>[rowChanged,start+i]));
                score+=len;
                cleared=true;
            }
        }
    }

    // VERTICAL
    let colWord="";
    for(let r=0;r<ROWS;r++)
        colWord+=grid[r][colChanged]||" ";

    for(let start=0;start<=ROWS-minWordLength;start++){
        for(let len=minWordLength;len<=maxWordLength && start+len<=ROWS;len++){

            const seg=colWord.slice(start,start+len);
            if(seg.includes(" ")) continue;

            if(dictionaryByLength.get(len)?.has(seg)){
                clearCells(scene,
                    [...Array(len)].map((_,i)=>[start+i,colChanged]));
                score+=len;
                cleared=true;
            }
        }
    }

    if(cleared){
        scoreText.setText("Score: "+score);
        applyGravity();
    }
}

// ---------------- CLEAR ----------------
function clearCells(scene,cells){

    cells.forEach(([r,c])=>{
        grid[r][c]=null;

        letters=letters.filter(l=>{
            const lr=Math.floor(l.y/CELL_SIZE);
            const lc=Math.floor(l.x/CELL_SIZE);

            if(lr===r && lc===c){
                l.destroy();
                return false;
            }
            return true;
        });
    });
}

// ---------------- GRAVITY ----------------
function applyGravity(){

    for(let c=0;c<COLS;c++){
        for(let r=ROWS-1;r>=0;r--){
            if(grid[r][c]===null){
                for(let r2=r-1;r2>=0;r2--){
                    if(grid[r2][c]){
                        grid[r][c]=grid[r2][c];
                        grid[r2][c]=null;

                        letters.forEach(l=>{
                            if(
                                Math.floor(l.x/CELL_SIZE)===c &&
                                Math.floor(l.y/CELL_SIZE)===r2
                            ){
                                l.y=r*CELL_SIZE;
                            }
                        });
                        break;
                    }
                }
            }
        }
    }
}

// ---------------- LEVEL ----------------
function updateLevel(){
    const nl=Math.floor(score/10)+1;
    if(nl>level){
        level=nl;
        levelText.setText("Level: "+level);
        dropInterval=Math.max(500-(level-1)*40,120);
    }
}

