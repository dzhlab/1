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

// Автоматический подсчет финального балла по правилам FIG 2025-2028
function calculateFinalScore() {
    // D-бригада: DB (Body Difficulty)
    const db1 = parseFloat(document.getElementById('scoreDB1').value) || 0;
    const db2 = parseFloat(document.getElementById('scoreDB2').value) || 0;
    const dbScore = (db1 + db2) / 2;
    document.getElementById('dbScore').textContent = dbScore.toFixed(2);

    // D-бригада: DA (Apparatus Difficulty)
    const da1 = parseFloat(document.getElementById('scoreDA1').value) || 0;
    const da2 = parseFloat(document.getElementById('scoreDA2').value) || 0;
    const daScore = (da1 + da2) / 2;
    document.getElementById('daScore').textContent = daScore.toFixed(2);

    // D-Score = DB + DA
    const dScore = dbScore + daScore;
    document.getElementById('totalDScore').textContent = dScore.toFixed(2);
    document.getElementById('finalD').textContent = dScore.toFixed(2);

    // E-бригада: Execution (4 судьи, отбросить макс/мин)
    const eDeductions = [
        parseFloat(document.getElementById('scoreE1').value) || 0,
        parseFloat(document.getElementById('scoreE2').value) || 0,
        parseFloat(document.getElementById('scoreE3').value) || 0,
        parseFloat(document.getElementById('scoreE4').value) || 0
    ];
    const eAvgDeduction = calculateMiddleAverage(eDeductions);
    const eScore = 10.0 - eAvgDeduction;
    document.getElementById('totalEScore').textContent = eScore.toFixed(2);
    document.getElementById('finalE').textContent = eScore.toFixed(2);

    // A-бригада: Artistry (4 судьи, отбросить макс/мин)
    const aDeductions = [
        parseFloat(document.getElementById('scoreA1').value) || 0,
        parseFloat(document.getElementById('scoreA2').value) || 0,
        parseFloat(document.getElementById('scoreA3').value) || 0,
        parseFloat(document.getElementById('scoreA4').value) || 0
    ];
    const aAvgDeduction = calculateMiddleAverage(aDeductions);
    const aScore = 10.0 - aAvgDeduction;
    document.getElementById('totalAScore').textContent = aScore.toFixed(2);
    document.getElementById('finalA').textContent = aScore.toFixed(2);

    // Штрафы
    const penalties = parseFloat(document.getElementById('penalties').value) || 0;
    document.getElementById('finalPenalties').textContent = penalties.toFixed(2);

    // Итоговый балл = D + E + A - Штрафы
    const finalScore = dScore + eScore + aScore - penalties;
    document.getElementById('totalFinalScore').textContent = finalScore.toFixed(2);

    return {
        db: dbScore,
        da: daScore,
        d: dScore,
        e: eScore,
        a: aScore,
        penalties: penalties,
        total: finalScore,
        judgeScores: {
            db1, db2, da1, da2,
            e: eDeductions,
            a: aDeductions
        }
    };
}

// Функция для расчета среднего из 4 оценок с отбросом макс/мин
function calculateMiddleAverage(values) {
    if (values.length !== 4) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    // Отбросить минимум и максимум, взять среднее из 2 средних
    return (sorted[1] + sorted[2]) / 2;
}

function submitScore() {
    if (!currentCompetition) {
        alert('Сначала выберите соревнование!');
        return;
    }

    const participantId = parseInt(document.getElementById('selectParticipant').value);
    const discipline = document.getElementById('selectDiscipline').value;

    if (!participantId || !discipline) {
        alert('Выберите участника и дисциплину!');
        return;
    }

    // Получить все оценки от судей
    const db1 = parseFloat(document.getElementById('scoreDB1').value);
    const db2 = parseFloat(document.getElementById('scoreDB2').value);
    const da1 = parseFloat(document.getElementById('scoreDA1').value);
    const da2 = parseFloat(document.getElementById('scoreDA2').value);

    const e1 = parseFloat(document.getElementById('scoreE1').value);
    const e2 = parseFloat(document.getElementById('scoreE2').value);
    const e3 = parseFloat(document.getElementById('scoreE3').value);
    const e4 = parseFloat(document.getElementById('scoreE4').value);

    const a1 = parseFloat(document.getElementById('scoreA1').value);
    const a2 = parseFloat(document.getElementById('scoreA2').value);
    const a3 = parseFloat(document.getElementById('scoreA3').value);
    const a4 = parseFloat(document.getElementById('scoreA4').value);

    // Проверить, что все обязательные оценки введены
    if (isNaN(db1) || isNaN(db2) || isNaN(da1) || isNaN(da2)) {
        alert('Введите все оценки D-бригады (DB1, DB2, DA1, DA2)!');
        return;
    }

    if (isNaN(e1) || isNaN(e2) || isNaN(e3) || isNaN(e4)) {
        alert('Введите все оценки E-бригады (E1, E2, E3, E4)!');
        return;
    }

    if (isNaN(a1) || isNaN(a2) || isNaN(a3) || isNaN(a4)) {
        alert('Введите все оценки A-бригады (A1, A2, A3, A4)!');
        return;
    }

    // Получить рассчитанные значения
    const scoreData = calculateFinalScore();

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
        // Оценки судей D-бригады
        db1: db1,
        db2: db2,
        da1: da1,
        da2: da2,
        // Оценки судей E-бригады (сбавки)
        e1: e1,
        e2: e2,
        e3: e3,
        e4: e4,
        // Оценки судей A-бригады (сбавки)
        a1: a1,
        a2: a2,
        a3: a3,
        a4: a4,
        // Штрафы
        penalties: scoreData.penalties,
        // Рассчитанные значения
        dbScore: scoreData.db,
        daScore: scoreData.da,
        dScore: scoreData.d,
        eScore: scoreData.e,
        aScore: scoreData.a,
        total: scoreData.total
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

    // Очистить все поля оценок
    clearScoringForm();
}

