window.gameSettings = {
    sfx: true,
    music: true
};

// localStorage poate fi blocat in iframe-uri (portaluri de jocuri) -> folosim wrapper sigur
function safeGet(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
    } catch (e) {
        return fallback;
    }
}
function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
}

// ---------------------------------------------------------------
// audio synth
// ---------------------------------------------------------------
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
        this.tone(freq, type, duration, gainVal);
    }

    tone(freq, type, duration, gainVal) {
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

    // pitch-ul creste usor cu combo-ul
    playCorrect(combo = 0) {
        if (!window.gameSettings.sfx) return;
        this.init();
        const shift = Math.pow(2, Math.min(combo, 12) / 12);
        this.tone(523.25 * shift, 'sine', 0.1, 0.15);
        setTimeout(() => this.tone(659.25 * shift, 'sine', 0.15, 0.15), 60);
    }

    playLifeUp() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.tone(523.25, 'sine', 0.1, 0.2);
        setTimeout(() => this.tone(659.25, 'sine', 0.1, 0.2), 80);
        setTimeout(() => this.tone(783.99, 'sine', 0.2, 0.2), 160);
    }

    playWrong() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.tone(180, 'sawtooth', 0.25, 0.2);
    }

    playChange() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.tone(300, 'triangle', 0.4, 0.15);
        setTimeout(() => this.tone(450, 'triangle', 0.3, 0.15), 100);
    }

    playChill() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.tone(659.25, 'sine', 0.2, 0.12);
        setTimeout(() => this.tone(523.25, 'sine', 0.3, 0.12), 140);
    }

    playRush() {
        if (!window.gameSettings.sfx) return;
        this.init();
        this.tone(392, 'triangle', 0.12, 0.12);
        setTimeout(() => this.tone(523.25, 'triangle', 0.12, 0.12), 90);
        setTimeout(() => this.tone(659.25, 'triangle', 0.2, 0.12), 180);
    }

    playClick() {
        this.playTone(800, 'sine', 0.05, 0.1);
    }

    startMusic() {
        if (this.bgMusicTimer) return;
        let noteIndex = 0;
        // pentatonica de Do -> nu poate suna fals
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        const melody = [0, 2, 4, 2, 3, 1, 2, 0,  0, 2, 4, 5, 4, 3, 2, 1];
        this.bgMusicTimer = setInterval(() => {
            if (window.gameSettings.music) {
                this.init();
                const n = melody[noteIndex];
                this.tone(scale[n], 'sine', 0.22, 0.03);
                if (noteIndex % 4 === 0) this.tone(scale[n] / 2, 'triangle', 0.4, 0.03);
                noteIndex = (noteIndex + 1) % melody.length;
            }
        }, 380);
    }

    stopMusic() {
        if (this.bgMusicTimer) {
            clearInterval(this.bgMusicTimer);
            this.bgMusicTimer = null;
        }
    }
}

const sounds = new SoundManager();

const FONT = '"Fredoka One", cursive';

