document.addEventListener('DOMContentLoaded', () => {
    // Éléments DOM
    const newGameBtn = document.getElementById('new-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const gameIdDisplay = document.getElementById('game-id-display');
    const gameIdElement = document.getElementById('game-id');
    const joinGameIdInput = document.getElementById('join-game-id');
    const gameSetup = document.getElementById('game-setup');
    const gameArea = document.getElementById('game-area');
    const playerBoard = document.getElementById('player-board');
    const opponentBoard = document.getElementById('opponent-board');
    const shipSelection = document.getElementById('ship-selection');
    const readyBtn = document.getElementById('ready-btn');
    const statusMessage = document.getElementById('status-message');
    const ships = document.querySelectorAll('.ship');
    const orientationInputs = document.getElementsByName('orientation');

    // Variables du jeu
    let gameId = null;
    let playerType = null; // 'player1' ou 'player2'
    let selectedShip = null;
    let gameState = {
        playerBoard: Array(10).fill().map(() => Array(10).fill(0)),
        opponentBoard: Array(10).fill().map(() => Array(10).fill(0)),
        placedShips: []
    };

    // Fonction pour faire des requêtes à l'API
    async function apiRequest(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`/api/${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erreur de requête API:', error);
            return { error: true, message: error.message };
        }
    }

    function startCountdown() {
        // Initialiser le compte à rebours
        let secondsLeft = 10;
        const countdownElement = document.getElementById('countdown');
        const progressBar = document.getElementById('countdown-progress');
    
        // Mettre à jour le compte à rebours chaque seconde
        const countdownInterval = setInterval(() => {
            secondsLeft--;
            countdownElement.textContent = secondsLeft;
        
            // Mettre à jour la barre de progression
            const progressWidth = (secondsLeft / 10) * 100;
            progressBar.style.width = `${progressWidth}%`;
        
            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
                showGameBoard(); // Fonction qui affiche le plateau de jeu
            }
        }, 1000);
    }

    // Initialiser le jeu
    function initGame() {
        initializeBoards();
        setupShipDragAndDrop();
    }

    // Créer les grilles de jeu
    function initializeBoards() {
        // Vider les grilles
        playerBoard.innerHTML = '';
        opponentBoard.innerHTML = '';
        
        // Créer les cellules
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                // Grille du joueur
                const playerCell = document.createElement('div');
                playerCell.classList.add('cell');
                playerCell.dataset.row = i;
                playerCell.dataset.col = j;
                playerBoard.appendChild(playerCell);
                
                // Grille de l'adversaire
                const opponentCell = document.createElement('div');
                opponentCell.classList.add('cell');
                opponentCell.dataset.row = i;
                opponentCell.dataset.col = j;
                opponentCell.addEventListener('click', () => attackCell(i, j));
                opponentBoard.appendChild(opponentCell);
            }
        }
    }

    // Configurer le drag and drop pour les navires
    function setupShipDragAndDrop() {
        ships.forEach(ship => {
            ship.addEventListener('dragstart', dragStart);
        });
        
        const playerCells = playerBoard.querySelectorAll('.cell');
        playerCells.forEach(cell => {
            cell.addEventListener('dragover', dragOver);
            cell.addEventListener('drop', drop);
        });
    }

    // Fonctions pour le drag and drop
    function dragStart(e) {
        if (this.classList.contains('placed')) return;
        selectedShip = {
            element: this,
            size: parseInt(this.dataset.size)
        };
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function drop(e) {
        e.preventDefault();
        if (!selectedShip) return;
        
        const row = parseInt(this.dataset.row);
        const col = parseInt(this.dataset.col);
        const orientation = document.querySelector('input[name="orientation"]:checked').value;
        
        if (canPlaceShip(row, col, selectedShip.size, orientation)) {
            placeShip(row, col, selectedShip.size, orientation);
            selectedShip.element.classList.add('placed');
            
            // Vérifier si tous les navires sont placés
            const allShipsPlaced = Array.from(ships).every(ship => ship.classList.contains('placed'));
            readyBtn.disabled = !allShipsPlaced;
        }
        
        selectedShip = null;
    }

    // Vérifier si un navire peut être placé
    function canPlaceShip(row, col, size, orientation) {
        if (orientation === 'horizontal') {
            if (col + size > 10) return false;
            for (let i = 0; i < size; i++) {
                if (gameState.playerBoard[row][col + i] !== 0) return false;
            }
        } else {
            if (row + size > 10) return false;
            for (let i = 0; i < size; i++) {
                if (gameState.playerBoard[row + i][col] !== 0) return false;
            }
        }
        return true;
    }

    // Placer un navire sur la grille
    function placeShip(row, col, size, orientation) {
        const shipId = gameState.placedShips.length + 1;
        
        gameState.placedShips.push({
            id: shipId,
            size,
            positions: []
        });
        
        if (orientation === 'horizontal') {
            for (let i = 0; i < size; i++) {
                gameState.playerBoard[row][col + i] = shipId;
                gameState.placedShips[shipId - 1].positions.push([row, col + i]);
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col + i}"]`);
                cell.classList.add('ship');
            }
        } else {
            for (let i = 0; i < size; i++) {
                gameState.playerBoard[row + i][col] = shipId;
                gameState.placedShips[shipId - 1].positions.push([row + i, col]);
                const cell = document.querySelector(`.cell[data-row="${row + i}"][data-col="${col}"]`);
                cell.classList.add('ship');
            }
        }
    }

    // Attaquer une cellule de l'adversaire
    function attackCell(row, col) {
        console.log(`Attaque sur (${row}, ${col})`);
        // Code pour envoyer l'attaque à l'API
        // À implémenter selon le backend
    }

    // Événements des boutons
    newGameBtn.addEventListener('click', async () => {
        try {
            const response = await apiRequest('new_game', 'POST');
            if (!response.error) {
                gameId = response.game_id;
                playerType = 'player1';
                gameIdElement.textContent = gameId;
                gameIdDisplay.classList.remove('hidden');
                
                // Attendre un moment puis passer à l'écran de jeu
                setTimeout(() => {
                    gameSetup.classList.add('hidden');
                    gameArea.classList.remove('hidden');
                    initGame();
                }, 1000);
            }
        } catch (error) {
            console.error('Erreur lors de la création de la partie:', error);
        }
    });

    joinGameBtn.addEventListener('click', async () => {
        const gameIdToJoin = joinGameIdInput.value.trim();
        if (!gameIdToJoin) return;
        
        try {
            // Simulation de rejoindre une partie
            // Dans un vrai jeu, il faudrait vérifier l'existence du jeu via l'API
            gameId = gameIdToJoin;
            playerType = 'player2';
            
            gameSetup.classList.add('hidden');
            gameArea.classList.remove('hidden');
            initGame();
        } catch (error) {
            console.error('Erreur lors de la connexion à la partie:', error);
        }
    });

    readyBtn.addEventListener('click', () => {
        // Envoyer les positions des navires à l'API
        shipSelection.style.display = 'none';
        statusMessage.textContent = "En attente de l'adversaire...";
    });
});
