// Jeopardy Game Application
// Main game state and logic

class JeopardyGame {
    constructor() {
        this.gameData = null;
        this.theme = null;
        this.currentRound = 1;
        this.maxRounds = 2;
        this.players = [
            { name: '', score: 0 },
            { name: '', score: 0 },
            { name: '', score: 0 }
        ];
        this.currentQuestion = null;
        this.answeredQuestions = new Set();
        
        this.init();
    }

    async init() {
        await this.loadDefaultGame();
        await this.loadDefaultTheme();
        this.setupEventListeners();
        this.renderBoard();
        this.updatePlayerDisplay();
        this.updateRoundIndicator();
    }

    async loadDefaultGame() {
        try {
            const response = await fetch('default-game.json');
            this.gameData = await response.json();
        } catch (error) {
            console.error('Error loading default game:', error);
            alert('Error loading default game data');
        }
    }

    async loadDefaultTheme() {
        try {
            const response = await fetch('default-theme.json');
            this.theme = await response.json();
            this.applyTheme();
        } catch (error) {
            console.error('Error loading default theme:', error);
        }
    }

    applyTheme() {
        if (!this.theme) return;

        const root = document.documentElement;
        root.style.setProperty('--primary-color', this.theme.primaryColor);
        root.style.setProperty('--secondary-color', this.theme.secondaryColor);
        root.style.setProperty('--background-color', this.theme.backgroundColor);
        root.style.setProperty('--text-color', this.theme.textColor);
        root.style.setProperty('--board-bg', this.theme.boardBackground);
        root.style.setProperty('--category-bg', this.theme.categoryBackground);
        root.style.setProperty('--category-text', this.theme.categoryText);
        root.style.setProperty('--question-bg', this.theme.questionBackground);
        root.style.setProperty('--question-text', this.theme.questionText);
        root.style.setProperty('--modal-bg', this.theme.modalBackground);
        root.style.setProperty('--button-bg', this.theme.buttonBackground);
        root.style.setProperty('--button-hover', this.theme.buttonHover);
        root.style.setProperty('--correct-color', this.theme.correctColor);
        root.style.setProperty('--incorrect-color', this.theme.incorrectColor);
    }

