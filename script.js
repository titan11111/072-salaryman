// 簡単な効果音システム
class SimpleSoundSystem {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.initialized = true;
                console.log('音声システム初期化完了');
            } catch (error) {
                console.log('音声システム使用不可:', error);
                this.enabled = false;
            }
        })();
        
        return this.initPromise;
    }

    async playBeep(frequency = 440, duration = 0.1, volume = 0.1) {
        if (!this.enabled) return;
        
        try {
            await this.init();
            if (!this.audioContext) return;
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.log('音声再生エラー:', error);
        }
    }

    move() { this.playBeep(220, 0.05, 0.05); }
    attack() { this.playBeep(440, 0.1, 0.08); }
    special() { this.playBeep(880, 0.2, 0.1); }
    damage() { this.playBeep(150, 0.2, 0.08); }
    victory() { 
        this.playBeep(523, 0.15, 0.08);
        setTimeout(() => this.playBeep(659, 0.15, 0.08), 150);
        setTimeout(() => this.playBeep(784, 0.15, 0.08), 300);
    }
    money() { this.playBeep(784, 0.1, 0.06); }
    elevator() { 
        this.playBeep(659, 0.3, 0.06);
        setTimeout(() => this.playBeep(523, 0.3, 0.06), 300);
    }
    shop() { this.playBeep(880, 0.05, 0.05); }
    gameOver() {
        this.playBeep(392, 0.3, 0.08);
        setTimeout(() => this.playBeep(330, 0.3, 0.08), 300);
        setTimeout(() => this.playBeep(262, 0.3, 0.08), 600);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// グローバル音響システム
const soundSystem = new SimpleSoundSystem();

// ゲーム状態管理
let gameState = {
    currentFloor: 1,
    playerX: 1,
    playerY: 1,
    playerHP: 100,
    playerMaxHP: 100,
    playerAttack: 10,
    playerSpecialAttack: 20,
    playerMoney: 1000,
    inBattle: false,
    currentEnemy: null,
    gameStarted: false
};

// 敵タイプ定義
const enemyTypes = {
    'intern': { name: '新人インターン', hp: 15, maxHp: 15, attack: 3, money: 30, color: '#95a5a6' },
    'trainee': { name: '研修生', hp: 20, maxHp: 20, attack: 5, money: 50, color: '#e74c3c' },
    'clerk': { name: '事務員', hp: 25, maxHp: 25, attack: 6, money: 70, color: '#3498db' },
    'assistant': { name: 'アシスタント', hp: 30, maxHp: 30, attack: 8, money: 100, color: '#e67e22' },
    'staff': { name: '一般職員', hp: 40, maxHp: 40, attack: 10, money: 120, color: '#f39c12' },
    'senior': { name: '先輩社員', hp: 50, maxHp: 50, attack: 12, money: 150, color: '#e74c3c' },
    'supervisor': { name: '主任', hp: 60, maxHp: 60, attack: 14, money: 180, color: '#8e44ad' },
    'teamlead': { name: 'チームリーダー', hp: 70, maxHp: 70, attack: 16, money: 200, color: '#2c3e50' },
    'manager': { name: 'マネージャー', hp: 85, maxHp: 85, attack: 18, money: 250, color: '#16a085' },
    'deputy': { name: '部長代理', hp: 100, maxHp: 100, attack: 20, money: 300, color: '#2c3e50' },
    'executive': { name: '重役', hp: 120, maxHp: 120, attack: 22, money: 350, color: '#8e44ad' },
    'boss': { name: '鬼部長', hp: 200, maxHp: 200, attack: 25, money: 500, color: '#000000' }
};

// フロア別敵配置
const floorEnemies = {
    1: ['intern', 'trainee'],
    2: ['trainee', 'clerk', 'assistant'],
    3: ['staff', 'senior'],
    4: ['staff', 'senior'],
    5: ['supervisor', 'teamlead'],
    6: ['supervisor', 'teamlead'],
    7: ['manager', 'deputy'],
    8: ['deputy', 'executive'],
    9: ['manager', 'deputy', 'executive'],
    10: ['boss']
};

// ショップアイテム
const shopItems = [
    { name: '栄養ドリンク', price: 100, description: 'HP20回復', effect: 'heal', value: 20 },
    { name: 'エナジードリンク', price: 200, description: 'HP50回復', effect: 'heal', value: 50 },
    { name: '最高級弁当', price: 300, description: 'HP100回復', effect: 'heal', value: 100 },
    { name: 'プロテイン', price: 250, description: '攻撃力+5', effect: 'attack', value: 5 },
    { name: 'ビジネス書', price: 400, description: '特殊攻撃力+10', effect: 'special', value: 10 }
];

// マップデータ
const mapData = {
    1: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','.','.','.','.','.','#'],
        ['#','.','D','.','E1','.','S','#'],
        ['#','.','.','E2','.','.','.','#'],
        ['#','.','.','.','L','.','.','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    2: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','.','D','.','E2','D','#'],
        ['#','.','D','E1','.','.','D','#'],
        ['#','E3','.','.','.','.','.','#'],
        ['#','.','S','.','L','.','E1','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    3: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','D','D','.','E2','D','#'],
        ['#','.','.','.','.','.','D','#'],
        ['#','E1','D','.','.','.','E1','#'],
        ['#','.','.','.','L','.','S','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    4: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','.','E2','.','D','E1','#'],
        ['#','D','.','.','.','.','.','#'],
        ['#','.','.','.','D','.','D','#'],
        ['#','.','E1','.','L','.','S','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    5: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','D','D','D','D','D','#'],
        ['#','.','.','.','E2','.','E1','#'],
        ['#','D','.','.','.','.','.','#'],
        ['#','.','S','.','L','.','D','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    6: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','.','D','E2','D','.','#'],
        ['#','E1','.','.','.','.','.','#'],
        ['#','D','.','E1','.','E2','D','#'],
        ['#','.','.','.','L','.','S','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    7: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','E2','D','D','D','E1','#'],
        ['#','.','.','.','.','.','E2','#'],
        ['#','E1','.','D','.','D','.','#'],
        ['#','.','S','.','L','.','E1','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    8: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','.','E2','D','E3','.','#'],
        ['#','D','.','.','.','.','.','#'],
        ['#','E1','.','D','.','D','E2','#'],
        ['#','.','E3','.','L','.','S','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    9: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','E2','E3','D','E1','E2','#'],
        ['#','.','.','.','.','.','E3','#'],
        ['#','E1','.','.','.','.','.','#'],
        ['#','.','S','.','L','.','E1','#'],
        ['#','#','#','#','#','#','#','#']
    ],
    10: [
        ['#','#','#','#','#','#','#','#'],
        ['#','P','.','.','.','.','.','#'],
        ['#','.','.','.','E1','.','D','#'],
        ['#','.','D','.','.','.','D','#'],
        ['#','.','.','.','D','.','D','#'],
        ['#','#','#','#','#','#','#','#']
    ]
};

