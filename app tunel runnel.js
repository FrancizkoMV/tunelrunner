// Tunnel Runner - Corrección de Colisiones y Proyección
let canvas, ctx;
const MAP_SIZE = 15;
let map = [];
let player = { x: 1.5, y: 1.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 }; // Mirando a la derecha

let monsters = [];
let doors = [];
let keyPos = { x: 7.5, y: 7.5, collected: false };

let level = 1;
let score = 0;
let lives = 3;
let gameOver = false;

// Audio Context
let audioCtx = null;
let lastHeartbeatTime = 0;

const inputState = { up: false, down: false, left: false, right: false };

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

function playHeartbeat(minDistance) {
    initAudio();
    if (!audioCtx) return;

    let now = Date.now();
    let interval = Math.max(120, Math.min(1200, minDistance * 120));

    if (now - lastHeartbeatTime > interval) {
        lastHeartbeatTime = now;
        let freq = 110 - Math.min(50, minDistance * 5);
        playBeep(freq, 'sawtooth', 0.06);
    }
}

function startAction(action) {
    initAudio();
    inputState[action] = true;
}

function stopAction(action) {
    inputState[action] = false;
}

function processInputs() {
    if (gameOver) return;

    const turnSpeed = 0.04;
    const moveSpeed = 0.05;

    if (inputState.left) turn(-turnSpeed);
    if (inputState.right) turn(turnSpeed);
    if (inputState.up) move(moveSpeed);
    if (inputState.down) move(-moveSpeed);
}

function initLevel() {
    gameOver = false;
    let overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.style.display = 'none';

    // 1. Crear bordes exteriores sólides y limpiar el interior con estructura amplia
    map = [];
    for (let r = 0; r < MAP_SIZE; r++) {
        map[r] = [];
        for (let c = 0; c < MAP_SIZE; c++) {
            if (r === 0 || r === MAP_SIZE - 1 || c === 0 || c === MAP_SIZE - 1) {
                map[r][c] = 1; // Paredes de borde
            } else {
                map[r][c] = 0; // Pasillos abiertos por defecto
            }
        }
    }

    // 2. Insertar bloques internos dispersos para crear un laberinto donde NUNCA quedas atrapado
    for (let r = 2; r < MAP_SIZE - 2; r += 2) {
        for (let c = 2; c < MAP_SIZE - 2; c += 2) {
            if (Math.random() > 0.3) {
                map[r][c] = 1;
            }
        }
    }

    // 3. Posicionar e inicializar al Jugador en una zona 100% limpia y mirando a espacio abierto
    player.x = 1.5; 
    player.y = 1.5;
    player.dirX = 1; player.dirY = 0;
    player.planeX = 0; player.planeY = 0.66;

    // Asegurar espacio alrededor de la entrada
    map[1][1] = 0; map[1][2] = 0; map[1][3] = 0;
    map[2][1] = 0; map[2][2] = 0;

    // 4. Configurar Monstruos (Velocidad ajustada según sub-nivel)
    const numMonsters = 1 + Math.floor((level - 1) / 5);
    const subLevel = ((level - 1) % 5); 
    const baseSpeed = 0.006 + (subLevel * 0.002); // Inicio muy lento

    monsters = [];
    for (let i = 0; i < numMonsters; i++) {
        let mx = MAP_SIZE - 2;
        let my = MAP_SIZE - 2 - (i * 2);
        if (my < 1) my = MAP_SIZE - 2;

        map[my][mx] = 0; map[my][mx - 1] = 0;

        monsters.push({
            x: mx + 0.5,
            y: my + 0.5,
            speed: baseSpeed
        });
    }

    // 5. Posicionar Llave en el centro
    let keyX = Math.floor(MAP_SIZE / 2);
    let keyY = Math.floor(MAP_SIZE / 2);
    map[keyY][keyX] = 0; map[keyY + 1][keyX] = 0; map[keyY][keyX + 1] = 0;
    keyPos = { x: keyX + 0.5, y: keyY + 0.5, collected: false };

    // 6. Puertas (1 Real, 2 Falsas)
    doors = [
        { x: MAP_SIZE - 1.5, y: 1.5, isReal: true },
        { x: 1.5, y: MAP_SIZE - 1.5, isReal: false },
        { x: MAP_SIZE - 1.5, y: MAP_SIZE - 1.5, isReal: false }
    ];
    doors.forEach(d => {
        let gx = Math.floor(d.x);
        let gy = Math.floor(d.y);
        map[gy][gx] = 0;
    });

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
    let oldDirX = player.dirX;
    player.dirX = player.dirX * Math.cos(angle) - player.dirY * Math.sin(angle);
    player.dirY = oldDirX * Math.sin(angle) + player.dirY * Math.cos(angle);

    let oldPlaneX = player.planeX;
    player.planeX = player.planeX * Math.cos(angle) - player.planeY * Math.sin(angle);
    player.planeY = oldPlaneX * Math.sin(angle) + player.planeY * Math.cos(angle);
}