    setupEventListeners() {
        // File upload listeners
        document.getElementById('load-game-btn').addEventListener('click', () => {
            document.getElementById('game-file-input').click();
        });

        document.getElementById('game-file-input').addEventListener('change', (e) => {
            this.loadGameFile(e.target.files[0]);
        });

        document.getElementById('load-theme-btn').addEventListener('click', () => {
            document.getElementById('theme-file-input').click();
        });

        document.getElementById('theme-file-input').addEventListener('change', (e) => {
            this.loadThemeFile(e.target.files[0]);
        });

        // Game control listeners
        document.getElementById('reset-game-btn').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('next-round-btn').addEventListener('click', () => {
            this.nextRound();
        });

        document.getElementById('final-jeopardy-btn').addEventListener('click', () => {
            this.showFinalJeopardy();
        });

        // Modal listeners
        document.getElementById('show-answer-btn').addEventListener('click', () => {
            this.showAnswer();
        });

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            this.closeModal();
        });

        // Player name change listeners
        document.querySelectorAll('.player-name').forEach((input, index) => {
            input.addEventListener('change', (e) => {
                this.players[index].name = e.target.value || `Player ${index + 1}`;
                this.updateResponseButtons();
            });
        });

        // Response button listeners
        document.querySelectorAll('.response-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerIndex = parseInt(e.target.dataset.player) - 1;
                const isCorrect = e.target.classList.contains('correct-btn');
                this.handleResponse(playerIndex, isCorrect);
            });
        });

        // Final Jeopardy listeners
        document.getElementById('show-final-question-btn').addEventListener('click', () => {
            this.showFinalQuestion();
        });

        document.getElementById('show-final-answer-btn').addEventListener('click', () => {
            this.showFinalAnswer();
        });

        document.getElementById('close-final-modal-btn').addEventListener('click', () => {
            this.closeFinalModal();
        });

        document.querySelectorAll('#final-response-controls .response-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerIndex = parseInt(e.target.dataset.player) - 1;
                const isCorrect = e.target.classList.contains('correct-btn');
                this.handleFinalResponse(playerIndex, isCorrect);
            });
        });
    }

    loadGameFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.gameData = JSON.parse(e.target.result);
                this.resetGame();
                alert('Game loaded successfully!');
            } catch (error) {
                alert('Error parsing game file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    loadThemeFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.theme = JSON.parse(e.target.result);
                this.applyTheme();
                alert('Theme loaded successfully!');
            } catch (error) {
                alert('Error parsing theme file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    renderBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = '';

        if (!this.gameData || !this.gameData.rounds || !this.gameData.rounds[this.currentRound - 1]) {
            board.innerHTML = '<p>No game data available</p>';
            return;
        }

        const roundData = this.gameData.rounds[this.currentRound - 1];
        const categories = roundData.categories;

        // Create categories row
        const categoriesRow = document.createElement('div');
        categoriesRow.className = 'categories-row';

        categories.forEach(category => {
            const categoryCell = document.createElement('div');
            categoryCell.className = 'category-cell';
            categoryCell.textContent = category.name;
            categoriesRow.appendChild(categoryCell);
        });

        board.appendChild(categoriesRow);

        // Determine number of questions per category
        const questionsPerCategory = categories[0].questions.length;

        // Create question rows
        for (let i = 0; i < questionsPerCategory; i++) {
            const questionRow = document.createElement('div');
            questionRow.className = 'questions-row';

            categories.forEach((category, catIndex) => {
                const question = category.questions[i];
                const questionCell = document.createElement('div');
                questionCell.className = 'question-cell';
                
                const questionId = `r${this.currentRound}-c${catIndex}-q${i}`;
                
                if (this.answeredQuestions.has(questionId)) {
                    questionCell.classList.add('answered');
                    questionCell.textContent = '';
                } else {
                    questionCell.textContent = `$${question.value}`;
                    questionCell.addEventListener('click', () => {
                        this.showQuestion(question, category.name, questionId);
                    });
                }

                questionRow.appendChild(questionCell);
            });

            board.appendChild(questionRow);
        }
    }

    showQuestion(question, categoryName, questionId) {
        this.currentQuestion = { ...question, categoryName, questionId };
        
        const modal = document.getElementById('question-modal');
        const questionText = document.getElementById('question-text');
        const answerSection = document.getElementById('answer-section');
        const answerText = document.getElementById('answer-text');
        const showAnswerBtn = document.getElementById('show-answer-btn');
        const responseControls = document.getElementById('player-response-controls');

        document.querySelector('#question-modal .category-name').textContent = categoryName;
        document.querySelector('#question-modal .question-value').textContent = `$${question.value}`;
        questionText.textContent = question.question;
        answerText.textContent = question.answer;

        answerSection.style.display = 'none';
        showAnswerBtn.style.display = 'block';
        responseControls.style.display = 'none';

        modal.classList.add('show');
    }

    showAnswer() {
        const answerSection = document.getElementById('answer-section');
        const showAnswerBtn = document.getElementById('show-answer-btn');
        const responseControls = document.getElementById('player-response-controls');

        answerSection.style.display = 'block';
        showAnswerBtn.style.display = 'none';
        responseControls.style.display = 'block';
        this.updateResponseButtons();
    }

    updateResponseButtons() {
        const correctBtns = document.querySelectorAll('#player-response-controls .correct-btn');
        const incorrectBtns = document.querySelectorAll('#player-response-controls .incorrect-btn');

        correctBtns.forEach((btn, index) => {
            const playerName = this.players[index].name || `Player ${index + 1}`;
            btn.textContent = `${playerName} ✓`;
        });

        incorrectBtns.forEach((btn, index) => {
            const playerName = this.players[index].name || `Player ${index + 1}`;
            btn.textContent = `${playerName} ✗`;
        });
    }

    handleResponse(playerIndex, isCorrect) {
        const value = this.currentQuestion.value;
        const scoreChange = isCorrect ? value : -value;
        
        this.players[playerIndex].score += scoreChange;
        this.updatePlayerDisplay();

        if (isCorrect) {
            this.answeredQuestions.add(this.currentQuestion.questionId);
            this.closeModal();
            this.renderBoard();
        }
    }

    closeModal() {
        const modal = document.getElementById('question-modal');
        modal.classList.remove('show');
        this.currentQuestion = null;
    }

    updatePlayerDisplay() {
        this.players.forEach((player, index) => {
            const playerCard = document.getElementById(`player${index + 1}`);
            const scoreElement = playerCard.querySelector('.player-score');
            scoreElement.textContent = `$${player.score}`;
        });
    }

    updateRoundIndicator() {
        const indicator = document.getElementById('round-indicator');
        if (this.currentRound <= this.maxRounds) {
            indicator.textContent = `Round ${this.currentRound}`;
        } else {
            indicator.textContent = 'Final Jeopardy';
        }
    }

    nextRound() {
        if (this.currentRound < this.maxRounds) {
            this.currentRound++;
            this.updateRoundIndicator();
            this.renderBoard();
        } else {
            alert('You are already at the last round. Click "Final Jeopardy" to proceed.');
        }
    }

    showFinalJeopardy() {
        if (!this.gameData || !this.gameData.finalJeopardy) {
            alert('No Final Jeopardy data available');
            return;
        }

        const modal = document.getElementById('final-jeopardy-modal');
        const categoryEl = document.getElementById('final-category');
        const questionEl = document.getElementById('final-question-text');
        const answerEl = document.getElementById('final-answer-text');
        const wagersEl = document.getElementById('final-wagers');
        const showQuestionBtn = document.getElementById('show-final-question-btn');
        const showAnswerBtn = document.getElementById('show-final-answer-btn');
        const responseControls = document.getElementById('final-response-controls');

        const finalData = this.gameData.finalJeopardy;
        categoryEl.textContent = `Category: ${finalData.category}`;
        questionEl.textContent = finalData.question;
        answerEl.textContent = finalData.answer;

        // Set max wagers based on player scores
        this.players.forEach((player, index) => {
            const wagerInput = document.getElementById(`wager${index + 1}`);
            const maxWager = Math.max(0, player.score);
            wagerInput.max = maxWager;
            wagerInput.value = 0;
        });

        // Reset display states
        questionEl.style.display = 'none';
        document.getElementById('final-answer-section').style.display = 'none';
        wagersEl.style.display = 'block';
        showQuestionBtn.style.display = 'block';
        showAnswerBtn.style.display = 'none';
        responseControls.style.display = 'none';

        modal.classList.add('show');
        this.updateRoundIndicator();
    }

    showFinalQuestion() {
        const questionEl = document.getElementById('final-question-text');
        const wagersEl = document.getElementById('final-wagers');
        const showQuestionBtn = document.getElementById('show-final-question-btn');
        const showAnswerBtn = document.getElementById('show-final-answer-btn');

        wagersEl.style.display = 'none';
        questionEl.style.display = 'block';
        showQuestionBtn.style.display = 'none';
        showAnswerBtn.style.display = 'block';
    }

    showFinalAnswer() {
        const answerSection = document.getElementById('final-answer-section');
        const showAnswerBtn = document.getElementById('show-final-answer-btn');
        const responseControls = document.getElementById('final-response-controls');

        answerSection.style.display = 'block';
        showAnswerBtn.style.display = 'none';
        responseControls.style.display = 'block';
        this.updateFinalResponseButtons();
    }

    updateFinalResponseButtons() {
        const correctBtns = document.querySelectorAll('#final-response-controls .correct-btn');
        const incorrectBtns = document.querySelectorAll('#final-response-controls .incorrect-btn');

        correctBtns.forEach((btn, index) => {
            const playerName = this.players[index].name || `Player ${index + 1}`;
            btn.textContent = `${playerName} ✓`;
        });

        incorrectBtns.forEach((btn, index) => {
            const playerName = this.players[index].name || `Player ${index + 1}`;
            btn.textContent = `${playerName} ✗`;
        });
    }

    handleFinalResponse(playerIndex, isCorrect) {
        const wagerInput = document.getElementById(`wager${playerIndex + 1}`);
        const wager = parseInt(wagerInput.value) || 0;
        
        const scoreChange = isCorrect ? wager : -wager;
        this.players[playerIndex].score += scoreChange;
        this.updatePlayerDisplay();
    }

    closeFinalModal() {
        const modal = document.getElementById('final-jeopardy-modal');
        modal.classList.remove('show');
    }

    resetGame() {
        this.currentRound = 1;
        this.players = [
            { name: '', score: 0 },
            { name: '', score: 0 },
            { name: '', score: 0 }
        ];
        this.answeredQuestions.clear();
        
        document.querySelectorAll('.player-name').forEach((input, index) => {
            input.value = '';
        });
        
        this.updatePlayerDisplay();
        this.updateRoundIndicator();
        this.renderBoard();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new JeopardyGame();
});