// DOM要素の安全な取得
function getElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with id '${id}' not found`);
        return null;
    }
    return element;
}

// DOM要素
let titleScreen, gameScreen, battleOverlay, shopOverlay, elevatorOverlay, helpOverlay;
let gameOverScreen, gameClearScreen, gameMap, currentFloorElement;
let playerHpBar, playerHpText, moneyDisplay, soundToggle;
let battlePlayerHpBar, battlePlayerHpText, enemyHpBar, enemyHpText;
let enemyName, enemySprite, battleLog, shopItems_element, elevatorMessage;

// DOM初期化
function initializeDOM() {
    titleScreen = getElementById('titleScreen');
    gameScreen = getElementById('gameScreen');
    battleOverlay = getElementById('battleOverlay');
    shopOverlay = getElementById('shopOverlay');
    elevatorOverlay = getElementById('elevatorOverlay');
    helpOverlay = getElementById('helpOverlay');
    gameOverScreen = getElementById('gameOverScreen');
    gameClearScreen = getElementById('gameClearScreen');
    gameMap = getElementById('gameMap');
    currentFloorElement = getElementById('currentFloor');
    playerHpBar = getElementById('playerHpBar');
    playerHpText = getElementById('playerHpText');
    moneyDisplay = getElementById('moneyDisplay');
    soundToggle = getElementById('soundToggle');
    battlePlayerHpBar = getElementById('battlePlayerHpBar');
    battlePlayerHpText = getElementById('battlePlayerHpText');
    enemyHpBar = getElementById('enemyHpBar');
    enemyHpText = getElementById('enemyHpText');
    enemyName = getElementById('enemyName');
    enemySprite = getElementById('enemySprite');
    battleLog = getElementById('battleLog');
    shopItems_element = getElementById('shopItems');
    elevatorMessage = getElementById('elevatorMessage');
}

// 音声切り替え
function toggleSound() {
    const enabled = soundSystem.toggle();
    if (soundToggle) {
        soundToggle.textContent = enabled ? '♪ ON' : '♪ OFF';
    }
    if (enabled) soundSystem.shop();
}

// ヘルプ表示
function showHelp() {
    if (helpOverlay) {
        helpOverlay.classList.add('active');
    }
}

function closeHelp() {
    if (helpOverlay) {
        helpOverlay.classList.remove('active');
    }
}

// ゲーム開始
function startGame() {
    if (!titleScreen || !gameScreen) {
        console.error('Required DOM elements not found');
        return;
    }
    
    soundSystem.init();
    
    titleScreen.classList.remove('active');
    gameScreen.classList.add('active');
    gameState.gameStarted = true;
    
    // ゲーム状態をリセット
    gameState.currentFloor = 1;
    gameState.playerX = 1;
    gameState.playerY = 1;
    gameState.playerHP = 100;
    gameState.playerMaxHP = 100;
    gameState.playerAttack = 10;
    gameState.playerSpecialAttack = 20;
    gameState.playerMoney = 1000;
    gameState.inBattle = false;
    gameState.currentEnemy = null;
    
    drawMap();
    updateUI();
    
    console.log('ゲーム開始！');
}

// SVGユーティリティとキャラクター描画
function createSVGElement(tagName, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.setAttribute(key, typeof value === 'number' ? value.toString() : value);
        }
    });
    return element;
}

function createFloorTile(x, y, cellSize, options = {}) {
    const {
        fill = '#95a5a6',
        stroke = '#7f8c8d',
        strokeWidth = 0.5
    } = options;

    return createSVGElement('rect', {
        x,
        y,
        width: cellSize,
        height: cellSize,
        fill,
        stroke,
        'stroke-width': typeof strokeWidth === 'number' ? strokeWidth.toString() : strokeWidth
    });
}

const KAKU_CHARACTER_SKIN_COLOR = '#f6d7b8';
const KAKU_CHARACTER_HAIR_PLAYER = '#1f3a56';
const KAKU_CHARACTER_HAIR_ENEMY = '#2c3e50';

function createKakuCharacterSprite({
    x,
    y,
    cellSize,
    suitColor,
    accentColor,
    labelText,
    labelColor = '#ffffff',
    isPlayer = false
}) {
    const sprite = createSVGElement('g', {
        class: isPlayer ? 'player-character' : 'enemy-character'
    });

    const centerX = x + cellSize / 2;
    const bodyTop = y + cellSize * 0.32;
    const bodyWidth = cellSize * 0.62;
    const bodyHeight = cellSize * 0.5;

    // 影
    sprite.appendChild(createSVGElement('ellipse', {
        cx: centerX,
        cy: y + cellSize * 0.88,
        rx: cellSize * 0.22,
        ry: cellSize * 0.08,
        fill: 'rgba(0, 0, 0, 0.2)'
    }));

    // 腕
    const armWidth = cellSize * 0.12;
    const armHeight = cellSize * 0.36;
    const armsY = bodyTop + cellSize * 0.04;
    const armAttributes = {
        width: armWidth,
        height: armHeight,
        rx: cellSize * 0.04,
        ry: cellSize * 0.04,
        fill: suitColor,
        stroke: 'rgba(0, 0, 0, 0.35)',
        'stroke-width': cellSize * 0.02
    };

    sprite.appendChild(createSVGElement('rect', {
        ...armAttributes,
        x: centerX - bodyWidth / 2 - armWidth + cellSize * 0.05,
        y: armsY
    }));
    sprite.appendChild(createSVGElement('rect', {
        ...armAttributes,
        x: centerX + bodyWidth / 2 - cellSize * 0.05,
        y: armsY
    }));

    // 体
    sprite.appendChild(createSVGElement('rect', {
        x: centerX - bodyWidth / 2,
        y: bodyTop,
        width: bodyWidth,
        height: bodyHeight,
        rx: cellSize * 0.08,
        ry: cellSize * 0.08,
        fill: suitColor,
        stroke: 'rgba(0, 0, 0, 0.35)',
        'stroke-width': cellSize * 0.025
    }));

    // シャツ
    sprite.appendChild(createSVGElement('rect', {
        x: centerX - cellSize * 0.12,
        y: bodyTop + cellSize * 0.07,
        width: cellSize * 0.24,
        height: cellSize * 0.22,
        rx: cellSize * 0.03,
        ry: cellSize * 0.03,
        fill: '#ecf0f1'
    }));

    // ネクタイ
    sprite.appendChild(createSVGElement('polygon', {
        points: [
            `${centerX},${bodyTop + cellSize * 0.08}`,
            `${centerX - cellSize * 0.04},${bodyTop + cellSize * 0.16}`,
            `${centerX},${bodyTop + cellSize * 0.18}`,
            `${centerX + cellSize * 0.04},${bodyTop + cellSize * 0.16}`
        ].join(' '),
        fill: accentColor,
        stroke: 'rgba(0, 0, 0, 0.25)',
        'stroke-width': cellSize * 0.01
    }));

    sprite.appendChild(createSVGElement('polygon', {
        points: [
            `${centerX},${bodyTop + cellSize * 0.18}`,
            `${centerX - cellSize * 0.05},${bodyTop + cellSize * 0.3}`,
            `${centerX},${bodyTop + cellSize * 0.38}`,
            `${centerX + cellSize * 0.05},${bodyTop + cellSize * 0.3}`
        ].join(' '),
        fill: accentColor,
        stroke: 'rgba(0, 0, 0, 0.25)',
        'stroke-width': cellSize * 0.01
    }));

    // ハイライト
    sprite.appendChild(createSVGElement('rect', {
        x: centerX - bodyWidth / 2 + cellSize * 0.05,
        y: bodyTop + cellSize * 0.05,
        width: cellSize * 0.08,
        height: bodyHeight - cellSize * 0.1,
        rx: cellSize * 0.04,
        fill: 'rgba(255, 255, 255, 0.15)'
    }));

    // ベルト
    sprite.appendChild(createSVGElement('rect', {
        x: centerX - bodyWidth / 2,
        y: bodyTop + bodyHeight * 0.7,
        width: bodyWidth,
        height: cellSize * 0.05,
        fill: 'rgba(0, 0, 0, 0.35)'
    }));

    // 足元
    const footY = bodyTop + bodyHeight - cellSize * 0.02;
    const footWidth = cellSize * 0.24;
    const footHeight = cellSize * 0.1;
    sprite.appendChild(createSVGElement('rect', {
        x: centerX - bodyWidth / 2,
        y: footY,
        width: footWidth,
        height: footHeight,
        rx: cellSize * 0.03,
        fill: '#2c3e50'
    }));
    sprite.appendChild(createSVGElement('rect', {
        x: centerX + bodyWidth / 2 - footWidth,
        y: footY,
        width: footWidth,
        height: footHeight,
        rx: cellSize * 0.03,
        fill: '#2c3e50'
    }));

    // 首
    sprite.appendChild(createSVGElement('rect', {
        x: centerX - cellSize * 0.06,
        y: bodyTop - cellSize * 0.08,
        width: cellSize * 0.12,
        height: cellSize * 0.08,
        rx: cellSize * 0.02,
        fill: KAKU_CHARACTER_SKIN_COLOR
    }));

    // 顔
    const headRadius = cellSize * 0.18;
    const headCenterY = y + cellSize * 0.24;
    sprite.appendChild(createSVGElement('circle', {
        cx: centerX,
        cy: headCenterY,
        r: headRadius,
        fill: KAKU_CHARACTER_SKIN_COLOR,
        stroke: '#d4a373',
        'stroke-width': cellSize * 0.02
    }));

    const hairColor = isPlayer ? KAKU_CHARACTER_HAIR_PLAYER : KAKU_CHARACTER_HAIR_ENEMY;
    const hairPath = [
        `M${centerX - headRadius} ${headCenterY - headRadius * 0.9}`,
        `Q${centerX} ${headCenterY - headRadius * 1.35} ${centerX + headRadius} ${headCenterY - headRadius * 0.9}`,
        `L${centerX + headRadius} ${headCenterY - headRadius * 0.2}`,
        `Q${centerX} ${headCenterY - headRadius * 0.65} ${centerX - headRadius} ${headCenterY - headRadius * 0.2}`,
        'Z'
    ].join(' ');
    sprite.appendChild(createSVGElement('path', {
        d: hairPath,
        fill: hairColor
    }));

    // 目・口
    const eyeY = headCenterY - cellSize * 0.03;
    const eyeOffset = cellSize * 0.06;
    const eyeRadius = Math.max(cellSize * 0.02, 1);
    sprite.appendChild(createSVGElement('circle', {
        cx: centerX - eyeOffset,
        cy: eyeY,
        r: eyeRadius,
        fill: '#2c3e50'
    }));
    sprite.appendChild(createSVGElement('circle', {
        cx: centerX + eyeOffset,
        cy: eyeY,
        r: eyeRadius,
        fill: '#2c3e50'
    }));

    sprite.appendChild(createSVGElement('path', {
        d: `M${centerX - cellSize * 0.05} ${headCenterY + cellSize * 0.05} Q${centerX} ${headCenterY + cellSize * 0.08} ${centerX + cellSize * 0.05} ${headCenterY + cellSize * 0.05}`,
        stroke: '#c0392b',
        'stroke-width': Math.max(cellSize * 0.015, 1),
        fill: 'none',
        'stroke-linecap': 'round'
    }));

    const cheekRadius = cellSize * 0.03;
    const cheekY = headCenterY + cellSize * 0.02;
    sprite.appendChild(createSVGElement('circle', {
        cx: centerX - eyeOffset,
        cy: cheekY,
        r: cheekRadius,
        fill: 'rgba(231, 76, 60, 0.25)'
    }));
    sprite.appendChild(createSVGElement('circle', {
        cx: centerX + eyeOffset,
        cy: cheekY,
        r: cheekRadius,
        fill: 'rgba(231, 76, 60, 0.25)'
    }));

    if (labelText) {
        const badgeWidth = cellSize * 0.18;
        const badgeHeight = cellSize * 0.22;
        const badgeX = centerX + bodyWidth / 2 - badgeWidth - cellSize * 0.02;
        const badgeY = bodyTop + cellSize * 0.16;

        sprite.appendChild(createSVGElement('rect', {
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: badgeHeight,
            rx: cellSize * 0.03,
            ry: cellSize * 0.03,
            fill: accentColor,
            stroke: 'rgba(0, 0, 0, 0.35)',
            'stroke-width': cellSize * 0.015
        }));

        const badgeLabel = createSVGElement('text', {
            x: badgeX + badgeWidth / 2,
            y: badgeY + badgeHeight / 2 + cellSize * 0.01,
            'text-anchor': 'middle',
            'dominant-baseline': 'middle',
            'font-family': 'monospace',
            'font-size': Math.max(cellSize * 0.18, 8),
            'font-weight': 'bold',
            fill: labelColor,
            'pointer-events': 'none'
        });
        badgeLabel.textContent = labelText;
        sprite.appendChild(badgeLabel);
    } else {
        // プレイヤーのブリーフケース
        sprite.appendChild(createSVGElement('rect', {
            x: centerX + bodyWidth / 2 - cellSize * 0.28,
            y: bodyTop + cellSize * 0.22,
            width: cellSize * 0.2,
            height: cellSize * 0.16,
            rx: cellSize * 0.04,
            ry: cellSize * 0.04,
            fill: '#1f2d3a',
            stroke: 'rgba(255, 255, 255, 0.2)',
            'stroke-width': cellSize * 0.02
        }));

        sprite.appendChild(createSVGElement('rect', {
            x: centerX + bodyWidth / 2 - cellSize * 0.22,
            y: bodyTop + cellSize * 0.18,
            width: cellSize * 0.1,
            height: cellSize * 0.05,
            rx: cellSize * 0.02,
            fill: '#1f2d3a'
        }));
    }

    return sprite;
}

function createPlayerSprite(x, y, cellSize) {
    return createKakuCharacterSprite({
        x,
        y,
        cellSize,
        suitColor: '#3498db',
        accentColor: '#e74c3c',
        isPlayer: true
    });
}

function createEnemySprite(x, y, cellSize, enemyColor, enemyIndex) {
    const tiePalette = ['#c0392b', '#16a085', '#f39c12', '#8e44ad'];
    const accentColor = tiePalette[enemyIndex % tiePalette.length];

    return createKakuCharacterSprite({
        x,
        y,
        cellSize,
        suitColor: enemyColor,
        accentColor,
        labelText: (enemyIndex + 1).toString(),
        isPlayer: false
    });
}

// SVGマップチップ作成
function createSVGChip(type, x, y, cellSize, enemyIndex = 0) {
    const group = createSVGElement('g');

    switch (type) {
        case 'wall':
            group.appendChild(createSVGElement('rect', {
                x,
                y,
                width: cellSize,
                height: cellSize,
                fill: '#2c3e50',
                stroke: '#34495e',
                'stroke-width': 1
            }));
            break;

        case 'floor':
            group.appendChild(createFloorTile(x, y, cellSize));
            break;

        case 'enemy':
            group.appendChild(createFloorTile(x, y, cellSize));

            const enemyColors = getEnemyColorsForFloor(gameState.currentFloor);
            const enemyColor = enemyColors[enemyIndex] || '#e74c3c';
            group.appendChild(createEnemySprite(x, y, cellSize, enemyColor, enemyIndex));
            break;

        case 'desk':
            group.appendChild(createFloorTile(x, y, cellSize));

            group.appendChild(createSVGElement('rect', {
                x: x + 5,
                y: y + 5,
                width: cellSize - 10,
                height: cellSize - 10,
                fill: '#8b4513',
                stroke: '#654321',
                'stroke-width': 1
            }));

            group.appendChild(createSVGElement('rect', {
                x: x + 7,
                y: y + 7,
                width: cellSize - 14,
                height: (cellSize - 10) / 4,
                fill: 'rgba(255, 255, 255, 0.1)'
            }));
            break;

        case 'elevator':
            group.appendChild(createFloorTile(x, y, cellSize));

            group.appendChild(createSVGElement('rect', {
                x: x + 3,
                y: y + 3,
                width: cellSize - 6,
                height: cellSize - 6,
                rx: cellSize * 0.08,
                ry: cellSize * 0.08,
                fill: '#f39c12',
                stroke: '#d68910',
                'stroke-width': 2
            }));

            group.appendChild(createSVGElement('line', {
                x1: x + cellSize / 2,
                y1: y + 6,
                x2: x + cellSize / 2,
                y2: y + cellSize - 6,
                stroke: 'rgba(0, 0, 0, 0.4)',
                'stroke-width': 1.5
            }));
            break;

        case 'shop':
            group.appendChild(createFloorTile(x, y, cellSize));

            group.appendChild(createSVGElement('rect', {
                x: x + 4,
                y: y + 4,
                width: cellSize - 8,
                height: cellSize - 8,
                rx: cellSize * 0.08,
                ry: cellSize * 0.08,
                fill: '#9b59b6',
                stroke: '#8e44ad',
                'stroke-width': 2
            }));

            group.appendChild(createSVGElement('text', {
                x: x + cellSize / 2,
                y: y + cellSize / 2 + 4,
                'text-anchor': 'middle',
                'font-family': 'monospace',
                'font-size': 16,
                'font-weight': 'bold',
                fill: '#ffffff'
            })).textContent = '¥';
            break;

        case 'player':
            group.appendChild(createPlayerSprite(x, y, cellSize));
            break;
    }

    return group;
}

// 敵色取得
function getEnemyColorsForFloor(floor) {
    const enemies = floorEnemies[floor] || [];
    return enemies.map(enemyType => enemyTypes[enemyType].color);
}

// マップ描画
function drawMap() {
    if (!gameMap) return;
    
    gameMap.innerHTML = '';
    
    const currentMap = mapData[gameState.currentFloor];
    if (!currentMap) return;
    
    const cellSize = 40;
    
    for (let y = 0; y < currentMap.length; y++) {
        for (let x = 0; x < currentMap[y].length; x++) {
            const cell = currentMap[y][x];
            let chipType, enemyIndex = 0;
            
            switch (cell) {
                case '#': chipType = 'wall'; break;
                case '.': case 'P': chipType = 'floor'; break;
                case 'E1': chipType = 'enemy'; enemyIndex = 0; break;
                case 'E2': chipType = 'enemy'; enemyIndex = 1; break;
                case 'E3': chipType = 'enemy'; enemyIndex = 2; break;
                case 'D': chipType = 'desk'; break;
                case 'L': chipType = 'elevator'; break;
                case 'S': chipType = 'shop'; break;
                default: chipType = 'floor';
            }
            
            const chip = createSVGChip(chipType, x * cellSize, y * cellSize, cellSize, enemyIndex);
            gameMap.appendChild(chip);
        }
    }
    
    drawPlayer();
}

// プレイヤー描画
function drawPlayer() {
    if (!gameMap) return;
    
    const existingPlayer = gameMap.querySelector('[data-player="true"]');
    if (existingPlayer) existingPlayer.remove();
    
    const cellSize = 40;
    const playerChip = createSVGChip('player', gameState.playerX * cellSize, gameState.playerY * cellSize, cellSize);
    playerChip.setAttribute('data-player', 'true');
    gameMap.appendChild(playerChip);
}

// プレイヤー移動
function movePlayer(direction) {
    if (gameState.inBattle) return;
    
    let newX = gameState.playerX, newY = gameState.playerY;
    
    switch (direction) {
        case 'up': newY--; break;
        case 'down': newY++; break;
        case 'left': newX--; break;
        case 'right': newX++; break;
    }
    
    if (canMoveTo(newX, newY)) {
        gameState.playerX = newX;
        gameState.playerY = newY;
        soundSystem.move();
        
        const currentMap = mapData[gameState.currentFloor];
        const targetCell = currentMap[newY][newX];
        
        if (targetCell.startsWith('E')) {
            const enemyIndex = parseInt(targetCell.charAt(1)) - 1;
            startBattle(enemyIndex);
        } else if (targetCell === 'L') {
            useElevator();
        } else if (targetCell === 'S') {
            openShop();
        }
        
        drawPlayer();
    }
}

// 移動可能チェック
function canMoveTo(x, y) {
    const currentMap = mapData[gameState.currentFloor];
    if (!currentMap || y < 0 || y >= currentMap.length || x < 0 || x >= currentMap[0].length) return false;
    return currentMap[y][x] !== '#';
}

// ショップ
function openShop() {
    soundSystem.shop();
    updateShopDisplay();
    if (shopOverlay) shopOverlay.classList.add('active');
}

function closeShop() {
    if (shopOverlay) shopOverlay.classList.remove('active');
}

function updateShopDisplay() {
    if (!shopItems_element) return;
    
    shopItems_element.innerHTML = '';
    
    shopItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        
        const canAfford = gameState.playerMoney >= item.price;
        const isHealing = item.effect === 'heal' && gameState.playerHP >= gameState.playerMaxHP;
        
        itemDiv.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-description">${item.description}</div>
            </div>
            <div class="item-price">¥${item.price}</div>
            <button class="buy-btn" onclick="buyItem(${index})" ${(!canAfford || isHealing) ? 'disabled' : ''}>
                ${!canAfford ? '所持金不足' : isHealing ? 'HP満タン' : '購入'}
            </button>
        `;
        
        shopItems_element.appendChild(itemDiv);
    });
}

