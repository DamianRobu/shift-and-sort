window.gameSettings = {
    sfx: true,
    music: true
};

// audio synth stuff
class SoundManager {
    constructor() {
        this.ctx = null;
        this.bgMusicTimer = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, gainVal = 0.1) {
        if (!window.gameSettings.sfx) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playCorrect() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.playTone(523.25, 'sine', 0.1, 0.15);
        setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.15), 60);
    }

    playLifeUp() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.playTone(523.25, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.2), 80);
        setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.2), 160);
    }

    playWrong() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.playTone(180, 'sawtooth', 0.25, 0.2);
    }

    playChange() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.playTone(300, 'triangle', 0.4, 0.15);
        setTimeout(() => this.playTone(450, 'triangle', 0.3, 0.15), 100);
    }

    playClick() {
        this.playTone(800, 'sine', 0.05, 0.1);
    }

    startMusic() {
        if (this.bgMusicTimer) return;
        let noteIndex = 0;
        const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 329.63];
        this.bgMusicTimer = setInterval(() => {
            if (window.gameSettings.music) {
                this.init();
                this.playTone(notes[noteIndex], 'sine', 0.2, 0.03);
                noteIndex = (noteIndex + 1) % notes.length;
            }
        }, 400);
    }

    stopMusic() {
        if (this.bgMusicTimer) {
            clearInterval(this.bgMusicTimer);
            this.bgMusicTimer = null;
        }
    }
}

const sounds = new SoundManager();

