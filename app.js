// ==============================================
// ИНИЦИАЛИЗАЦИЯ И УПРАВЛЕНИЕ ДАННЫМИ
// ==============================================

// Структура данных
let participants = [];
let competitions = [];
let scores = [];

// Названия дисциплин
const disciplineNames = {
    rope: 'Скакалка',
    hoop: 'Обруч',
    ball: 'Мяч',
    clubs: 'Булавы',
    ribbon: 'Лента',
    free: 'Без предмета'
};

const categoryNames = {
    junior: 'Юниоры',
    youth: 'Молодежь',
    senior: 'Взрослые'
};

// Загрузка данных из localStorage при запуске
window.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    displayParticipants();
    displayCompetitions();
    updateCompetitionSelects();
});

// Сохранение и загрузка данных
function saveDataToStorage() {
    localStorage.setItem('participants', JSON.stringify(participants));
    localStorage.setItem('competitions', JSON.stringify(competitions));
    localStorage.setItem('scores', JSON.stringify(scores));
}

function loadDataFromStorage() {
    const savedParticipants = localStorage.getItem('participants');
    const savedCompetitions = localStorage.getItem('competitions');
    const savedScores = localStorage.getItem('scores');

    if (savedParticipants) participants = JSON.parse(savedParticipants);
    if (savedCompetitions) competitions = JSON.parse(savedCompetitions);
    if (savedScores) scores = JSON.parse(savedScores);
}

// ==============================================
// УПРАВЛЕНИЕ ВКЛАДКАМИ
// ==============================================

function showTab(tabName) {
    // Скрыть все вкладки
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));

    // Убрать активный класс у всех кнопок
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Показать выбранную вкладку
    document.getElementById(tabName).classList.add('active');

    // Активировать соответствующую кнопку
    event.target.classList.add('active');

    // Обновить данные при переходе на вкладки
    if (tabName === 'scoring') {
        updateCompetitionSelects();
    } else if (tabName === 'results') {
        updateCompetitionSelects();
    }
}

// ==============================================
// УПРАВЛЕНИЕ УЧАСТНИКАМИ
// ==============================================

// Форма регистрации участника
document.getElementById('participantForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const participant = {
        id: Date.now(),
        name: document.getElementById('participantName').value,
        age: parseInt(document.getElementById('participantAge').value),
        club: document.getElementById('participantClub').value,
        category: document.getElementById('participantCategory').value
    };

    participants.push(participant);
    saveDataToStorage();
    displayParticipants();

    // Очистить форму
    e.target.reset();

    // Показать уведомление
    alert('Участник успешно зарегистрирован!');
});

function displayParticipants() {
    const container = document.getElementById('participantsList');

    if (participants.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p>Нет зарегистрированных участников</p>
            </div>
        `;
        return;
    }

    container.innerHTML = participants.map(p => `
        <div class="card">
            <div class="card-header">
                <h4>${p.name}</h4>
                <button class="btn btn-danger" onclick="deleteParticipant(${p.id})">Удалить</button>
            </div>
            <p><strong>Возраст:</strong> ${p.age} лет</p>
            <p><strong>Клуб:</strong> ${p.club}</p>
            <p><span class="badge badge-${p.category}">${categoryNames[p.category]}</span></p>
        </div>
    `).join('');
}

function deleteParticipant(id) {
    if (confirm('Вы уверены, что хотите удалить этого участника?')) {
        participants = participants.filter(p => p.id !== id);

        // Также удалить все оценки этого участника
        scores = scores.filter(s => s.participantId !== id);

        saveDataToStorage();
        displayParticipants();
    }
}

// ==============================================
// УПРАВЛЕНИЕ СОРЕВНОВАНИЯМИ
// ==============================================

// Форма создания соревнования
document.getElementById('competitionForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const checkboxes = document.querySelectorAll('input[name="discipline"]:checked');
    const selectedDisciplines = Array.from(checkboxes).map(cb => cb.value);

    if (selectedDisciplines.length === 0) {
        alert('Выберите хотя бы одну дисциплину!');
        return;
    }

    const competition = {
        id: Date.now(),
        name: document.getElementById('competitionName').value,
        date: document.getElementById('competitionDate').value,
        category: document.getElementById('competitionCategory').value,
        disciplines: selectedDisciplines
    };

    competitions.push(competition);
    saveDataToStorage();
    displayCompetitions();
    updateCompetitionSelects();

    // Очистить форму
    e.target.reset();

    alert('Соревнование успешно создано!');
});

function displayCompetitions() {
    const container = document.getElementById('competitionsList');

    if (competitions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏆</div>
                <p>Нет активных соревнований</p>
            </div>
        `;
        return;
    }

    container.innerHTML = competitions.map(c => `
        <div class="card">
            <div class="card-header">
                <h4>${c.name}</h4>
                <button class="btn btn-danger" onclick="deleteCompetition(${c.id})">Удалить</button>
            </div>
            <p><strong>Дата:</strong> ${new Date(c.date).toLocaleDateString('ru-RU')}</p>
            <p><span class="badge badge-${c.category}">${categoryNames[c.category]}</span></p>
            <p><strong>Дисциплины:</strong> ${c.disciplines.map(d => disciplineNames[d]).join(', ')}</p>
        </div>
    `).join('');
}