function buyItem(index) {
    const item = shopItems[index];
    
    if (gameState.playerMoney < item.price || (item.effect === 'heal' && gameState.playerHP >= gameState.playerMaxHP)) {
        return;
    }
    
    gameState.playerMoney -= item.price;
    soundSystem.shop();
    
    switch (item.effect) {
        case 'heal':
            gameState.playerHP = Math.min(gameState.playerHP + item.value, gameState.playerMaxHP);
            break;
        case 'attack':
            gameState.playerAttack += item.value;
            break;
        case 'special':
            gameState.playerSpecialAttack += item.value;
            break;
    }
    
    updateUI();
    updateShopDisplay();
}

// 戦闘
function startBattle(enemyIndex = 0) {
    gameState.inBattle = true;
    
    const availableEnemies = floorEnemies[gameState.currentFloor] || ['trainee'];
    const selectedEnemyType = availableEnemies[enemyIndex] || availableEnemies[0];
    
    gameState.currentEnemy = {
        ...enemyTypes[selectedEnemyType],
        hp: enemyTypes[selectedEnemyType].hp
    };
    
    updateBattleUI();
    if (battleOverlay) battleOverlay.classList.add('active');
    if (battleLog) battleLog.innerHTML = '<p>戦闘開始！</p>';
}