// ---------------------------------------------------------------
// main menu
// ---------------------------------------------------------------
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;
        sounds.startMusic();

        const savedHighScore = safeGet('shift_sort_highscore', 0);

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
            fontFamily: FONT,
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
            fontFamily: FONT,
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

        // Enter / Space pornesc jocul
        this.input.keyboard.on('keydown-ENTER', () => this.scene.start('GameScene'));
        this.input.keyboard.on('keydown-SPACE', () => this.scene.start('GameScene'));
    }

    createButton(x, y, label, color, callback) {
        const btnBg = this.add.rectangle(x, y, 220, 55, color)
            .setStrokeStyle(4, 0x000000)
            .setInteractive({ useHandCursor: true });

        this.add.text(x, y, label, {
            fontFamily: FONT,
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

        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7).setInteractive().setDepth(500);
        const box = this.add.rectangle(width/2, height/2, 340, 450, 0x1A1A1A).setStrokeStyle(4, 0xFFD700).setDepth(501);

        const title = this.add.text(width/2, height/2 - 190, 'HOW TO PLAY', {
            fontFamily: FONT, fontSize: '26px', fill: '#FFD700'
        }).setOrigin(0.5).setDepth(502);

        const rulesContent =
            "1. Sort each falling item LEFT or RIGHT using the active RULE (COLOR or SHAPE).\n\n" +
            "2. Keys: ← → or A / D. Or tap the buttons.\n\n" +
            "3. You start with 3 LIVES. Gain +1 LIFE every 100 PTS (max 5).\n\n" +
            "4. The game has waves: RUSH gets faster, CHILL lets you breathe. A mistake also slows things down for a moment.\n\n" +
            "5. Watch out for 'CHANGE!!!' - it swaps the sides!\n\n" +
            "6. How long can you last? The game never ends - only you do.";

        const body = this.add.text(width/2, height/2 - 10, rulesContent, {
            fontFamily: FONT, fontSize: '14px', fill: '#FFFFFF', align: 'left', wordWrap: { width: 300 }
        }).setOrigin(0.5).setDepth(502);

        const closeBtn = this.add.rectangle(width/2, height/2 + 185, 140, 40, 0xFF5555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true }).setDepth(502);
        const closeText = this.add.text(width/2, height/2 + 185, 'CLOSE', {
            fontFamily: FONT, fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5).setDepth(503);

        closeBtn.on('pointerdown', () => {
            sounds.playClick();
            modalGroup.destroy(true);
        });

        modalGroup.addMultiple([overlay, box, title, body, closeBtn, closeText]);
    }

    showSettingsModal() {
        const { width, height } = this.scale;
        const modalGroup = this.add.group();

        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7).setInteractive().setDepth(500);
        const box = this.add.rectangle(width/2, height/2, 320, 320, 0x1A1A1A).setStrokeStyle(4, 0x2196F3).setDepth(501);

        const title = this.add.text(width/2, height/2 - 120, 'SETTINGS', {
            fontFamily: FONT, fontSize: '28px', fill: '#2196F3'
        }).setOrigin(0.5).setDepth(502);

        const sfxBtn = this.add.rectangle(width/2, height/2 - 40, 240, 45, window.gameSettings.sfx ? 0x4CAF50 : 0x555555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true }).setDepth(502);
        const sfxText = this.add.text(width/2, height/2 - 40, `SFX: ${window.gameSettings.sfx ? 'ON' : 'OFF'}`, {
            fontFamily: FONT, fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5).setDepth(503);

        sfxBtn.on('pointerdown', () => {
            window.gameSettings.sfx = !window.gameSettings.sfx;
            sfxBtn.setFillStyle(window.gameSettings.sfx ? 0x4CAF50 : 0x555555);
            sfxText.setText(`SFX: ${window.gameSettings.sfx ? 'ON' : 'OFF'}`);
            sounds.playClick();
        });

        const musicBtn = this.add.rectangle(width/2, height/2 + 25, 240, 45, window.gameSettings.music ? 0x4CAF50 : 0x555555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true }).setDepth(502);
        const musicText = this.add.text(width/2, height/2 + 25, `MUSIC: ${window.gameSettings.music ? 'ON' : 'OFF'}`, {
            fontFamily: FONT, fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5).setDepth(503);

        musicBtn.on('pointerdown', () => {
            window.gameSettings.music = !window.gameSettings.music;
            musicBtn.setFillStyle(window.gameSettings.music ? 0x4CAF50 : 0x555555);
            musicText.setText(`MUSIC: ${window.gameSettings.music ? 'ON' : 'OFF'}`);
            sounds.playClick();
        });

        const closeBtn = this.add.rectangle(width/2, height/2 + 110, 140, 40, 0xFF5555)
            .setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true }).setDepth(502);
        const closeText = this.add.text(width/2, height/2 + 110, 'CLOSE', {
            fontFamily: FONT, fontSize: '20px', fill: '#FFF'
        }).setOrigin(0.5).setDepth(503);

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

