// Tunnel Runner - Motor Completo
let canvas, ctx;
const MAP_SIZE = 15;
let map = [];
let player = { x: 1.5, y: 1.5, dirX: 0, dirY: -1, planeX: 0.66, planeY: 0 };

let monsters = [];
let doors = [];
let keyPos = { x: 7.5, y: 7.5, collected: false };

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

function playBeep(freq, type = 'square', duration = 0.08) {
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

function initLevel() {
    gameOver = false;
    let overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.style.display = 'none';

    // 1. Crear Laberinto
    map = [];
    for (let r = 0; r < MAP_SIZE; r++) {
        map[r] = [];
        for (let c = 0; c < MAP_SIZE; c++) {
            if (r === 0 || r === MAP_SIZE - 1 || c === 0 || c === MAP_SIZE - 1) {
                map[r][c] = 1;
            } else if (r % 2 === 0 && c % 2 === 0) {
                map[r][c] = 1;
            } else {
                map[r][c] = Math.random() < 0.20 ? 1 : 0;
            }
        }
    }

    map[1][1] = 0; map[1][2] = 0; map[2][1] = 0;

    player.x = 1.5; player.y = 1.5;
    player.dirX = 0; player.dirY = -1;
    player.planeX = 0.66; player.planeY = 0;

    // 2. Incrementar monstruos (+1 cada 5 niveles)
    const numMonsters = 1 + Math.floor((level - 1) / 5);
    monsters = [];
    for (let i = 0; i < numMonsters; i++) {
        let mx = MAP_SIZE - 1.5 - (i * 2);
        let my = MAP_SIZE - 1.5;
        map[Math.floor(my)][Math.floor(mx)] = 0;
        monsters.push({
            x: mx,
            y: my,
            speed: 0.02 + (level * 0.003)
        });
    }

    // 3. Posicionar Llave
    keyPos = { x: Math.floor(MAP_SIZE / 2) + 0.5, y: Math.floor(MAP_SIZE / 2) + 0.5, collected: false };
    map[Math.floor(keyPos.y)][Math.floor(keyPos.x)] = 0;

    // 4. Posicionar Puertas (1 Real, 2 Falsas)
    doors = [
        { x: MAP_SIZE - 1.5, y: MAP_SIZE - 1.5, isReal: true },
        { x: 1.5, y: MAP_SIZE - 1.5, isReal: false },
        { x: MAP_SIZE - 1.5, y: 1.5, isReal: false }
    ];
    doors.forEach(d => map[Math.floor(d.y)][Math.floor(d.x)] = 0);

    updateUI();
}

function updateUI() {
    let elLevel = document.getElementById('level');
    let elScore = document.getElementById('score');
    let elLives = document.getElementById('lives');
    if (elLevel) elLevel.innerText = level;
    if (elScore) elScore.innerText = score;
    if (elLives) elLives.innerText = '❤️'.repeat(lives);
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
    playBeep(120, 'square', 0.04);
}

function updateMonstersAI() {
    if (gameOver) return;

    monsters.forEach(m => {
        let dx = player.x - m.x;
        let dy = player.y - m.y;
        let dist = Math.hypot(dx, dy);

        let angle = Math.atan2(dy, dx);
        let stepX = Math.cos(angle) * m.speed;
        let stepY = Math.sin(angle) * m.speed;

        let nextX = m.x + stepX;
        let nextY = m.y + stepY;

        if (map[Math.floor(m.y)][Math.floor(nextX)] === 0) m.x = nextX;
        if (map[Math.floor(nextY)][Math.floor(m.x)] === 0) m.y = nextY;

        if (dist < 0.55) {
            triggerCaught();
        }
    });
}

function triggerCaught() {
    gameOver = true;
    lives--;
    updateUI();

    if (lives <= 0) {
        document.getElementById('game-over-overlay').style.display = 'flex';
    } else {
        setTimeout(() => { initLevel(); }, 1000);
    }
}

function restartGame() {
    lives = 3; score = 0; level = 1;
    initLevel();
}

// Verifica si están en el mismo corredor libre de muros
function hasLineOfSight(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    if (Math.floor(x0) !== Math.floor(x1) && Math.floor(y0) !== Math.floor(y1)) return false;

    let steps = Math.max(dx, dy) * 4;
    for (let i = 0; i <= steps; i++) {
        let cx = x0 + (x1 - x0) * (i / steps);
        let cy = y0 + (y1 - y0) * (i / steps);
        if (map[Math.floor(cy)][Math.floor(cx)] === 1) return false;
    }
    return true;
}

function render() {
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    let zBuffer = new Array(w);

    // Renderizado Raycasting de Muros
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

        let hit = 0, side = 0;
        while (hit === 0) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX; mapX += stepX; side = 0;
            } else {
                sideDistY += deltaDistY; mapY += stepY; side = 1;
            }
            if (map[mapY] && map[mapY][mapX] > 0) hit = 1;
        }

        let perpWallDist = (side === 0) ? (mapX - player.x + (1 - stepX) / 2) / rayDirX : (mapY - player.y + (1 - stepY) / 2) / rayDirY;
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

    // Dibujar Monstruos (Visibles si comparten corredor)
    monsters.forEach(m => {
        if (hasLineOfSight(player.x, player.y, m.x, m.y)) {
            renderSprite3D(m.x, m.y, '#ff0000', w, h, zBuffer, true);
        }
    });

    // Dibujar Llave (Si no se ha recogido)
    if (!keyPos.collected && hasLineOfSight(player.x, player.y, keyPos.x, keyPos.y)) {
        renderSprite3D(keyPos.x, keyPos.y, '#ffff00', w, h, zBuffer, false);
    }

    checkPickupsAndDoors();
    renderMinimap();
    updateMonstersAI();

    requestAnimationFrame(render);
}