function updateBattleUI() {
    if (!gameState.currentEnemy) return;
    
    const playerHpPercent = (gameState.playerHP / gameState.playerMaxHP) * 100;
    if (battlePlayerHpBar) battlePlayerHpBar.style.width = playerHpPercent + '%';
    if (battlePlayerHpText) battlePlayerHpText.textContent = `${gameState.playerHP}/${gameState.playerMaxHP}`;
    
    const enemyHpPercent = (gameState.currentEnemy.hp / gameState.currentEnemy.maxHp) * 100;
    if (enemyHpBar) enemyHpBar.style.width = enemyHpPercent + '%';
    if (enemyHpText) enemyHpText.textContent = `${gameState.currentEnemy.hp}/${gameState.currentEnemy.maxHp}`;
    
    if (enemyName) enemyName.textContent = gameState.currentEnemy.name;
    if (enemySprite) enemySprite.style.background = gameState.currentEnemy.color;
}

function playerAttack() {
    if (!gameState.currentEnemy) return;
    
    soundSystem.attack();
    
    const damage = gameState.playerAttack + Math.floor(Math.random() * 3);
    gameState.currentEnemy.hp -= damage;
    
    addBattleLog(`田中太郎の攻撃！ ${gameState.currentEnemy.name}に${damage}のダメージ！`);
    
    if (gameState.currentEnemy.hp <= 0) {
        battleWin();
    } else {
        setTimeout(enemyAttack, 1000);
    }
    
    updateBattleUI();
}

