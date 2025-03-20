const socket = new WebSocket('ws:memory-game-production-ce2b.up.railway.app');
let playerId;
let score = 0;
let gameBoard = document.getElementById('gameBoard');
let scoreDisplay = document.getElementById('score');
let flippedCards = {};
let currentPlayerDisplay = document.getElementById('playerId');

// Cargar sonidos
const correctSound = new Audio('sounds/correct.mp3');
const wrongSound = new Audio('sounds/wrong.mp3');

let timerDisplay = document.createElement('h3');
document.body.insertBefore(timerDisplay, gameBoard);

// Manejo de mensajes WebSocket
socket.onmessage = function(event) {
    let data = JSON.parse(event.data);

    if (data.type === 'init') {
        playerId = data.playerId;
        document.getElementById('playerId').innerText = `Player: ${playerId}`;
        createBoard(data.images);
        timerDisplay.innerText = `Time Left: ${data.gameDuration}s`;
    } else if (data.type === 'flip') {
        flipCard(data.index, data.image);
    } else if (data.type === 'unflip') {
        setTimeout(() => {
            unflipCards(data.indexes);
            wrongSound.play(); // Sonido de fallo
        }, 1000);
    } else if (data.type === 'match') {
        if (data.playerId === playerId) {
            score = data.score;
            scoreDisplay.innerText = `Score: ${score}`;
        }
        setTimeout(() => {
            removeMatchedCards(data.indexes);
            correctSound.play(); // Sonido de acierto
        }, 1000);
    } else if (data.type === 'timerUpdate') {
        timerDisplay.innerText = `Time Left: ${data.gameDuration}s`;
    } else if (data.type === 'gameOver') {
        alert('Game Over! Thanks for playing.');
    } else if (data.type === 'turn') {
        if (data.currentPlayer === playerId) {
            currentPlayerDisplay.innerText = `Your Turn!`;
            gameBoard.style.pointerEvents = 'auto'; // Permitir hacer clic
        } else {
            currentPlayerDisplay.innerText = `Waiting for ${data.currentPlayer}'s Turn...`;
            gameBoard.style.pointerEvents = 'none'; // Bloquear el tablero para el jugador que no tiene turno
        }
    }
};

// Función para crear el tablero de juego
function createBoard(images) {
    gameBoard.innerHTML = '';
    images.forEach((_, index) => {
        let card = document.createElement('div');
        card.classList.add('card');
        card.dataset.index = index;

        let cardInner = document.createElement('div');
        cardInner.classList.add('card-inner');

        // Insertar la imagen en el reverso de la carta
        let cardFront = document.createElement('div');
        cardFront.classList.add('card-front');
        cardFront.innerHTML = '<img src="img/snoopy.jpg" alt="Imagen reverso" />'; 

        let cardBack = document.createElement('div');
        cardBack.classList.add('card-back');
        cardBack.style.backgroundImage = `url('${images[index]}')`;

        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        card.appendChild(cardInner);

        card.addEventListener('click', () => sendFlip(index));
        gameBoard.appendChild(card);
    });
}

// Enviar información de la carta volteada
function sendFlip(index) {
    if (!flippedCards[index]) {
        socket.send(JSON.stringify({ type: 'flip', index, playerId }));
    }
}

// Voltear carta
function flipCard(index, image) {
    let card = document.querySelector(`[data-index="${index}"]`);
    card.classList.add('flipped');
    flippedCards[index] = true;
}

// Desvoltear cartas
function unflipCards(indexes) {
    indexes.forEach(index => {
        let card = document.querySelector(`[data-index="${index}"]`);
        card.classList.remove('flipped');
        delete flippedCards[index];
    });
}

// Eliminar cartas emparejadas
function removeMatchedCards(indexes) {
    indexes.forEach(index => {
        let card = document.querySelector(`[data-index="${index}"]`);
        setTimeout(() => card.remove(), 500);
    });
}
