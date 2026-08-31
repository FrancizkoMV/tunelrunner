// Tunnel Runner Pseudo-3D Engine with Monster AI & Audio (Atari 1983 Clone)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const MAP_SIZE = 14;
let map = [];
let player = { x: 1.5, y: 1.5, dirX: 0, dirY: -1, planeX: 0.66, planeY: 0 };
let monster = { x: 12.5, y: 12.5, speed: 0.035, state: 'patrol', targetX: 1.5, targetY: 1.5 };
let exitGate = { x: 12.5, y: 12.5 };
let keyPos = { x: 6.5, y: 6.5, collected: false };

let level = 1;
let score = 0;
let lives = 3;
let gameOver = false;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep(freq, type = 'square', duration = 0.1) {
    if (!audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function playRoar() {
    if (!audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    } catch(e) {}
}

function initLevel() {
    gameOver = false;
    document.getElementById('game-over-overlay').style.display = 'none';
    
    // Generate Maze
    map = [];
    for (let r = 0; r < MAP_SIZE; r++) {
        map[r] = [];
        for (let c = 0; c < MAP_SIZE; c++) {
            if (r === 0 || r === MAP_SIZE - 1 || c === 0 || c === MAP_SIZE - 1) {
                map[r][c] = 1;
            } else if (r % 2 === 0 && c % 2 === 0) {
                map[r][c] = 1;
            } else {
                map[r][c] = Math.random() < 0.22 ? 1 : 0;
            }
        }
    }

    // Ensure Start, Exit and Key locations are clear
    map[1][1] = 0; map[1][2] = 0; map[2][1] = 0;
    map[MAP_SIZE - 2][MAP_SIZE - 2] = 0;
    map[MAP_SIZE - 2][MAP_SIZE - 3] = 0;

    player.x = 1.5;
    player.y = 1.5;
    player.dirX = 0; player.dirY = -1;
    player.planeX = 0.66; player.planeY = 0;

    monster.x = MAP_SIZE - 1.5;
    monster.y = MAP_SIZE - 1.5;
    monster.speed = 0.03 + (level * 0.005); // Speed increases per level

    exitGate = { x: MAP_SIZE - 1.5, y: MAP_SIZE - 1.5 };
    keyPos = { x: Math.floor(MAP_SIZE / 2) + 0.5, y: Math.floor(MAP_SIZE / 2) + 0.5, collected: false };
    map[Math.floor(keyPos.y)][Math.floor(keyPos.x)] = 0;

    updateUI();
}

function updateUI() {
    document.getElementById('level').innerText = level;
    document.getElementById('score').innerText = score;
    document.getElementById('lives').innerText = '❤️'.repeat(lives);
}

function turn(angle) {
    if (gameOver) return;
    initAudio();
    let oldDirX = player.dirX;
    player.dirX = player.dirX * Math.cos(angle) - player.dirY * Math.sin(angle);
    player.dirY = oldDirX * Math.sin(angle) + player.dirY * Math.cos(angle);

    let oldPlaneX = player.planeX;
    player.planeX = player.planeX * Math.cos(angle) - player.planeY * Math.sin(angle);
    player.planeY = oldPlaneX * Math.sin(angle) + player.planeY * Math.cos(angle);
    playBeep(200, 'sine', 0.03);
}

function move(speed) {
    if (gameOver) return;
    initAudio();
    let newX = player.x + player.dirX * speed;
    let newY = player.y + player.dirY * speed;
    
    if (map[Math.floor(player.y)][Math.floor(newX)] === 0) player.x = newX;
    if (map[Math.floor(newY)][Math.floor(player.x)] === 0) player.y = newY;
    playBeep(120, 'square', 0.05);
}

function updateMonsterAI() {
    if (gameOver) return;

    let distToPlayer = Math.hypot(player.x - monster.x, player.y - monster.y);

    // Chase player if close (sight radius) or always in higher levels
    let dx = player.x - monster.x;
    let dy = player.y - monster.y;
    let angle = Math.atan2(dy, dx);

    let stepX = Math.cos(angle) * monster.speed;
    let stepY = Math.sin(angle) * monster.speed;

    // Check collision with walls for Monster
    let nextX = monster.x + stepX;
    let nextY = monster.y + stepY;

    if (map[Math.floor(monster.y)][Math.floor(nextX)] === 0) monster.x = nextX;
    if (map[Math.floor(nextY)][Math.floor(monster.x)] === 0) monster.y = nextY;

    // Monster Catches Player
    if (distToPlayer < 0.6) {
        triggerCaught();
    }
}

function triggerCaught() {
    gameOver = true;
    lives--;
    playRoar();
    updateUI();

    if (lives <= 0) {
        document.getElementById('game-over-overlay').style.display = 'flex';
    } else {
        setTimeout(() => {
            initLevel();
        }, 1200);
    }
}

function restartGame() {
    lives = 3;
    score = 0;
    level = 1;
    initLevel();
}

function render() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    let zBuffer = new Array(w);

    // 1. Raycast Walls
    for (let x = 0; x < w; x += 4) {
        let cameraX = 2 * x / w - 1;
        let rayDirX = player.dirX + player.planeX * cameraX;
        let rayDirY = player.dirY + player.planeY * cameraX;

        let mapX = Math.floor(player.x);
        let mapY = Math.floor(player.y);

        let deltaDistX = Math.abs(1 / rayDirX);
        let deltaDistY = Math.abs(1 / rayDirY);

        let stepX = (rayDirX < 0) ? -1 : 1;
        let sideDistX = (rayDirX < 0) ? (player.x - mapX) * deltaDistX : (mapX + 1.0 - player.x) * deltaDistX;

        let stepY = (rayDirY < 0) ? -1 : 1;
        let sideDistY = (rayDirY < 0) ? (player.y - mapY) * deltaDistY : (mapY + 1.0 - player.y) * deltaDistY;

        let hit = 0;
        let side = 0;

        while (hit === 0) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }
            if (map[mapY][mapX] > 0) hit = 1;
        }

        let perpWallDist = (side === 0) ? (mapX - player.x + (1 - stepX) / 2) / rayDirX : (mapY - player.y + (1 - stepY) / 2) / rayDirY;
        
        // Save distance in Z-Buffer for sprite rendering
        for(let i = 0; i < 4; i++) zBuffer[x + i] = perpWallDist;

        let lineHeight = Math.floor(h / perpWallDist);
        let drawStart = -lineHeight / 2 + h / 2;
        let drawEnd = lineHeight / 2 + h / 2;

        ctx.strokeStyle = side === 1 ? '#00bb00' : '#00ff00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, drawStart);
        ctx.lineTo(x, drawEnd);
        ctx.stroke();
    }

    // 2. Render Zizo / Monster Sprite in 3D Space
    renderMonsterSprite(w, h, zBuffer);

    // 3. Render Key Pickup & Exit Gate Check
    checkPickupsAndExit();

    // 4. Render Radar / Minimap
    renderMinimap();

    updateMonsterAI();

    requestAnimationFrame(render);
}