function playerSpecialAttack() {
    if (!gameState.currentEnemy) return;
    
    soundSystem.special();
    
    const damage = gameState.playerSpecialAttack + Math.floor(Math.random() * 5);
    gameState.currentEnemy.hp -= damage;
    
    addBattleLog(`田中太郎の残業アタック！ ${gameState.currentEnemy.name}に${damage}のダメージ！`);
    addBattleLog('残業の力で強力な攻撃を放った！');
    
    if (gameState.currentEnemy.hp <= 0) {
        battleWin();
    } else {
        setTimeout(enemyAttack, 1000);
    }
    
    updateBattleUI();
}

function enemyAttack() {
    if (!gameState.currentEnemy) return;
    
    const damage = gameState.currentEnemy.attack + Math.floor(Math.random() * 5);
    gameState.playerHP -= damage;
    
    soundSystem.damage();
    
    addBattleLog(`${gameState.currentEnemy.name}の攻撃！ 田中太郎に${damage}のダメージ！`);
    
    if (gameState.playerHP <= 0) {
        gameOver();
    }
    
    updateBattleUI();
    updateUI();
}

function battleWin() {
    const moneyEarned = gameState.currentEnemy.money;
    gameState.playerMoney += moneyEarned;
    
    soundSystem.victory();
    setTimeout(() => soundSystem.money(), 500);
    
    addBattleLog(`${gameState.currentEnemy.name}を倒した！`);
    addBattleLog(`¥${moneyEarned}を獲得した！`);
    
    // マップから敵を削除
    const currentMap = mapData[gameState.currentFloor];
    currentMap[gameState.playerY][gameState.playerX] = '.';
    
    if (gameState.currentFloor === 10) {
        setTimeout(() => {
            if (battleOverlay) battleOverlay.classList.remove('active');
            gameClear();
        }, 2000);
        return;
    }
    
    setTimeout(() => {
        if (battleOverlay) battleOverlay.classList.remove('active');
        gameState.inBattle = false;
        gameState.currentEnemy = null;
        updateUI();
        drawMap();
    }, 2000);
}