function renderSprite3D(objX, objY, color, w, h, zBuffer, isMonster) {
    let spriteX = objX - player.x;
    let spriteY = objY - player.y;

    let invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
    let transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
    let transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);

    if (transformY > 0) {
        let spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
        let spriteHeight = Math.abs(Math.floor(h / transformY));

        if (spriteScreenX > 0 && spriteScreenX < w && transformY < zBuffer[spriteScreenX]) {
            let size = Math.min(spriteHeight, 160);
            let cx = spriteScreenX;
            let cy = h / 2;

            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 3;

            if (isMonster) {
                ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
                ctx.fillRect(cx - size / 4, cy - size / 4, size / 5, size / 5);
                ctx.fillRect(cx + size / 20, cy - size / 4, size / 5, size / 5);
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function checkPickupsAndDoors() {
    if (!keyPos.collected && Math.hypot(player.x - keyPos.x, player.y - keyPos.y) < 0.7) {
        keyPos.collected = true;
        score += 300;
        playBeep(600, 'triangle', 0.15);
        updateUI();
    }

    doors.forEach(d => {
        if (Math.hypot(player.x - d.x, player.y - d.y) < 0.7) {
            if (d.isReal && keyPos.collected) {
                level++;
                score += 1000;
                playBeep(850, 'sine', 0.25);
                initLevel();
            } else if (!d.isReal) {
                player.x -= player.dirX * 0.3;
                player.y -= player.dirY * 0.3;
                playBeep(90, 'sawtooth', 0.1);
            }
        }
    });
}

function renderMinimap() {
    const mm = 4;
    const offX = 530, offY = 10;

    ctx.fillStyle = "rgba(0, 30, 0, 0.8)";
    ctx.fillRect(offX, offY, MAP_SIZE * mm, MAP_SIZE * mm);

    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = "#00aa00";
                ctx.fillRect(offX + c * mm, offY + r * mm, mm - 1, mm - 1);
            }
        }
    }

    doors.forEach(d => {
        ctx.fillStyle = (d.isReal && keyPos.collected) ? "#00ffff" : "#ff0055";
        ctx.fillRect(offX + d.x * mm - 1, offY + d.y * mm - 1, 3, 3);
    });

    if (!keyPos.collected) {
        ctx.fillStyle = "#ffff00";
        ctx.fillRect(offX + keyPos.x * mm - 1, offY + keyPos.y * mm - 1, 3, 3);
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(offX + player.x * mm - 1, offY + player.y * mm - 1, 3, 3);

    monsters.forEach(m => {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(offX + m.x * mm - 1, offY + m.y * mm - 1, 4, 4);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        initLevel();
        requestAnimationFrame(render);
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') turn(-0.2);
    if (e.key === 'ArrowRight') turn(0.2);
    if (e.key === 'ArrowUp') move(0.2);
    if (e.key === 'ArrowDown') move(-0.2);
});