function renderMonsterSprite(w, h, zBuffer) {
    let spriteX = monster.x - player.x;
    let spriteY = monster.y - player.y;

    let invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
    let transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
    let transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);

    if (transformY > 0) {
        let spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
        let spriteHeight = Math.abs(Math.floor(h / transformY));
        let spriteWidth = spriteHeight;

        let drawStartY = -spriteHeight / 2 + h / 2;
        let drawEndY = spriteHeight / 2 + h / 2;
        let drawStartX = -spriteWidth / 2 + spriteScreenX;
        let drawEndX = spriteWidth / 2 + spriteScreenX;

        // Draw Monster Wireframe Eyes & Mouth if in front of wall
        if (spriteScreenX > 0 && spriteScreenX < w && transformY < zBuffer[spriteScreenX]) {
            let size = Math.min(spriteWidth, 180);
            let cx = spriteScreenX;
            let cy = h / 2;

            ctx.strokeStyle = '#ff0000';
            ctx.fillStyle = '#ff0000';
            ctx.lineWidth = 3;

            // Monster Body Box
            ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);

            // Glowing Eyes
            ctx.fillRect(cx - size / 4, cy - size / 4, size / 5, size / 5);
            ctx.fillRect(cx + size / 20, cy - size / 4, size / 5, size / 5);

            // Spiky Teeth
            ctx.beginPath();
            ctx.moveTo(cx - size / 3, cy + size / 6);
            ctx.lineTo(cx - size / 6, cy + size / 3);
            ctx.lineTo(cx, cy + size / 6);
            ctx.lineTo(cx + size / 6, cy + size / 3);
            ctx.lineTo(cx + size / 3, cy + size / 6);
            ctx.stroke();
        }
    }
}

function checkPickupsAndExit() {
    // Key pickup logic
    if (!keyPos.collected && Math.hypot(player.x - keyPos.x, player.y - keyPos.y) < 0.7) {
        keyPos.collected = true;
        score += 250;
        playBeep(600, 'triangle', 0.2);
        updateUI();
    }

    // Exit reach logic
    if (keyPos.collected && Math.hypot(player.x - exitGate.x, player.y - exitGate.y) < 0.7) {
        level++;
        score += 1000;
        playBeep(800, 'sine', 0.3);
        initLevel();
    }
}

function renderMinimap() {
    const mm = 6;
    const offX = 520;
    const offY = 15;

    ctx.fillStyle = "rgba(0, 30, 0, 0.75)";
    ctx.fillRect(offX, offY, MAP_SIZE * mm, MAP_SIZE * mm);

    // Walls
    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = "#00aa00";
                ctx.fillRect(offX + c * mm, offY + r * mm, mm - 1, mm - 1);
            }
        }
    }

    // Key (Yellow Dot)
    if (!keyPos.collected) {
        ctx.fillStyle = "#ffff00";
        ctx.fillRect(offX + keyPos.x * mm - 2, offY + keyPos.y * mm - 2, 4, 4);
    }

    // Exit Gate (Blue/Cyan Dot when open)
    ctx.fillStyle = keyPos.collected ? "#00ffff" : "#555555";
    ctx.fillRect(offX + exitGate.x * mm - 2, offY + exitGate.y * mm - 2, 4, 4);

    // Player (White Dot)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(offX + player.x * mm - 2, offY + player.y * mm - 2, 4, 4);

    // Zizo Monster (Red Pulsing Dot)
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(offX + monster.x * mm - 3, offY + monster.y * mm - 3, 6, 6);
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') turn(-Math.PI / 12);
    if (e.key === 'ArrowRight') turn(Math.PI / 12);
    if (e.key === 'ArrowUp') move(0.2);
    if (e.key === 'ArrowDown') move(-0.2);
});

const bindTouch = (id, action) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('touchstart', (e) => { e.preventDefault(); action(); });
        el.addEventListener('click', () => action());
    }
};

bindTouch('btn-left', () => turn(-Math.PI / 8));
bindTouch('btn-right', () => turn(Math.PI / 8));
bindTouch('btn-up', () => move(0.25));
bindTouch('btn-down', () => move(-0.25));

initLevel();
requestAnimationFrame(render);