function addBattleLog(message) {
    if (!battleLog) return;
    const p = document.createElement('p');
    p.textContent = message;
    battleLog.appendChild(p);
    battleLog.scrollTop = battleLog.scrollHeight;
}

// エレベーター
function useElevator() {
    if (gameState.currentFloor >= 10) return;
    
    soundSystem.elevator();
    
    if (elevatorOverlay) elevatorOverlay.classList.add('active');
    if (elevatorMessage) elevatorMessage.textContent = `${gameState.currentFloor + 1}階へ移動中...`;
    
    const doors = document.querySelectorAll('.elevator-door');
    doors.forEach(door => door.classList.add('open'));
    
    setTimeout(() => {
        gameState.currentFloor++;
        gameState.playerX = 1;
        gameState.playerY = 1;
        
        drawMap();
        updateUI();
        
        doors.forEach(door => door.classList.remove('open'));
        if (elevatorOverlay) elevatorOverlay.classList.remove('active');
    }, 3000);
}

// UI更新
function updateUI() {
    if (currentFloorElement) currentFloorElement.textContent = `${gameState.currentFloor}階`;
    if (moneyDisplay) moneyDisplay.textContent = `¥${gameState.playerMoney}`;
    
    const hpPercent = (gameState.playerHP / gameState.playerMaxHP) * 100;
    if (playerHpBar) {
        playerHpBar.style.width = hpPercent + '%';
        if (hpPercent <= 30) {
            playerHpBar.style.background = 'linear-gradient(90deg, #e74c3c 0%, #c0392b 100%)';
        } else {
            playerHpBar.style.background = 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)';
        }
    }
    if (playerHpText) playerHpText.textContent = `${gameState.playerHP}/${gameState.playerMaxHP}`;
}