function deleteCompetition(id) {
    if (confirm('Вы уверены, что хотите удалить это соревнование? Все связанные оценки также будут удалены.')) {
        competitions = competitions.filter(c => c.id !== id);

        // Удалить все оценки этого соревнования
        scores = scores.filter(s => s.competitionId !== id);

        saveDataToStorage();
        displayCompetitions();
        updateCompetitionSelects();
    }
}

function updateCompetitionSelects() {
    // Обновить селекты соревнований
    const selectScoring = document.getElementById('selectCompetition');
    const selectResults = document.getElementById('selectCompetitionResults');

    const options = competitions.map(c =>
        `<option value="${c.id}">${c.name} (${new Date(c.date).toLocaleDateString('ru-RU')})</option>`
    ).join('');

    const defaultOption = '<option value="">-- Выберите соревнование --</option>';

    selectScoring.innerHTML = defaultOption + options;
    selectResults.innerHTML = defaultOption + options;
}

// ==============================================
// ВЫСТАВЛЕНИЕ ОЦЕНОК
// ==============================================

let currentCompetition = null;

function loadCompetitionForScoring() {
    const competitionId = parseInt(document.getElementById('selectCompetition').value);

    if (!competitionId) {
        document.getElementById('scoringArea').style.display = 'none';
        return;
    }

    currentCompetition = competitions.find(c => c.id === competitionId);

    if (!currentCompetition) {
        alert('Соревнование не найдено!');
        return;
    }

    // Показать область оценок
    document.getElementById('scoringArea').style.display = 'block';

    // Загрузить участников той же категории
    const eligibleParticipants = participants.filter(p => p.category === currentCompetition.category);

    const participantSelect = document.getElementById('selectParticipant');
    participantSelect.innerHTML = '<option value="">-- Выберите участника --</option>' +
        eligibleParticipants.map(p =>
            `<option value="${p.id}">${p.name} (${p.club})</option>`
        ).join('');

    // Загрузить дисциплины
    const disciplineSelect = document.getElementById('selectDiscipline');
    disciplineSelect.innerHTML = '<option value="">-- Выберите дисциплину --</option>' +
        currentCompetition.disciplines.map(d =>
            `<option value="${d}">${disciplineNames[d]}</option>`
        ).join('');

    // Отобразить оценки
    displayScores();
}

// Автоматический подсчет общей оценки
document.getElementById('scoreExecution').addEventListener('input', calculateTotalScore);
document.getElementById('scoreDifficulty').addEventListener('input', calculateTotalScore);
document.getElementById('scoreArtistry').addEventListener('input', calculateTotalScore);

function calculateTotalScore() {
    const execution = parseFloat(document.getElementById('scoreExecution').value) || 0;
    const difficulty = parseFloat(document.getElementById('scoreDifficulty').value) || 0;
    const artistry = parseFloat(document.getElementById('scoreArtistry').value) || 0;

    const total = execution + difficulty + artistry;
    document.getElementById('totalScore').textContent = total.toFixed(2);
}

function submitScore() {
    if (!currentCompetition) {
        alert('Сначала выберите соревнование!');
        return;
    }

    const participantId = parseInt(document.getElementById('selectParticipant').value);
    const discipline = document.getElementById('selectDiscipline').value;
    const execution = parseFloat(document.getElementById('scoreExecution').value);
    const difficulty = parseFloat(document.getElementById('scoreDifficulty').value);
    const artistry = parseFloat(document.getElementById('scoreArtistry').value);

    if (!participantId || !discipline) {
        alert('Выберите участника и дисциплину!');
        return;
    }

    if (isNaN(execution) || isNaN(difficulty) || isNaN(artistry)) {
        alert('Введите все оценки!');
        return;
    }

    if (execution < 0 || execution > 10 || difficulty < 0 || difficulty > 10 || artistry < 0 || artistry > 10) {
        alert('Оценки должны быть в диапазоне от 0 до 10!');
        return;
    }

    // Проверить, есть ли уже оценка для этой комбинации
    const existingScoreIndex = scores.findIndex(s =>
        s.competitionId === currentCompetition.id &&
        s.participantId === participantId &&
        s.discipline === discipline
    );

    const score = {
        id: existingScoreIndex >= 0 ? scores[existingScoreIndex].id : Date.now(),
        competitionId: currentCompetition.id,
        participantId: participantId,
        discipline: discipline,
        execution: execution,
        difficulty: difficulty,
        artistry: artistry,
        total: execution + difficulty + artistry
    };

    if (existingScoreIndex >= 0) {
        scores[existingScoreIndex] = score;
        alert('Оценка обновлена!');
    } else {
        scores.push(score);
        alert('Оценка сохранена!');
    }

    saveDataToStorage();
    displayScores();

    // Очистить поля оценок
    document.getElementById('scoreExecution').value = '';
    document.getElementById('scoreDifficulty').value = '';
    document.getElementById('scoreArtistry').value = '';
    document.getElementById('totalScore').textContent = '0.0';
}