function move(speed) {
    if (gameOver) return;
    let newX = player.x + player.dirX * speed;
    let newY = player.y + player.dirY * speed;

    if (map[Math.floor(player.y)][Math.floor(newX)] === 0) player.x = newX;
    if (map[Math.floor(newY)][Math.floor(player.x)] === 0) player.y = newY;
}

function updateMonstersAI() {
    if (gameOver) return;

    let closestDistance = 999;

    monsters.forEach(m => {
        let dx = player.x - m.x;
        let dy = player.y - m.y;
        let dist = Math.hypot(dx, dy);

        if (dist < closestDistance) closestDistance = dist;

        let angle = Math.atan2(dy, dx);
        let stepX = Math.cos(angle) * m.speed;
        let stepY = Math.sin(angle) * m.speed;

        let nextX = m.x + stepX;
        let nextY = m.y + stepY;

        if (map[Math.floor(m.y)][Math.floor(nextX)] === 0) m.x = nextX;
        if (map[Math.floor(nextY)][Math.floor(m.x)] === 0) m.y = nextY;

        if (dist < 0.5) {
            triggerCaught();
        }
    });

    if (!gameOver && monsters.length > 0) {
        playHeartbeat(closestDistance);
    }
}

function triggerCaught() {
    gameOver = true;
    lives--;
    updateUI();
    playBeep(80, 'sawtooth', 0.4);

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

function render() {
    if (!ctx) return;

    processInputs();

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    let zBuffer = new Array(w);

    // Raycast para Muros
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

    // Renderizado 3D de Objetos (Puertas, Llaves y Monstruos)
    doors.forEach(d => {
        renderSprite3D(d.x, d.y, d.isReal ? '#00ffff' : '#ff0055', w, h, zBuffer, 'door');
    });

    if (!keyPos.collected) {
        renderSprite3D(keyPos.x, keyPos.y, '#ffff00', w, h, zBuffer, 'key');
    }

    monsters.forEach(m => {
        renderSprite3D(m.x, m.y, '#ff0000', w, h, zBuffer, 'monster');
    });

    checkPickupsAndDoors();
    renderMinimap();
    updateMonstersAI();

    requestAnimationFrame(render);
}

function renderSprite3D(objX, objY, color, w, h, zBuffer, type) {
    let spriteX = objX - player.x;
    let spriteY = objY - player.y;

    let invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
    let transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
    let transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);

    if (transformY > 0.1) {
        let spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
        let spriteHeight = Math.abs(Math.floor(h / transformY));

        let cx = spriteScreenX;
        let cy = h / 2;

        if (cx >= 0 && cx < w && transformY < zBuffer[cx]) {
            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            if (type === 'monster') {
                let size = Math.min(spriteHeight, 130);
                ctx.lineWidth = 3;
                ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
                ctx.fillRect(cx - size / 4, cy - size / 4, size / 5, size / 5);
                ctx.fillRect(cx + size / 20, cy - size / 4, size / 5, size / 5);
            } else if (type === 'key') {
                let size = Math.min(spriteHeight / 3, 25);
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(size, 8), 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'door') {
                let sizeW = Math.min(spriteHeight / 2, 50);
                let sizeH = Math.min(spriteHeight, 100);
                ctx.lineWidth = 3;
                ctx.strokeRect(cx - sizeW / 2, cy - sizeH / 2, sizeW, sizeH);
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

    ctx.fillStyle = "rgba(0, 30, 0, 0.85)";
    ctx.fillRect(offX, offY, MAP_SIZE * mm, MAP_SIZE * mm);

    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = "#00aa00";
                ctx.fillRect(offX + c * mm, offY + r * mm, mm - 1, mm - 1);
            }
        }
    }

    // Puertas (Cyan = Real, Rojo = Falsa)
    doors.forEach(d => {
        ctx.fillStyle = (d.isReal && keyPos.collected) ? "#00ffff" : "#ff0055";
        ctx.fillRect(offX + d.x * mm - 1, offY + d.y * mm - 1, 4, 4);
    });

    // Llave (Amarillo)
    if (!keyPos.collected) {
        ctx.fillStyle = "#ffff00";
        ctx.fillRect(offX + keyPos.x * mm - 1, offY + keyPos.y * mm - 1, 4, 4);
    }

    // Jugador (Blanco)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(offX + player.x * mm - 1, offY + player.y * mm - 1, 4, 4);

    // Monstruos (Rojo)
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

// Teclado PC
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') inputState.left = true;
    if (e.key === 'ArrowRight') inputState.right = true;
    if (e.key === 'ArrowUp') inputState.up = true;
    if (e.key === 'ArrowDown') inputState.down = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') inputState.left = false;
    if (e.key === 'ArrowRight') inputState.right = false;
    if (e.key === 'ArrowUp') inputState.up = false;
    if (e.key === 'ArrowDown') inputState.down = false;
});