// ---------------------------------------------------------------
// gameplay scene
// ---------------------------------------------------------------
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // reset stari (scene.restart / revenire din pauza)
        this.time.paused = false;
        this.tweens.resumeAll();

        this.currentRule = 'COLOR';
        this.score = 0;
        this.highScore = parseInt(safeGet('shift_sort_highscore', '0'), 10);
        this.isNewRecord = false;

        this.lives = 3;
        this.maxLives = 5;
        this.lastHeartMilestone = 0;

        this.combo = 0;
        this.bestCombo = 0;

        // ---- viteza: curba de baza lenta + valuri (RUSH / CHILL) + "mila" dupa greseala ----
        this.baseVelocity = 200;
        this.currentSpeed = 1.0;      // viteza actuala (se apropie lin de target)
        this.phase = 'RUSH';          // RUSH = accelereaza, CHILL = respiro
        this.phaseTimer = 0;
        this.rushDuration = 18000;    // ms
        this.chillDuration = 7000;    // ms
        this.chillFactor = 0.7;
        this.mercyMs = 0;             // dupa o greseala viteza scade temporar
        this.spawnAcc = 0;

        this.isChanging = false;
        this.isGameOver = false;
        this.isPaused = false;

        this.leftMapping = { color: 'RED', shape: 'CIRCLE' };
        this.rightMapping = { color: 'BLUE', shape: 'SQUARE' };
        this.activeItems = [];

        const textStyle = { fontFamily: FONT, fontSize: '22px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4 };
        this.textStyle = textStyle;

        // ui top
        this.scoreText = this.add.text(15, 15, 'SCORE: 0', textStyle).setDepth(100);
        this.highScoreText = this.add.text(15, 43, `BEST: ${this.highScore}`, {
            ...textStyle, fontSize: '18px', fill: '#FFD700'
        }).setDepth(100);
        this.comboText = this.add.text(15, 66, '', {
            ...textStyle, fontSize: '16px', fill: '#7CFC00'
        }).setDepth(100);

        this.livesText = this.add.text(385, 15, '', {
            fontFamily: FONT, fontSize: '24px', fill: '#FF5555', stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0).setDepth(100);
        this.updateLivesDisplay();

        this.speedText = this.add.text(385, 45, 'SPEED: x1.0', { ...textStyle, fontSize: '18px', fill: '#FF7F50', align: 'right' }).setOrigin(1, 0).setDepth(100);
        this.phaseText = this.add.text(385, 66, 'RUSH', { ...textStyle, fontSize: '16px', fill: '#FF7F50', align: 'right' }).setOrigin(1, 0).setDepth(100);

        this.ruleText = this.add.text(200, 95, 'RULE: COLOR', { ...textStyle, fontSize: '32px', fill: '#FFD700' }).setOrigin(0.5).setDepth(100);

        // pause button
        this.pauseBtn = this.add.circle(200, 30, 16, 0x1A1A1A, 0.85)
            .setStrokeStyle(3, 0x000000).setDepth(100).setInteractive({ useHandCursor: true });
        this.add.text(200, 30, 'II', { ...textStyle, fontSize: '16px', strokeThickness: 2 }).setOrigin(0.5).setDepth(101);
        this.pauseBtn.on('pointerdown', () => this.togglePause());

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

        // banner pentru schimbarea fazei (RUSH / CHILL)
        this.bannerText = this.add.text(200, 230, '', { ...textStyle, fontSize: '42px', strokeThickness: 7 })
            .setOrigin(0.5).setAlpha(0).setDepth(190);

        // keys
        this.input.keyboard.on('keydown-LEFT', () => this.handleSort('LEFT'));
        this.input.keyboard.on('keydown-RIGHT', () => this.handleSort('RIGHT'));
        this.input.keyboard.on('keydown-A', () => this.handleSort('LEFT'));
        this.input.keyboard.on('keydown-D', () => this.handleSort('RIGHT'));
        this.input.keyboard.on('keydown-P', () => this.togglePause());
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());

        // pauza automata cand jucatorul paraseste tab-ul
        this.game.events.on(Phaser.Core.Events.BLUR, this.autoPause, this);
        this.events.once('shutdown', () => {
            this.game.events.off(Phaser.Core.Events.BLUR, this.autoPause, this);
        });

        this.scheduleNextRuleToggle();
        this.scheduleNextChangeEvent();
        this.spawnItem();
    }

    // ---------- UI helpers ----------
    updateLivesDisplay() {
        let heartsStr = '';
        for (let i = 0; i < this.lives; i++) {
            heartsStr += '♥ ';
        }
        this.livesText.setText(heartsStr.trim());
    }

    floatText(x, y, str, color = '#FFFFFF', size = '22px') {
        const t = this.add.text(x, y, str, {
            fontFamily: FONT, fontSize: size, fill: color, stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(150);
        this.tweens.add({
            targets: t, y: y - 50, alpha: 0, duration: 700,
            onComplete: () => t.destroy()
        });
    }

    showBanner(str, color) {
        this.bannerText.setText(str).setColor(color).setAlpha(1).setScale(0.6);
        this.tweens.killTweensOf(this.bannerText);
        this.tweens.add({ targets: this.bannerText, scale: 1, duration: 200 });
        this.tweens.add({ targets: this.bannerText, alpha: 0, delay: 900, duration: 500 });
    }

    // ---------- pause ----------
    autoPause() {
        if (!this.isPaused && !this.isGameOver) this.togglePause();
    }

    togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.time.paused = true;
            this.tweens.pauseAll();
            this.showPauseOverlay();
        } else {
            this.time.paused = false;
            this.tweens.resumeAll();
            if (this.pauseGroup) {
                this.pauseGroup.destroy(true);
                this.pauseGroup = null;
            }
        }
    }

    showPauseOverlay() {
        const { width, height } = this.scale;
        const g = this.add.group();

        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.75).setDepth(400).setInteractive();
        const box = this.add.rectangle(width/2, height/2, 300, 300, 0x1A1A1A).setStrokeStyle(5, 0x2196F3).setDepth(401);
        const title = this.add.text(width/2, height/2 - 100, 'PAUSED', {
            fontFamily: FONT, fontSize: '40px', fill: '#2196F3', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(402);

        const mkBtn = (y, label, color, cb) => {
            const bg = this.add.rectangle(width/2, y, 200, 50, color).setStrokeStyle(4, 0x000000).setDepth(402).setInteractive({ useHandCursor: true });
            const tx = this.add.text(width/2, y, label, {
                fontFamily: FONT, fontSize: '24px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(403);
            bg.on('pointerdown', cb);
            g.addMultiple([bg, tx]);
        };

        mkBtn(height/2 - 20, 'RESUME', 0x4CAF50, () => { sounds.playClick(); this.togglePause(); });
        mkBtn(height/2 + 45, 'MENU', 0xFF5555, () => {
            sounds.playClick();
            this.time.paused = false;
            this.tweens.resumeAll();
            this.scene.start('MenuScene');
        });

        g.addMultiple([overlay, box, title]);
        this.pauseGroup = g;
    }

    // ---------- gameplay ----------
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
        item.body.setVelocityY(this.baseVelocity * this.currentSpeed);
        this.activeItems.push(item);
    }

    handleSort(direction) {
        if (this.activeItems.length === 0 || this.isChanging || this.isGameOver || this.isPaused) return;

        const currentItem = this.activeItems[0];
        let isCorrect = false;
        let targetMapping = direction === 'LEFT' ? this.leftMapping : this.rightMapping;

        if (this.currentRule === 'COLOR') {
            if (currentItem.itemProps.color === targetMapping.color) isCorrect = true;
        } else {
            if (currentItem.itemProps.shape === targetMapping.shape) isCorrect = true;
        }

        if (isCorrect) {
            this.combo++;
            this.bestCombo = Math.max(this.bestCombo, this.combo);
            sounds.playCorrect(this.combo);

            let gained = 10;
            if (this.combo % 10 === 0) {
                gained += 5; // bonus la fiecare 10 la rand
                this.floatText(200, 200, `STREAK x${this.combo}! +5`, '#7CFC00', '24px');
            }
            this.score += gained;
            this.scoreText.setText(`SCORE: ${this.score}`);
            this.comboText.setText(this.combo >= 3 ? `COMBO: ${this.combo}` : '');
            this.floatText(currentItem.x, currentItem.y - 40, `+${gained}`, '#FFFFFF');

            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.isNewRecord = true;
                safeSet('shift_sort_highscore', this.highScore);
                this.highScoreText.setText(`BEST: ${this.highScore}`);
            }

            // viata extra la fiecare 100 pct
            let currentMilestone = Math.floor(this.score / 100);
            if (currentMilestone > this.lastHeartMilestone) {
                this.lastHeartMilestone = currentMilestone;
                if (this.lives < this.maxLives) {
                    this.lives++;
                    this.updateLivesDisplay();
                    sounds.playLifeUp();
                    this.floatText(330, 60, '+1 LIFE', '#FF5555', '18px');
                    this.tweens.add({ targets: this.livesText, scale: 1.4, duration: 150, yoyo: true });
                }
            }

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
        this.combo = 0;
        this.comboText.setText('');
        this.mercyMs = 5000; // dupa o greseala jocul incetineste putin
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

    scheduleNextRuleToggle() {
        if (this.isGameOver) return;
        this.ruleEvent = this.time.delayedCall(Phaser.Math.Between(6000, 9000), () => {
            this.toggleRule();
            this.scheduleNextRuleToggle();
        });
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
                this.cameras.main.shake(300, 0.015);

                this.tweens.add({
                    targets: this.changeText,
                    alpha: 1, scale: { from: 0.5, to: 1.2 },
                    duration: 400, yoyo: true, hold: 1000,
                    onComplete: () => {
                        this.swapMappings();
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

    // dificultatea de baza: creste repede la inceput, apoi tot mai lent spre ~x2.2 (nu explodeaza niciodata)
    getBaseSpeed() {
        return 1 + 1.2 * (1 - Math.exp(-this.score / 700));
    }

    updatePhase(delta) {
        this.phaseTimer += delta;
        const len = this.phase === 'RUSH' ? this.rushDuration : this.chillDuration;
        if (this.phaseTimer < len) return;

        this.phaseTimer = 0;
        if (this.phase === 'RUSH') {
            this.phase = 'CHILL';
            this.phaseText.setText('CHILL').setColor('#7CFC00');
            this.showBanner('BREATHER', '#7CFC00');
            sounds.playChill();
        } else {
            this.phase = 'RUSH';
            this.phaseText.setText('RUSH').setColor('#FF7F50');
            this.showBanner('SPEED UP!', '#FF7F50');
            sounds.playRush();
        }
    }

    update(time, delta) {
        if (this.isGameOver || this.isPaused) return;

        this.updatePhase(delta);

        // viteza tinta = baza * factor de faza, redusa dupa greseala
        let factor = this.phase === 'CHILL' ? this.chillFactor : 1.0;
        if (this.mercyMs > 0) {
            this.mercyMs -= delta;
            factor = Math.min(factor, 0.75);
        }
        const target = this.getBaseSpeed() * factor;
        // apropiere lina (nu sare brusc)
        this.currentSpeed += (target - this.currentSpeed) * (1 - Math.exp(-delta / 700));

        this.speedText.setText(`SPEED: x${this.currentSpeed.toFixed(1)}`);

        // viteza itemelor in fiecare frame (incetinite mult in timpul CHANGE)
        const v = this.baseVelocity * this.currentSpeed * (this.isChanging ? 0.1 : 1);
        this.activeItems.forEach(item => {
            if (item.body) item.body.setVelocityY(v);
            let newScale = Phaser.Math.Linear(0.1, 1.2, (item.y - 130) / 330);
            item.scale = Phaser.Math.Clamp(newScale, 0.1, 1.2);
        });

        // spawn: distanta dintre iteme ramane aproape constanta indiferent de viteza
        if (!this.isChanging) {
            this.spawnAcc += delta;
            const interval = Math.max(650, 1500 / this.currentSpeed);
            if (this.spawnAcc >= interval) {
                this.spawnAcc = 0;
                this.spawnItem();
            }
        }

        if (this.activeItems.length > 0 && this.activeItems[0].y > 470 && !this.isChanging && !this.isGameOver) {
            const missedItem = this.activeItems.shift();
            missedItem.destroy();
            this.loseLife();
        }
    }

    gameOver() {
        this.isGameOver = true;
        if (this.ruleEvent) this.ruleEvent.remove();
        if (this.changeEventTimer) this.changeEventTimer.remove();

        const { width, height } = this.scale;

        this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8).setDepth(300).setInteractive();
        this.add.rectangle(width/2, height/2, 320, 400, 0x1A1A1A).setStrokeStyle(5, 0xFF5555).setDepth(301);

        this.add.text(width/2, height/2 - 140, 'GAME OVER', {
            fontFamily: FONT, fontSize: '38px', fill: '#FF5555', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(302);

        if (this.isNewRecord) {
            const newRecordText = this.add.text(width/2, height/2 - 90, '🎉 NEW RECORD! 🎉', {
                fontFamily: FONT, fontSize: '20px', fill: '#FFD700', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(302);

            this.tweens.add({
                targets: newRecordText,
                scale: 1.1,
                duration: 400,
                yoyo: true,
                loop: -1
            });
        }

        this.add.text(width/2, height/2 - 25, `SCORE: ${this.score}\nBEST: ${this.highScore}\nBEST COMBO: ${this.bestCombo}`, {
            fontFamily: FONT, fontSize: '22px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 5, align: 'center'
        }).setOrigin(0.5).setDepth(302);

        const createGameOverBtn = (y, label, color, callback) => {
            const btnBg = this.add.rectangle(width/2, y, 220, 50, color)
                .setStrokeStyle(4, 0x000000).setDepth(302).setInteractive({ useHandCursor: true });

            const btnText = this.add.text(width/2, y, label, {
                fontFamily: FONT, fontSize: '24px', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(303);

            btnBg.on('pointerover', () => { btnBg.setScale(1.05); btnText.setScale(1.05); });
            btnBg.on('pointerout', () => { btnBg.setScale(1.0); btnText.setScale(1.0); });
            btnBg.on('pointerdown', callback);
        };

        createGameOverBtn(height/2 + 80, 'TRY AGAIN', 0x4CAF50, () => {
            sounds.playClick();
            this.scene.restart();
        });

        createGameOverBtn(height/2 + 145, 'MENU', 0x2196F3, () => {
            sounds.playClick();
            this.scene.start('MenuScene');
        });

        this.input.keyboard.once('keydown-ENTER', () => this.scene.restart());
    }
}

// ---------------------------------------------------------------
// phaser config
// ---------------------------------------------------------------
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#6BD4E7',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
    },
    scene: [MenuScene, GameScene]
};

// pornim jocul dupa ce fontul e incarcat (altfel textul apare cu alt font la prima afisare)
const startGame = () => new Phaser.Game(config);
if (document.fonts && document.fonts.load) {
    Promise.race([
        document.fonts.load('20px "Fredoka One"'),
        new Promise(res => setTimeout(res, 2000))
    ]).then(startGame, startGame);
} else {
    startGame();
}
