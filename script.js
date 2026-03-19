/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');

// Set canvas size
function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resize();
window.addEventListener('resize', resize);

// Game variables
let gameActive = false;
let score = 0;
let animationId;
let obstacles = [];
let particles = [];
let frame = 0;
let nextObstacleFrame = 100;

const player = {
    x: 50,
    y: 0,
    width: 30,
    height: 30,
    dy: 0,
    jumpForce: 12,
    gravity: 0.6,
    color: '#00ffff',
    glow: '#00ffff',

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.glow;
        ctx.fillStyle = this.color;

        // Draw player as a rounded cube
        const radius = 5;
        ctx.beginPath();
        ctx.moveTo(this.x + radius, this.y);
        ctx.lineTo(this.x + this.width - radius, this.y);
        ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
        ctx.lineTo(this.x + this.width, this.y + this.height - radius);
        ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - radius, this.y + this.height);
        ctx.lineTo(this.x + radius, this.y + this.height);
        ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - radius);
        ctx.lineTo(this.x, this.y + radius);
        ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    update() {
        this.dy += this.gravity;
        this.y += this.dy;

        // Ground collision
        if (this.y + this.height > canvas.height - 20) {
            this.y = canvas.height - 20 - this.height;
            this.dy = 0;
        }

        // Ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.dy = 0;
        }

        this.draw();
    },

    jump() {
        if (this.y + this.height >= canvas.height - 21) {
            this.dy = -this.jumpForce;
            createJumpParticles(this.x + this.width / 2, this.y + this.height);
        }
    }
};

class Obstacle {
    constructor() {
        this.width = 30 + Math.random() * 30;
        this.height = 30 + Math.random() * 40;
        this.x = canvas.width;
        this.y = canvas.height - 20 - this.height;

        // Öka hastigheten med 1 för varje 300 poäng
        const speedMultiplier = Math.floor(score / 300);
        this.speed = 4 + speedMultiplier;

        this.color = '#ff00ff';
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    update() {
        this.x -= this.speed;
        this.draw();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.color = color;
        this.opacity = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createJumpParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, '#00ffff'));
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, '#ff00ff'));
    }
}

function handleObstacles() {
    // Spawn nästa hinder när vi når rätt frame
    if (frame >= nextObstacleFrame) {
        obstacles.push(new Obstacle());

        // Beräkna när nästa hinder ska dyka upp
        const speedMultiplier = Math.floor(score / 300);

        // Startar på 80 (som originalet), men minskar snabbare nu (-8 istället för -2)
        // så att det blir intensivt i hög fart.
        const minGap = Math.max(35, 80 - speedMultiplier * 8);
        const randomExtra = Math.random() * 30; // Mindre slump i hög fart för mer konstant tempo

        nextObstacleFrame = frame + minGap + randomExtra;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();

        // Collision detection
        if (
            player.x < obstacles[i].x + obstacles[i].width &&
            player.x + player.width > obstacles[i].x &&
            player.y < obstacles[i].y + obstacles[i].height &&
            player.y + player.height > obstacles[i].y
        ) {
            gameOver();
        }

        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score += 100;
            scoreElement.innerText = `Poäng: ${score}`;
        }
    }
}

function handleParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].opacity <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawBackground() {
    // Ground
    ctx.strokeStyle = '#9d00ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 20);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.stroke();

    // Grid lines for "retro" feel
    ctx.strokeStyle = 'rgba(157, 0, 255, 0.1)';
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i - (frame % 40), canvas.height - 20);
        ctx.lineTo(i - (frame % 40) - 200, canvas.height);
        ctx.stroke();
    }
}

function animate() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    player.update();
    handleObstacles();
    handleParticles();

    frame++;
    animationId = requestAnimationFrame(animate);
}

function startGame() {
    gameActive = true;
    score = 0;
    frame = 0;
    nextObstacleFrame = 100;
    obstacles = [];
    particles = [];
    scoreElement.innerText = `Poäng: 0`;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    animate();
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    createExplosion(player.x + player.width / 2, player.y + player.height / 2);

    // Final draw to show explosion
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    handleParticles();

    finalScoreElement.innerText = `Slutgiltig poäng: ${score}`;
    gameOverScreen.classList.remove('hidden');
}

// Event Listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'ArrowUp') {
        if (gameActive) {
            player.jump();
        } else if (startScreen.classList.contains('hidden')) {
            startGame();
        } else {
            startGame();
        }
    }
});

canvas.addEventListener('mousedown', () => {
    if (gameActive) player.jump();
});