function displayScores() {
    if (!currentCompetition) return;

    const container = document.getElementById('scoresList');
    const competitionScores = scores.filter(s => s.competitionId === currentCompetition.id);

    if (competitionScores.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>Нет выставленных оценок</p>
            </div>
        `;
        return;
    }

    container.innerHTML = competitionScores.map(s => {
        const participant = participants.find(p => p.id === s.participantId);
        return `
            <div class="score-card">
                <div class="score-header">
                    <strong>${participant ? participant.name : 'Неизвестный'} - ${disciplineNames[s.discipline]}</strong>
                    <button class="btn btn-danger" onclick="deleteScore(${s.id})">Удалить</button>
                </div>
                <div class="score-details">
                    <div><strong>Техника:</strong> ${s.execution.toFixed(1)}</div>
                    <div><strong>Сложность:</strong> ${s.difficulty.toFixed(1)}</div>
                    <div><strong>Артистизм:</strong> ${s.artistry.toFixed(1)}</div>
                </div>
                <div style="margin-top: 10px; color: #f5576c; font-size: 1.2em;">
                    <strong>Итого: ${s.total.toFixed(2)}</strong>
                </div>
            </div>
        `;
    }).join('');
}

function deleteScore(id) {
    if (confirm('Удалить эту оценку?')) {
        scores = scores.filter(s => s.id !== id);
        saveDataToStorage();
        displayScores();
    }
}

// ==============================================
// РЕЗУЛЬТАТЫ И ТАБЛИЦА ЛИДЕРОВ
// ==============================================

function loadResults() {
    const competitionId = parseInt(document.getElementById('selectCompetitionResults').value);

    if (!competitionId) {
        document.getElementById('resultsTable').innerHTML = '';
        document.getElementById('winnersPodium').innerHTML = '';
        return;
    }

    const competition = competitions.find(c => c.id === competitionId);

    if (!competition) {
        alert('Соревнование не найдено!');
        return;
    }

    // Получить все оценки для этого соревнования
    const competitionScores = scores.filter(s => s.competitionId === competitionId);

    if (competitionScores.length === 0) {
        document.getElementById('resultsTable').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>Нет оценок для отображения результатов</p>
            </div>
        `;
        document.getElementById('winnersPodium').innerHTML = '';
        return;
    }

    // Сгруппировать оценки по участникам
    const participantResults = {};

    competitionScores.forEach(score => {
        if (!participantResults[score.participantId]) {
            const participant = participants.find(p => p.id === score.participantId);
            participantResults[score.participantId] = {
                participant: participant,
                scores: [],
                totalScore: 0
            };
        }
        participantResults[score.participantId].scores.push(score);
        participantResults[score.participantId].totalScore += score.total;
    });

    // Преобразовать в массив и отсортировать по общей сумме баллов
    const resultsArray = Object.values(participantResults).sort((a, b) => b.totalScore - a.totalScore);

    // Отобразить таблицу результатов
    displayResultsTable(resultsArray, competition);

    // Отобразить подиум победителей
    displayWinnersPodium(resultsArray);
}

function displayResultsTable(results, competition) {
    const container = document.getElementById('resultsTable');

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Место</th>
                    <th>Участник</th>
                    <th>Клуб</th>
                    ${competition.disciplines.map(d => `<th>${disciplineNames[d]}</th>`).join('')}
                    <th>Общий балл</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach((result, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';

        tableHTML += `
            <tr class="${rankClass}">
                <td>${rank}</td>
                <td>${result.participant.name}</td>
                <td>${result.participant.club}</td>
        `;

        // Отобразить оценки по каждой дисциплине
        competition.disciplines.forEach(discipline => {
            const score = result.scores.find(s => s.discipline === discipline);
            tableHTML += `<td>${score ? score.total.toFixed(2) : '-'}</td>`;
        });

        tableHTML += `
                <td><strong>${result.totalScore.toFixed(2)}</strong></td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

function displayWinnersPodium(results) {
    const container = document.getElementById('winnersPodium');

    if (results.length === 0) {
        container.innerHTML = '';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const positions = ['first', 'second', 'third'];

    let podiumHTML = '<div class="podium-container">';

    // Отобразить до 3 победителей
    for (let i = 0; i < Math.min(3, results.length); i++) {
        const result = results[i];
        podiumHTML += `
            <div class="podium-place ${positions[i]}">
                <div class="podium-medal">${medals[i]}</div>
                <div class="podium-name">${result.participant.name}</div>
                <div>${result.participant.club}</div>
                <div class="podium-score">${result.totalScore.toFixed(2)}</div>
            </div>
        `;
    }

    podiumHTML += '</div>';
    container.innerHTML = podiumHTML;
}
