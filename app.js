// Pure HTML5 Canvas Raycaster for Tunnel Runner (Zero External Dependencies)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const MAP_SIZE = 12;
let map = [];
let player = { x: 1.5, y: 1.5, dirX: 0, dirY: -1, planeX: 0.66, planeY: 0 };
let zizo = { x: 10.5, y: 10.5 };
let level = 1;
let score = 0;

function initMap() {
    map = [];
    for (let r = 0; r < MAP_SIZE; r++) {
        map[r] = [];
        for (let c = 0; c < MAP_SIZE; c++) {
            if (r === 0 || r === MAP_SIZE - 1 || c === 0 || c === MAP_SIZE - 1) {
                map[r][c] = 1;
            } else if (r % 2 === 0 && c % 2 === 0) {
                map[r][c] = 1;
            } else {
                map[r][c] = Math.random() < 0.2 ? 1 : 0;
            }
        }
    }
    map[1][1] = 0;
    map[MAP_SIZE - 2][MAP_SIZE - 2] = 0;
    zizo = { x: MAP_SIZE - 1.5, y: MAP_SIZE - 1.5 };
}

function turn(angle) {
    let oldDirX = player.dirX;
    player.dirX = player.dirX * Math.cos(angle) - player.dirY * Math.sin(angle);
    player.dirY = oldDirX * Math.sin(angle) + player.dirY * Math.cos(angle);
    
    let oldPlaneX = player.planeX;
    player.planeX = player.planeX * Math.cos(angle) - player.planeY * Math.sin(angle);
    player.planeY = oldPlaneX * Math.sin(angle) + player.planeY * Math.cos(angle);
}

function move(speed) {
    let newX = player.x + player.dirX * speed;
    let newY = player.y + player.dirY * speed;
    if (map[Math.floor(player.y)][Math.floor(newX)] === 0) player.x = newX;
    if (map[Math.floor(newY)][Math.floor(player.x)] === 0) player.y = newY;
}

function render() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Raycasting Wireframe Vector Walls
    const w = canvas.width;
    const h = canvas.height;

    for (let x = 0; x < w; x += 8) {
        let cameraX = 2 * x / w - 1;
        let rayDirX = player.dirX + player.planeX * cameraX;
        let rayDirY = player.dirY + player.planeY * cameraX;

        let mapX = Math.floor(player.x);
        let mapY = Math.floor(player.y);

        let deltaDistX = Math.abs(1 / rayDirX);
        let deltaDistY = Math.abs(1 / rayDirY);

        let stepX, stepY;
        let sideDistX, sideDistY;

        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (player.x - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
        }

        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (player.y - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
        }

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

        let lineHeight = Math.floor(h / perpWallDist);
        let drawStart = -lineHeight / 2 + h / 2;
        let drawEnd = lineHeight / 2 + h / 2;

        ctx.strokeStyle = side === 1 ? '#00cc00' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, drawStart);
        ctx.lineTo(x, drawEnd);
        ctx.stroke();
    }

    // Render Minimap
    const mm = 6;
    const offX = 520;
    const offY = 15;
    ctx.fillStyle = "rgba(0, 40, 0, 0.7)";
    ctx.fillRect(offX, offY, MAP_SIZE * mm, MAP_SIZE * mm);

    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = "#00ff00";
                ctx.fillRect(offX + c * mm, offY + r * mm, mm - 1, mm - 1);
            }
        }
    }

    // Player on Minimap
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(offX + player.x * mm - 2, offY + player.y * mm - 2, 4, 4);

    // Goal on Minimap
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(offX + zizo.x * mm - 2, offY + zizo.y * mm - 2, 4, 4);

    // Check Win
    if (Math.hypot(player.x - zizo.x, player.y - zizo.y) < 0.6) {
        level++;
        score += 500;
        document.getElementById('level').innerText = level;
        document.getElementById('score').innerText = score;
        initMap();
        player.x = 1.5;
        player.y = 1.5;
    }

    requestAnimationFrame(render);
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

initMap();
requestAnimationFrame(render);