// ゲーム終了
function gameOver() {
    soundSystem.gameOver();
    if (battleOverlay) battleOverlay.classList.remove('active');
    if (gameScreen) gameScreen.classList.remove('active');
    if (gameOverScreen) gameOverScreen.classList.add('active');
}

function gameClear() {
    soundSystem.victory();
    if (gameScreen) gameScreen.classList.remove('active');
    if (gameClearScreen) gameClearScreen.classList.add('active');
}

function restartGame() {
    if (gameOverScreen) gameOverScreen.classList.remove('active');
    if (gameClearScreen) gameClearScreen.classList.remove('active');
    if (titleScreen) titleScreen.classList.add('active');
    
    // ゲーム状態をリセット
    gameState = {
        currentFloor: 1,
        playerX: 1,
        playerY: 1,
        playerHP: 100,
        playerMaxHP: 100,
        playerAttack: 10,
        playerSpecialAttack: 20,
        playerMoney: 1000,
        inBattle: false,
        currentEnemy: null,
        gameStarted: false
    };
    
    // すべてのオーバーレイを閉じる
    if (shopOverlay) shopOverlay.classList.remove('active');
    if (helpOverlay) helpOverlay.classList.remove('active');
    if (elevatorOverlay) elevatorOverlay.classList.remove('active');
    if (battleOverlay) battleOverlay.classList.remove('active');
}