// main menu
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;
        sounds.startMusic();

        const savedHighScore = localStorage.getItem('shift_sort_highscore') || 0;

        // floating bg shapes
        this.bgItems = [];
        for (let i = 0; i < 8; i++) {
            let x = Phaser.Math.Between(50, width - 50);
            let y = Phaser.Math.Between(50, height - 50);
            let isCircle = Phaser.Math.Between(0, 1) === 0;
            let isRed = Phaser.Math.Between(0, 1) === 0;
            let shape = isCircle 
                ? this.add.circle(x, y, 25, isRed ? 0xFF5555 : 0x5555FF, 0.3)
                : this.add.rectangle(x, y, 45, 45, isRed ? 0xFF5555 : 0x5555FF, 0.3);
            
            shape.setStrokeStyle(3, 0x000000, 0.3);
            shape.speedY = Phaser.Math.FloatBetween(0.3, 0.8);
            this.bgItems.push(shape);
        }

        const titleText = this.add.text(width / 2, 120, 'SHIFT &\nSORT', {
            fontFamily: '"Fredoka One", cursive',
            fontSize: '50px',
            fill: '#FFD700',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: titleText,
            scale: 1.05,
            duration: 800,
            yoyo: true,
            loop: -1
        });

        this.add.text(width / 2, 220, `BEST SCORE: ${savedHighScore}`, {
            fontFamily: '"Fredoka One", cursive',
            fontSize: '20px',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.createButton(width / 2, 290, 'PLAY!', 0xFF7F50, () => {
            sounds.playClick();
            this.scene.start('GameScene');
        });

        this.createButton(width / 2, 370, 'RULES', 0x4CAF50, () => {
            sounds.playClick();
            this.showRulesModal();
        });

        this.createButton(width / 2, 450, 'SETTINGS', 0x2196F3, () => {
            sounds.playClick();
            this.showSettingsModal();
        });
    }

    createButton(x, y, label, color, callback) {
        const btnBg = this.add.rectangle(x, y, 220, 55, color)
            .setStrokeStyle(4, 0x000000)
            .setInteractive({ useHandCursor: true });

        const btnText = this.add.text(x, y, label, {
            fontFamily: '"Fredoka One", cursive',
            fontSize: '28px',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setScale(1.05));
        btnBg.on('pointerout', () => btnBg.setScale(1.0));
        btnBg.on('pointerdown', callback);
    }

    showRulesModal() {
        const { width, height } = this.scale;
        const modalGroup = this.add.group();

        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7).setInteractive();
        const box = this.add.rectangle(width/2, height/2, 340, 420, 0x1A1A1A).setStrokeStyle(4, 0xFFD700);
        
        const title = this.add.text(width/2, height/2 - 170, 'HOW TO PLAY', {
            fontFamily: '"Fredoka One", cursive', fontSize: '26px', fill: '#FFD700'
        }).setOrigin(0.5);

        const rulesContent = 
            "1. You start with 3 LIVES (♥ ♥ ♥).\n\n" +
            "2. Sort incoming items based on the active RULE on top.\n\n" +
            "3. Gain +1 LIFE every 100 PTS!\n\n" +
            "4. Watch out for 'CHANGE!!!' - it swaps the controls randomly!\n\n" +
            "5. Lose all lives = GAME OVER.";

        const body = this.add.text(width/2, height/2 - 20, rulesContent, {
            fontFamily: '"Fredoka One", cursive', fontSize: '15px', fill: '#FFFFFF', align: 'left', wordWrap: { width: 300 }
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(width/2, height/2 + 160, 140, 45, 0xFF5555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(width/2, height/2 + 160, 'CLOSE', {
            fontFamily: '"Fredoka One", cursive', fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => {
            sounds.playClick();
            modalGroup.destroy(true);
        });

        modalGroup.addMultiple([overlay, box, title, body, closeBtn, closeText]);
    }

    showSettingsModal() {
        const { width, height } = this.scale;
        const modalGroup = this.add.group();

        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7).setInteractive();
        const box = this.add.rectangle(width/2, height/2, 320, 320, 0x1A1A1A).setStrokeStyle(4, 0x2196F3);
        
        const title = this.add.text(width/2, height/2 - 120, 'SETTINGS', {
            fontFamily: '"Fredoka One", cursive', fontSize: '28px', fill: '#2196F3'
        }).setOrigin(0.5);

        const sfxBtn = this.add.rectangle(width/2, height/2 - 40, 240, 45, window.gameSettings.sfx ? 0x4CAF50 : 0x555555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true });
        const sfxText = this.add.text(width/2, height/2 - 40, `SFX: ${window.gameSettings.sfx ? 'ON' : 'OFF'}`, {
            fontFamily: '"Fredoka One", cursive', fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5);

        sfxBtn.on('pointerdown', () => {
            window.gameSettings.sfx = !window.gameSettings.sfx;
            sfxBtn.setFillStyle(window.gameSettings.sfx ? 0x4CAF50 : 0x555555);
            sfxText.setText(`SFX: ${window.gameSettings.sfx ? 'ON' : 'OFF'}`);
            sounds.playClick();
        });

        const musicBtn = this.add.rectangle(width/2, height/2 + 25, 240, 45, window.gameSettings.music ? 0x4CAF50 : 0x555555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true });
        const musicText = this.add.text(width/2, height/2 + 25, `MUSIC: ${window.gameSettings.music ? 'ON' : 'OFF'}`, {
            fontFamily: '"Fredoka One", cursive', fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5);

        musicBtn.on('pointerdown', () => {
            window.gameSettings.music = !window.gameSettings.music;
            musicBtn.setFillStyle(window.gameSettings.music ? 0x4CAF50 : 0x555555);
            musicText.setText(`MUSIC: ${window.gameSettings.music ? 'ON' : 'OFF'}`);
            sounds.playClick();
        });

        const closeBtn = this.add.rectangle(width/2, height/2 + 110, 140, 40, 0xFF5555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(width/2, height/2 + 110, 'CLOSE', {
            fontFamily: '"Fredoka One", cursive', fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => {
            sounds.playClick();
            modalGroup.destroy(true);
        });

        modalGroup.addMultiple([overlay, box, title, sfxBtn, sfxText, musicBtn, musicText, closeBtn, closeText]);
    }

    update() {
        this.bgItems.forEach(item => {
            item.y += item.speedY;
            if (item.y > 650) item.y = -30;
        });
    }
}

// gameplay scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.currentRule = 'COLOR'; 
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('shift_sort_highscore') || '0', 10);
        this.isNewRecord = false;

        this.lives = 3;
        this.maxLives = 3;
        this.lastHeartMilestone = 0;

        this.currentSpeedMultiplier = 1.0;
        this.baseVelocity = 200;
        this.spawnDelay = 1500;
        this.isChanging = false;
        this.isGameOver = false;

        this.leftMapping = { color: 'RED', shape: 'CIRCLE' };
        this.rightMapping = { color: 'BLUE', shape: 'SQUARE' };
        this.activeItems = [];

        const textStyle = { fontFamily: '"Fredoka One", cursive', fontSize: '22px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4 };

        // ui top
        this.scoreText = this.add.text(15, 15, 'SCORE: 0', textStyle).setDepth(100);
        this.highScoreText = this.add.text(15, 43, `BEST: ${this.highScore}`, { 
            ...textStyle, fontSize: '18px', fill: '#FFD700' 
        }).setDepth(100);

        this.livesText = this.add.text(385, 15, '♥ ♥ ♥', { 
            fontFamily: '"Fredoka One", cursive', fontSize: '24px', fill: '#FF5555', stroke: '#000000', strokeThickness: 4 
        }).setOrigin(1, 0).setDepth(100);

        this.speedText = this.add.text(385, 45, 'SPEED: x1.0', { ...textStyle, fill: '#FF7F50', align: 'right' }).setOrigin(1, 0).setDepth(100);

        this.ruleText = this.add.text(200, 95, 'RULE: COLOR', { ...textStyle, fontSize: '32px', fill: '#FFD700' }).setOrigin(0.5).setDepth(100);

        const finishLine = this.add.graphics();
        finishLine.lineStyle(4, 0x000000, 0.4);
        finishLine.lineBetween(40, 470, 360, 470);

        // touch buttons
        this.leftTouchZone = this.add.rectangle(100, 535, 180, 110, 0x1A1A1A, 0.85)
            .setStrokeStyle(4, 0x000000)
            .setDepth(100)
            .setInteractive({ useHandCursor: true });

        this.rightTouchZone = this.add.rectangle(300, 535, 180, 110, 0x1A1A1A, 0.85)
            .setStrokeStyle(4, 0x000000)
            .setDepth(100)
            .setInteractive({ useHandCursor: true });

        this.leftTouchZone.on('pointerdown', () => this.handleSort('LEFT'));
        this.rightTouchZone.on('pointerdown', () => this.handleSort('RIGHT'));

        this.leftTitle = this.add.text(100, 495, '<- LEFT', { ...textStyle, fontSize: '16px', fill: '#AAAAAA' }).setOrigin(0.5).setDepth(101);
        this.leftColorText = this.add.text(100, 520, 'RED', { ...textStyle, fontSize: '20px', fill: '#FF5555' }).setOrigin(0.5).setDepth(101);
        this.leftShapeText = this.add.text(100, 545, 'CIRCLE', { ...textStyle, fontSize: '16px', fill: '#FFFFFF' }).setOrigin(0.5).setDepth(101);

        this.rightTitle = this.add.text(300, 495, 'RIGHT ->', { ...textStyle, fontSize: '16px', fill: '#AAAAAA' }).setOrigin(0.5).setDepth(101);
        this.rightColorText = this.add.text(300, 520, 'BLUE', { ...textStyle, fontSize: '20px', fill: '#5555FF' }).setOrigin(0.5).setDepth(101);
        this.rightShapeText = this.add.text(300, 545, 'SQUARE', { ...textStyle, fontSize: '16px', fill: '#FFFFFF' }).setOrigin(0.5).setDepth(101);

        this.changeText = this.add.text(200, 280, 'CHANGE!!!', { ...textStyle, fontSize: '60px', fill: '#FF0000', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0).setDepth(200);

        // keys
        this.input.keyboard.on('keydown-LEFT', () => this.handleSort('LEFT'));
        this.input.keyboard.on('keydown-RIGHT', () => this.handleSort('RIGHT'));

        this.spawnTimer = this.time.addEvent({ delay: this.spawnDelay, callback: () => this.spawnItem(), loop: true });
        this.ruleTimer = this.time.addEvent({ delay: 6000, callback: this.toggleRule, callbackScope: this, loop: true });

        this.scheduleNextChangeEvent();
        this.spawnItem();
    }

    updateLivesDisplay() {
        let heartsStr = '';
        for (let i = 0; i < this.lives; i++) {
            heartsStr += '♥ ';
        }
        this.livesText.setText(heartsStr.trim());
    }

    spawnItem() {
        if (this.isChanging || this.isGameOver) return;

        const isRed = Phaser.Math.Between(0, 1) === 0;
        const isCircle = Phaser.Math.Between(0, 1) === 0;
        const colorHex = isRed ? 0xFF5555 : 0x5555FF;

        let item = isCircle ? this.add.circle(200, 130, 40, colorHex) : this.add.rectangle(200, 130, 75, 75, colorHex);

        item.setStrokeStyle(4, 0x000000);
        item.setDepth(10);
        this.physics.add.existing(item);
        
        item.itemProps = {
            color: isRed ? 'RED' : 'BLUE',
            shape: isCircle ? 'CIRCLE' : 'SQUARE'
        };

        item.scale = 0.1;
        item.body.setVelocityY(this.baseVelocity * this.currentSpeedMultiplier);
        this.activeItems.push(item);
    }

    handleSort(direction) {
        if (this.activeItems.length === 0 || this.isChanging || this.isGameOver) return;

        const currentItem = this.activeItems[0];
        let isCorrect = false;
        let targetMapping = direction === 'LEFT' ? this.leftMapping : this.rightMapping;

        if (this.currentRule === 'COLOR') {
            if (currentItem.itemProps.color === targetMapping.color) isCorrect = true;
        } else {
            if (currentItem.itemProps.shape === targetMapping.shape) isCorrect = true;
        }

        if (isCorrect) {
            sounds.playCorrect();
            this.score += 10;
            this.scoreText.setText(`SCORE: ${this.score}`);

            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.isNewRecord = true;
                localStorage.setItem('shift_sort_highscore', this.highScore);
                this.highScoreText.setText(`BEST: ${this.highScore}`);
            }

            // extra life every 100pts
            let currentMilestone = Math.floor(this.score / 100);
            if (currentMilestone > this.lastHeartMilestone) {
                this.lastHeartMilestone = currentMilestone;
                if (this.lives < this.maxLives) {
                    this.lives++;
                    this.updateLivesDisplay();
                    sounds.playLifeUp();
                    this.tweens.add({ targets: this.livesText, scale: 1.4, duration: 150, yoyo: true });
                }
            }
            
            this.currentSpeedMultiplier = Math.min(4.0, 1.0 + (this.score / 250));
            this.speedText.setText(`SPEED: x${this.currentSpeedMultiplier.toFixed(1)}`);
            this.spawnTimer.delay = Math.max(350, 1500 / this.currentSpeedMultiplier);

            this.tweens.add({
                targets: currentItem,
                x: direction === 'LEFT' ? -100 : 500,
                angle: direction === 'LEFT' ? -180 : 180,
                scale: 0,
                duration: 220,
                onComplete: () => currentItem.destroy()
            });
        } else {
            this.loseLife();

            this.tweens.add({
                targets: currentItem,
                y: 500,
                alpha: 0,
                duration: 200,
                onComplete: () => currentItem.destroy()
            });
        }

        this.activeItems.shift();
    }

    loseLife() {
        if (this.isGameOver) return;

        this.lives--;
        this.updateLivesDisplay();
        sounds.playWrong();
        this.cameras.main.shake(150, 0.02);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    toggleRule() {
        if (this.isChanging || this.isGameOver) return;
        this.currentRule = this.currentRule === 'COLOR' ? 'SHAPE' : 'COLOR';
        this.ruleText.setText(`RULE: ${this.currentRule}`);
        this.ruleText.setColor(this.currentRule === 'COLOR' ? '#FFD700' : '#00FFFF');
        
        this.tweens.add({ targets: this.ruleText, scale: 1.3, duration: 150, yoyo: true });
    }

    scheduleNextChangeEvent() {
        if (this.isGameOver) return;
        const randomDelay = Phaser.Math.Between(15000, 22000);
        
        this.changeEventTimer = this.time.addEvent({
            delay: randomDelay,
            callback: () => {
                if (this.isGameOver) return;
                this.isChanging = true;
                sounds.playChange();

                this.activeItems.forEach(item => {
                    if (item.body) item.body.setVelocityY((this.baseVelocity * this.currentSpeedMultiplier) * 0.1);
                });
                this.cameras.main.shake(300, 0.015);

                this.tweens.add({
                    targets: this.changeText,
                    alpha: 1, scale: { from: 0.5, to: 1.2 },
                    duration: 400, yoyo: true, hold: 1000,
                    onComplete: () => {
                        this.swapMappings();
                        
                        this.activeItems.forEach(item => {
                            if (item.body) item.body.setVelocityY(this.baseVelocity * this.currentSpeedMultiplier);
                        });
                        
                        this.isChanging = false;
                        this.scheduleNextChangeEvent();
                    }
                });
            }
        });
    }

    swapMappings() {
        let temp = { ...this.leftMapping };
        this.leftMapping = { ...this.rightMapping };
        this.rightMapping = temp;

        this.leftColorText.setText(this.leftMapping.color);
        this.leftColorText.setColor(this.leftMapping.color === 'RED' ? '#FF5555' : '#5555FF');
        this.leftShapeText.setText(this.leftMapping.shape);

        this.rightColorText.setText(this.rightMapping.color);
        this.rightColorText.setColor(this.rightMapping.color === 'RED' ? '#FF5555' : '#5555FF');
        this.rightShapeText.setText(this.rightMapping.shape);
    }

    update() {
        this.activeItems.forEach(item => {
            let newScale = Phaser.Math.Linear(0.1, 1.2, (item.y - 130) / 330);
            item.scale = Phaser.Math.Clamp(newScale, 0.1, 1.2);
        });

        if (this.activeItems.length > 0 && this.activeItems[0].y > 470 && !this.isChanging && !this.isGameOver) {
            const missedItem = this.activeItems.shift();
            missedItem.destroy();
            this.loseLife();
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.physics.pause();
        this.spawnTimer.remove(); this.ruleTimer.remove(); 
        if (this.changeEventTimer) this.changeEventTimer.remove();

        const { width, height } = this.scale;

        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8).setDepth(300).setInteractive();
        this.add.rectangle(width/2, height/2, 320, 380, 0x1A1A1A).setStrokeStyle(5, 0xFF5555).setDepth(301);

        this.add.text(width/2, height/2 - 120, 'GAME OVER', {
            fontFamily: '"Fredoka One", cursive', fontSize: '38px', fill: '#FF5555', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(302);

        if (this.isNewRecord) {
            const newRecordText = this.add.text(width/2, height/2 - 70, '🎉 NEW RECORD! 🎉', {
                fontFamily: '"Fredoka One", cursive', fontSize: '20px', fill: '#FFD700', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(302);

            this.tweens.add({
                targets: newRecordText,
                scale: 1.1,
                duration: 400,
                yoyo: true,
                loop: -1
            });
        }

        this.add.text(width/2, height/2 - 20, `SCORE: ${this.score}\nBEST: ${this.highScore}`, {
            fontFamily: '"Fredoka One", cursive', fontSize: '24px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5, align: 'center'
        }).setOrigin(0.5).setDepth(302);

        const createGameOverBtn = (y, label, color, callback) => {
            const btnBg = this.add.rectangle(width/2, y, 220, 50, color)
                .setStrokeStyle(4, 0x000000).setDepth(302).setInteractive({ useHandCursor: true });
            
            const btnText = this.add.text(width/2, y, label, {
                fontFamily: '"Fredoka One", cursive', fontSize: '24px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(303);

            btnBg.on('pointerover', () => { btnBg.setScale(1.05); btnText.setScale(1.05); });
            btnBg.on('pointerout', () => { btnBg.setScale(1.0); btnText.setScale(1.0); });
            btnBg.on('pointerdown', callback);
        };

        createGameOverBtn(height/2 + 55, 'TRY AGAIN', 0x4CAF50, () => {
            sounds.playClick();
            this.scene.restart();
        });

        createGameOverBtn(height/2 + 120, 'MENU', 0x2196F3, () => {
            sounds.playClick();
            this.scene.start('MenuScene');
        });
    }
}

// phaser config
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#6BD4E7',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
    },
    scene: [MenuScene, GameScene]
};

const game = new Phaser.Game(config);