function clearScoringForm() {
    // D-бригада
    document.getElementById('scoreDB1').value = '';
    document.getElementById('scoreDB2').value = '';
    document.getElementById('scoreDA1').value = '';
    document.getElementById('scoreDA2').value = '';

    // E-бригада
    document.getElementById('scoreE1').value = '';
    document.getElementById('scoreE2').value = '';
    document.getElementById('scoreE3').value = '';
    document.getElementById('scoreE4').value = '';

    // A-бригада
    document.getElementById('scoreA1').value = '';
    document.getElementById('scoreA2').value = '';
    document.getElementById('scoreA3').value = '';
    document.getElementById('scoreA4').value = '';

    // Штрафы
    document.getElementById('penalties').value = '';

    // Сбросить отображаемые значения
    document.getElementById('dbScore').textContent = '0.00';
    document.getElementById('daScore').textContent = '0.00';
    document.getElementById('totalDScore').textContent = '0.00';
    document.getElementById('totalEScore').textContent = '10.00';
    document.getElementById('totalAScore').textContent = '10.00';
    document.getElementById('finalD').textContent = '0.00';
    document.getElementById('finalE').textContent = '10.00';
    document.getElementById('finalA').textContent = '10.00';
    document.getElementById('finalPenalties').textContent = '0.00';
    document.getElementById('totalFinalScore').textContent = '20.00';
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

        // Проверка на новый формат оценок (FIG 2025-2028) или старый
        const isNewFormat = s.dScore !== undefined;

        if (isNewFormat) {
            return `
                <div class="score-card">
                    <div class="score-header">
                        <strong>${participant ? participant.name : 'Неизвестный'} - ${disciplineNames[s.discipline]}</strong>
                        <button class="btn btn-danger" onclick="deleteScore(${s.id})">Удалить</button>
                    </div>
                    <div style="margin: 15px 0;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div style="background: #e3f2fd; padding: 10px; border-radius: 5px;">
                                <strong>D-Score:</strong> ${s.dScore.toFixed(2)}<br>
                                <small>DB: ${s.dbScore.toFixed(2)} | DA: ${s.daScore.toFixed(2)}</small>
                            </div>
                            <div style="background: #f3e5f5; padding: 10px; border-radius: 5px;">
                                <strong>E-Score:</strong> ${s.eScore.toFixed(2)}<br>
                                <small>Сбавки: ${s.e1}, ${s.e2}, ${s.e3}, ${s.e4}</small>
                            </div>
                            <div style="background: #fff3e0; padding: 10px; border-radius: 5px;">
                                <strong>A-Score:</strong> ${s.aScore.toFixed(2)}<br>
                                <small>Сбавки: ${s.a1}, ${s.a2}, ${s.a3}, ${s.a4}</small>
                            </div>
                            ${s.penalties > 0 ? `
                            <div style="background: #ffebee; padding: 10px; border-radius: 5px;">
                                <strong>Штрафы:</strong> -${s.penalties.toFixed(2)}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 10px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 8px; text-align: center;">
                        <strong style="font-size: 1.3em;">ИТОГО: ${s.total.toFixed(2)}</strong><br>
                        <small>D (${s.dScore.toFixed(2)}) + E (${s.eScore.toFixed(2)}) + A (${s.aScore.toFixed(2)})${s.penalties > 0 ? ` - Штрафы (${s.penalties.toFixed(2)})` : ''}</small>
                    </div>
                </div>
            `;
        } else {
            // Старый формат оценок (для обратной совместимости)
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
                        <br><small style="color: #999;">(Старый формат)</small>
                    </div>
                </div>
            `;
        }
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