// アクション
function actionA() {
    if (gameState.inBattle) playerAttack();
}

function actionB() {
    if (gameState.inBattle) playerSpecialAttack();
}

// iOS対応 - タッチイベント最適化とダブルタップ防止
function setupiOSCompatibility() {
    // ダブルタップズーム防止
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // タッチムーブでスクロール防止
    document.addEventListener('touchmove', function(e) {
        if (e.scale !== 1) { e.preventDefault(); }
    }, { passive: false });

    // コンテキストメニュー防止
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // 選択防止
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });

    // ページ移動防止
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    });
}

// キーボード操作
document.addEventListener('keydown', function(e) {
    if (!gameState.gameStarted) {
        if (e.key === 'Enter' || e.key === ' ') {
            if (titleScreen && titleScreen.classList.contains('active')) {
                startGame();
            } else if ((gameOverScreen && gameOverScreen.classList.contains('active')) || 
                       (gameClearScreen && gameClearScreen.classList.contains('active'))) {
                restartGame();
            }
        }
        return;
    }
    
    switch(e.key) {
        case 'ArrowUp': case 'w': case 'W':
            e.preventDefault(); movePlayer('up'); break;
        case 'ArrowDown': case 's': case 'S':
            e.preventDefault(); movePlayer('down'); break;
        case 'ArrowLeft': case 'a': case 'A':
            e.preventDefault(); movePlayer('left'); break;
        case 'ArrowRight': case 'd': case 'D':
            e.preventDefault(); movePlayer('right'); break;
        case 'z': case 'Z': case 'Enter':
            e.preventDefault(); actionA(); break;
        case 'x': case 'X': case ' ':
            e.preventDefault(); actionB(); break;
        case 'Escape':
            e.preventDefault();
            if (shopOverlay && shopOverlay.classList.contains('active')) closeShop();
            if (helpOverlay && helpOverlay.classList.contains('active')) closeHelp();
            break;
        case 'm': case 'M':
            e.preventDefault(); toggleSound(); break;
        case 'h': case 'H':
            e.preventDefault(); 
            if (helpOverlay && helpOverlay.classList.contains('active')) {
                closeHelp();
            } else {
                showHelp();
            }
            break;
    }
});

// DOMコンテンツ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeDOM();
        setupiOSCompatibility(); // iOS対応設定を追加
        console.log('DOM初期化完了');
        
        // 音声システム初期化（ユーザーインタラクション後）
        document.addEventListener('click', function initSound() {
            soundSystem.init();
            document.removeEventListener('click', initSound);
        }, { once: true });
        
        document.addEventListener('touchstart', function initSoundTouch() {
            soundSystem.init();
            document.removeEventListener('touchstart', initSoundTouch);
        }, { once: true, passive: true });
        
    } catch (error) {
        console.error('初期化エラー:', error);
    }
});

// エラーハンドリング
window.addEventListener('error', function(e) {
    console.error('ゲームエラー:', e.error);
});

// 初期化メッセージ
console.log('サラリーマンRPG - ダーク会社編 iOS対応版 読み込み完了！');
console.log('操作方法:');
console.log('- 矢印キーまたはWASDで移動');
console.log('- ZキーまたはEnterで攻撃');
console.log('- XキーまたはSpaceで残業アタック');
console.log('- Mキーで音声ON/OFF切り替え');
console.log('- Hキーでヘルプ表示/非表示');
console.log('- 数字の敵（1,2,3）で異なるタイプの敵と戦闘');
console.log('- 黄色いエレベーターで移動、紫のショップで買い物');
console.log('- タッチ操作も可能です！');
console.log('- iOS Safari対応: タップズーム防止機能搭載！');
