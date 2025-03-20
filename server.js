const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let players = {};
let flippedCards = [];
let matchedPairs = 0;
let gameDuration = 60; // Duración del juego en segundos
let intervalId;
let currentPlayer = null; // Para controlar el turno de los jugadores

// Lista de imágenes (coloca las imágenes en la carpeta /public/img/)
let images = [
    'img/img1.jpg', 'img/img1.jpg', 'img/img2.jpg', 'img/img2.jpg',
    'img/img3.jpg', 'img/img3.jpg', 'img/img4.jpg', 'img/img4.jpg',
    'img/img5.jpg', 'img/img5.jpg', 'img/img6.jpg', 'img/img6.jpg',
    'img/img7.jpg', 'img/img7.jpg', 'img/img8.jpg', 'img/img8.jpg'
];
images = shuffle(images);

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

wss.on('connection', function connection(ws) {
    let playerId = `Player-${Math.floor(Math.random() * 1000)}`;
    players[playerId] = { ws, score: 0 };
    
    // Enviar imágenes y temporizador al jugador
    ws.send(JSON.stringify({ type: 'init', playerId, images, gameDuration }));

    if (!currentPlayer) {
        currentPlayer = playerId; // Establecer el primer jugador
    }

    // Enviar el turno actual
    ws.send(JSON.stringify({ type: 'turn', currentPlayer }));

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === 'flip') {
            if (flippedCards.length < 2 && data.playerId === currentPlayer) {
                flippedCards.push({ index: data.index, playerId: data.playerId });
                broadcast({ type: 'flip', index: data.index, image: images[data.index] });

                if (flippedCards.length === 2) {
                    setTimeout(checkMatch, 1000);
                }
            }
        }
    });

    ws.on('close', () => {
        delete players[playerId];
        if (currentPlayer === playerId) {
            // Si el jugador que se desconectó es el que tiene el turno, cambiar el turno
            currentPlayer = Object.keys(players)[0];
            broadcast({ type: 'turn', currentPlayer });
        }
    });

    if (Object.keys(players).length === 1) {
        startTimer();
    }
});

// Comprobar si las cartas volteadas son un par
function checkMatch() {
    const player1 = flippedCards[0];
    const player2 = flippedCards[1];

    if (player1.index !== player2.index && images[player1.index] === images[player2.index]) {
        players[player1.playerId].score += 1;
        players[player2.playerId].score += 1;
        broadcast({
            type: 'match',
            playerId: player1.playerId,
            score: players[player1.playerId].score,
            indexes: [player1.index, player2.index]
        });

        matchedPairs++;
        if (matchedPairs === images.length / 2) {
            broadcast({ type: 'gameOver' });
            clearInterval(intervalId);
        }
    } else {
        broadcast({ type: 'unflip', indexes: [player1.index, player2.index] });
    }

    // Cambiar el turno
    currentPlayer = (currentPlayer === player1.playerId) ? player2.playerId : player1.playerId;
    broadcast({ type: 'turn', currentPlayer });

    flippedCards = [];
}

// Iniciar el temporizador del juego
function startTimer() {
    clearInterval(intervalId);
    intervalId = setInterval(() => {
        gameDuration--;
        broadcast({ type: 'timerUpdate', gameDuration });
        if (gameDuration <= 0) {
            clearInterval(intervalId);
            broadcast({ type: 'gameOver' });
        }
    }, 1000);
}

// Enviar datos a todos los clientes
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

server.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
});
