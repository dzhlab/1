// ==============================================
// СИСТЕМА РОЛЕЙ И ДОСТУПА
// ==============================================

let currentUser = {
    role: null,
    permissions: {}
};

// Определение ролей и их прав доступа
const ROLES = {
    chief_judge: {
        name: 'Главный судья',
        icon: '👨‍⚖️',
        tabs: ['participants', 'competitions', 'scoring', 'results', 'protocols', 'reports'],
        canEdit: {
            participants: true,
            competitions: true,
            scoring: true
        },
        canApprove: true,
        canDelete: true
    },
    secretary: {
        name: 'Секретарь',
        icon: '📋',
        tabs: ['participants', 'competitions', 'results', 'protocols'],
        canEdit: {
            participants: true,
            competitions: false,
            scoring: false
        },
        canApprove: false,
        canDelete: false
    },
    technical_specialist: {
        name: 'Технический специалист',
        icon: '⚙️',
        tabs: ['participants', 'competitions', 'scoring', 'results', 'reports'],
        canEdit: {
            participants: false,
            competitions: true,
            scoring: false
        },
        canApprove: false,
        canDelete: true
    },
    judge_d: {
        name: 'Судья D-бригады',
        icon: '📊',
        tabs: ['scoring', 'results'],
        canEdit: {
            participants: false,
            competitions: false,
            scoring: true
        },
        judgeType: 'D',
        canApprove: false,
        canDelete: false
    },
    judge_e: {
        name: 'Судья E-бригады',
        icon: '🎯',
        tabs: ['scoring', 'results'],
        canEdit: {
            participants: false,
            competitions: false,
            scoring: true
        },
        judgeType: 'E',
        canApprove: false,
        canDelete: false
    },
    judge_a: {
        name: 'Судья A-бригады',
        icon: '🎨',
        tabs: ['scoring', 'results'],
        canEdit: {
            participants: false,
            competitions: false,
            scoring: true
        },
        judgeType: 'A',
        canApprove: false,
        canDelete: false
    },
    coordinator: {
        name: 'Координатор соревнований',
        icon: '📅',
        tabs: ['participants', 'competitions', 'results'],
        canEdit: {
            participants: true,
            competitions: true,
            scoring: false
        },
        canApprove: false,
        canDelete: false
    },
    viewer: {
        name: 'Зритель',
        icon: '👁️',
        tabs: ['results'],
        canEdit: {
            participants: false,
            competitions: false,
            scoring: false
        },
        canApprove: false,
        canDelete: false
    }
};

// Функция выбора роли
function selectRole(roleKey) {
    currentUser.role = roleKey;
    currentUser.permissions = ROLES[roleKey];

    // Сохранить в localStorage
    localStorage.setItem('currentRole', roleKey);

    // Скрыть экран выбора роли
    document.getElementById('roleSelection').style.display = 'none';

    // Показать основное приложение
    document.getElementById('mainApp').style.display = 'block';

    // Обновить интерфейс
    updateInterfaceForRole();

    // Загрузить данные
    loadDataFromStorage();
    displayParticipants();
    displayCompetitions();
    updateCompetitionSelects();

    // Обновить статистику для отчетов
    if (currentUser.permissions.tabs.includes('reports')) {
        updateReportsStats();
    }
}

// Обновить интерфейс в зависимости от роли
function updateInterfaceForRole() {
    const role = currentUser.permissions;

    // Обновить заголовок с ролью
    document.getElementById('currentRole').textContent = `${role.icon} ${role.name}`;

    // Показать/скрыть вкладки
    const allTabs = document.querySelectorAll('.tab-button');
    allTabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        if (role.tabs.includes(tabName)) {
            tab.style.display = 'block';
        } else {
            tab.style.display = 'none';
        }
    });

    // Активировать первую доступную вкладку
    if (role.tabs.length > 0) {
        showTab(role.tabs[0]);
    }

    // Настроить интерфейс оценок для судей
    if (currentUser.role.startsWith('judge_')) {
        setupJudgeInterface();
    }
}

// Настройка интерфейса для конкретного судьи
function setupJudgeInterface() {
    const judgeType = currentUser.permissions.judgeType;

    // Скрыть/показать соответствующие поля оценок
    // Это будет реализовано при загрузке формы оценок
}

// Сменить роль
function changeRole() {
    // Очистить текущую роль
    currentUser.role = null;
    currentUser.permissions = {};
    localStorage.removeItem('currentRole');

    // Показать экран выбора роли
    document.getElementById('roleSelection').style.display = 'flex';

    // Скрыть основное приложение
    document.getElementById('mainApp').style.display = 'none';
}

// Проверка прав доступа
function hasPermission(action, section) {
    if (!currentUser.permissions) return false;

    switch (action) {
        case 'view':
            return currentUser.permissions.tabs.includes(section);
        case 'edit':
            return currentUser.permissions.canEdit && currentUser.permissions.canEdit[section];
        case 'delete':
            return currentUser.permissions.canDelete;
        case 'approve':
            return currentUser.permissions.canApprove;
        default:
            return false;
    }
}

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

    // Проверить, есть ли сохраненная роль
    const savedRole = localStorage.getItem('currentRole');

    if (savedRole && ROLES[savedRole]) {
        // Автоматически войти с сохраненной ролью
        selectRole(savedRole);
    } else {
        // Показать экран выбора роли
        document.getElementById('roleSelection').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
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

// ==============================================
// СОЗДАНИЕ СОРЕВНОВАНИЙ - MULTI-STEP FORM
// ==============================================

let currentCompetitionStep = 1;
let tempCompetitionJudges = [];
let tempCompetitionLogo = null;

// Показать/скрыть форму создания соревнования
function showCompetitionCreator() {
    document.getElementById('competitionCreatorModal').style.display = 'block';
    currentCompetitionStep = 1;
    tempCompetitionJudges = [];
    tempCompetitionLogo = null;
    updateStepIndicator();
}

function closeCompetitionCreator() {
    if (confirm('Вы уверены? Все несохраненные данные будут потеряны.')) {
        document.getElementById('competitionCreatorModal').style.display = 'none';
        document.getElementById('competitionForm').reset();
        tempCompetitionJudges = [];
        tempCompetitionLogo = null;
    }
}

// Навигация по шагам
function nextCompetitionStep(step) {
    // Валидация текущего шага
    if (!validateCurrentStep()) {
        return;
    }

    currentCompetitionStep = step;
    updateStepIndicator();
    showStepContent(step);
}

function prevCompetitionStep(step) {
    currentCompetitionStep = step;
    updateStepIndicator();
    showStepContent(step);
}

function updateStepIndicator() {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNumber === currentCompetitionStep) {
            step.classList.add('active');
        } else if (stepNumber < currentCompetitionStep) {
            step.classList.add('completed');
        }
    });
}

function showStepContent(step) {
    const allContents = document.querySelectorAll('.competition-step-content');
    allContents.forEach(content => {
        content.style.display = 'none';
    });

    const currentContent = document.querySelector(`[data-step-content="${step}"]`);
    if (currentContent) {
        currentContent.style.display = 'block';
    }
}

function validateCurrentStep() {
    if (currentCompetitionStep === 1) {
        const name = document.getElementById('competitionName').value;
        const startDate = document.getElementById('competitionStartDate').value;
        const endDate = document.getElementById('competitionEndDate').value;
        const city = document.getElementById('competitionCity').value;
        const venue = document.getElementById('competitionVenue').value;
        const organizer = document.getElementById('competitionOrganizer').value;
        const contactName = document.getElementById('competitionContactName').value;
        const contactPhone = document.getElementById('competitionContactPhone').value;
        const category = document.getElementById('competitionCategory').value;

        if (!name || !startDate || !endDate || !city || !venue || !organizer || !contactName || !contactPhone || !category) {
            alert('Пожалуйста, заполните все обязательные поля!');
            return false;
        }

        const checkboxes = document.querySelectorAll('input[name="discipline"]:checked');
        if (checkboxes.length === 0) {
            alert('Выберите хотя бы одну дисциплину!');
            return false;
        }
    }

    return true;
}

// Автоматический расчет количества дней
document.addEventListener('DOMContentLoaded', function() {
    const startDateInput = document.getElementById('competitionStartDate');
    const endDateInput = document.getElementById('competitionEndDate');
    const daysInput = document.getElementById('competitionDays');

    function calculateDays() {
        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            const start = new Date(startDateInput.value);
            const end = new Date(endDateInput.value);
            const diffTime = end - start;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 0) {
                daysInput.value = diffDays;
            } else {
                alert('Дата окончания должна быть позже даты начала!');
                endDateInput.value = '';
            }
        }
    }

    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', calculateDays);
        endDateInput.addEventListener('change', calculateDays);
    }
});

// ==============================================
// УПРАВЛЕНИЕ СУДЕЙСКОЙ БРИГАДОЙ
// ==============================================

function addJudge() {
    const judgeName = prompt('Введите ФИО судьи:');
    if (!judgeName) return;

    const judgeCity = prompt('Город:');
    if (!judgeCity) return;

    const judgeRegion = prompt('Область:');
    if (!judgeRegion) return;

    const judgeCategory = prompt('Судейская категория (например: 1 категория, Всероссийская):');
    if (!judgeCategory) return;

    const judgeTitle = prompt('Звание (например: МС, МСМК, или оставьте пустым):') || 'Нет';

    const judge = {
        id: Date.now(),
        name: judgeName,
        city: judgeCity,
        region: judgeRegion,
        category: judgeCategory,
        title: judgeTitle,
        brigade: null  // Будет назначена позже
    };

    tempCompetitionJudges.push(judge);
    displayJudgesList();
}

function editJudge(id) {
    const judge = tempCompetitionJudges.find(j => j.id === id);
    if (!judge) return;

    const newName = prompt('ФИО судьи:', judge.name);
    if (!newName) return;

    const newCity = prompt('Город:', judge.city);
    if (!newCity) return;

    const newRegion = prompt('Область:', judge.region);
    if (!newRegion) return;

    const newCategory = prompt('Судейская категория:', judge.category);
    if (!newCategory) return;

    const newTitle = prompt('Звание:', judge.title);

    judge.name = newName;
    judge.city = newCity;
    judge.region = newRegion;
    judge.category = newCategory;
    judge.title = newTitle || 'Нет';

    displayJudgesList();
}

function deleteJudge(id) {
    if (confirm('Удалить судью?')) {
        tempCompetitionJudges = tempCompetitionJudges.filter(j => j.id !== id);
        displayJudgesList();
    }
}

function moveJudgeUp(id) {
    const index = tempCompetitionJudges.findIndex(j => j.id === id);
    if (index > 0) {
        [tempCompetitionJudges[index - 1], tempCompetitionJudges[index]] =
        [tempCompetitionJudges[index], tempCompetitionJudges[index - 1]];
        displayJudgesList();
    }
}

function moveJudgeDown(id) {
    const index = tempCompetitionJudges.findIndex(j => j.id === id);
    if (index < tempCompetitionJudges.length - 1) {
        [tempCompetitionJudges[index], tempCompetitionJudges[index + 1]] =
        [tempCompetitionJudges[index + 1], tempCompetitionJudges[index]];
        displayJudgesList();
    }
}

function displayJudgesList() {
    const container = document.getElementById('judgesList');

    if (tempCompetitionJudges.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👨‍⚖️</div>
                <p>Нет добавленных судей</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tempCompetitionJudges.map((judge, index) => `
        <div class="judge-card">
            <div class="judge-info">
                <div class="judge-name">${judge.name}</div>
                <div class="judge-details">
                    ${judge.city}, ${judge.region} • ${judge.category} • ${judge.title}
                    ${judge.brigade ? ` • Бригада: ${judge.brigade}` : ''}
                </div>
            </div>
            <div class="judge-actions">
                <button class="btn-icon" onclick="moveJudgeUp(${judge.id})" ${index === 0 ? 'disabled' : ''} title="Сдвиг вверх">↑</button>
                <button class="btn-icon" onclick="moveJudgeDown(${judge.id})" ${index === tempCompetitionJudges.length - 1 ? 'disabled' : ''} title="Сдвиг вниз">↓</button>
                <button class="btn-icon" onclick="editJudge(${judge.id})" title="Редактировать">✎</button>
                <button class="btn-icon danger" onclick="deleteJudge(${judge.id})" title="Удалить">✕</button>
            </div>
        </div>
    `).join('');
}

function formBrigades() {
    if (tempCompetitionJudges.length < 3) {
        alert('Добавьте хотя бы 3 судей для формирования бригад');
        return;
    }

    // Простое распределение по бригадам
    const brigades = ['D', 'E', 'A'];
    tempCompetitionJudges.forEach((judge, index) => {
        judge.brigade = brigades[index % brigades.length];
    });

    displayJudgesList();
    alert('Судьи распределены по бригадам D, E, A');
}

// Заглушки для Excel импорта/экспорта (требуется библиотека)
function importJudgesFromExcel() {
    alert('Функция импорта из Excel будет реализована в следующей версии.\n\nФормат Excel файла:\nФИО | Город | Область | Категория | Звание');
}

function exportJudgesToExcel() {
    if (tempCompetitionJudges.length === 0) {
        alert('Нет судей для экспорта');
        return;
    }

    alert('Функция экспорта в Excel будет реализована в следующей версии.');
}

// ==============================================
// ЛОГОТИП ТУРНИРА
// ==============================================

function previewLogo(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Проверка размера (макс 2 МБ)
    if (file.size > 2 * 1024 * 1024) {
        alert('Размер файла не должен превышать 2 МБ');
        event.target.value = '';
        return;
    }

    // Проверка типа
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
        alert('Поддерживаются только PNG, JPG и SVG файлы');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        tempCompetitionLogo = e.target.result;
        document.getElementById('logoPreviewImage').src = e.target.result;
        document.getElementById('logoPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    tempCompetitionLogo = null;
    document.getElementById('competitionLogo').value = '';
    document.getElementById('logoPreview').style.display = 'none';
}

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
        startDate: document.getElementById('competitionStartDate').value,
        endDate: document.getElementById('competitionEndDate').value,
        days: parseInt(document.getElementById('competitionDays').value),
        city: document.getElementById('competitionCity').value,
        venue: document.getElementById('competitionVenue').value,
        organizer: document.getElementById('competitionOrganizer').value,
        contactName: document.getElementById('competitionContactName').value,
        contactPhone: document.getElementById('competitionContactPhone').value,
        category: document.getElementById('competitionCategory').value,
        disciplines: selectedDisciplines,
        judges: [...tempCompetitionJudges],
        logo: tempCompetitionLogo,
        rankingSettings: {
            tiebreakRule: document.querySelector('input[name="tiebreakRule"]:checked').value,
            rankingSkip: document.querySelector('input[name="rankingSkip"]:checked').value,
            dCalculation: document.querySelector('input[name="dCalculation"]:checked').value
        },
        // Для обратной совместимости
        date: document.getElementById('competitionStartDate').value
    };

    competitions.push(competition);
    saveDataToStorage();
    displayCompetitions();
    updateCompetitionSelects();

    // Закрыть форму и очистить
    document.getElementById('competitionCreatorModal').style.display = 'none';
    e.target.reset();
    tempCompetitionJudges = [];
    tempCompetitionLogo = null;

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

    container.innerHTML = competitions.map(c => {
        const startDate = c.startDate ? new Date(c.startDate).toLocaleDateString('ru-RU') : new Date(c.date).toLocaleDateString('ru-RU');
        const endDate = c.endDate ? new Date(c.endDate).toLocaleDateString('ru-RU') : '';
        const dateRange = endDate ? `${startDate} - ${endDate}` : startDate;

        return `
            <div class="card">
                ${c.logo ? `<div style="text-align: center; margin-bottom: 12px;"><img src="${c.logo}" style="max-width: 80px; max-height: 80px; border-radius: 8px;"></div>` : ''}
                <div class="card-header">
                    <h4>${c.name}</h4>
                    <button class="btn btn-danger" onclick="deleteCompetition(${c.id})">Удалить</button>
                </div>
                <p><strong>📅 Дата:</strong> ${dateRange} ${c.days ? `(${c.days} ${c.days === 1 ? 'день' : c.days < 5 ? 'дня' : 'дней'})` : ''}</p>
                ${c.city ? `<p><strong>📍 Место:</strong> ${c.city}${c.venue ? `, ${c.venue}` : ''}</p>` : ''}
                ${c.organizer ? `<p><strong>👔 Организатор:</strong> ${c.organizer}</p>` : ''}
                ${c.contactName ? `<p><strong>📞 Контакт:</strong> ${c.contactName}${c.contactPhone ? `, ${c.contactPhone}` : ''}</p>` : ''}
                <p><span class="badge badge-${c.category}">${categoryNames[c.category] || c.category}</span></p>
                <p><strong>Дисциплины:</strong> ${c.disciplines.map(d => disciplineNames[d]).join(', ')}</p>
                ${c.judges && c.judges.length > 0 ? `<p><strong>👨‍⚖️ Судей:</strong> ${c.judges.length}</p>` : ''}
                ${c.rankingSettings ? `
                    <details style="margin-top: 12px;">
                        <summary style="cursor: pointer; color: var(--ios-blue); font-weight: 600;">Настройки ранжирования</summary>
                        <div style="margin-top: 8px; padding: 12px; background: var(--ios-bg-secondary); border-radius: 8px; font-size: 14px;">
                            <p><strong>При совпадении оценок:</strong> ${c.rankingSettings.tiebreakRule === 'share' ? 'Делить место' : 'Проверять компоненты (E>A>D)'}</p>
                            <p><strong>Следующее место:</strong> ${c.rankingSettings.rankingSkip === 'no-skip' ? 'Не пропускать (1-1-2)' : 'Пропускать (1-1-3)'}</p>
                            <p><strong>Расчет D:</strong> ${c.rankingSettings.dCalculation === 'russian' ? 'Российское правило' : 'Сумма бригад'}</p>
                        </div>
                    </details>
                ` : ''}
            </div>
        `;
    }).join('');
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
// МОДУЛЬ РАНЖИРОВАНИЯ РЕЗУЛЬТАТОВ
// ==============================================

/**
 * Функция ранжирования результатов с учетом настроек соревнования
 * @param {Array} results - Массив результатов участников
 * @param {Object} rankingSettings - Настройки ранжирования из соревнования
 * @returns {Array} - Массив результатов с присвоенными местами
 */
function rankResults(results, rankingSettings) {
    if (!results || results.length === 0) {
        return [];
    }

    // Сортировка по общему баллу (от большего к меньшему)
    const sortedResults = [...results].sort((a, b) => b.totalScore - a.totalScore);

    // Если нет настроек, используем дефолтные
    const settings = rankingSettings || {
        tiebreakRule: 'share',
        rankingSkip: 'no-skip'
    };

    let currentRank = 1;
    let sameScoreCount = 0;

    sortedResults.forEach((result, index) => {
        if (index === 0) {
            // Первый участник всегда получает место 1
            result.rank = currentRank;
        } else {
            const prevResult = sortedResults[index - 1];

            // Проверка на совпадение оценок
            if (Math.abs(result.totalScore - prevResult.totalScore) < 0.001) {
                // Оценки совпадают
                if (settings.tiebreakRule === 'components') {
                    // Проверяем компоненты E > A > D
                    const comparison = compareComponents(result, prevResult);

                    if (comparison === 0) {
                        // Компоненты тоже совпадают - делим место
                        result.rank = prevResult.rank;
                        sameScoreCount++;
                    } else if (comparison > 0) {
                        // Текущий результат лучше - присваиваем следующее место
                        if (settings.rankingSkip === 'skip') {
                            currentRank = index + 1;
                        } else {
                            currentRank = prevResult.rank + 1;
                        }
                        result.rank = currentRank;
                        sameScoreCount = 0;
                    } else {
                        // Текущий результат хуже - делим место
                        result.rank = prevResult.rank;
                        sameScoreCount++;
                    }
                } else {
                    // Просто делим место
                    result.rank = prevResult.rank;
                    sameScoreCount++;
                }
            } else {
                // Оценки разные
                if (settings.rankingSkip === 'skip' && sameScoreCount > 0) {
                    // Пропускаем позиции
                    currentRank = index + 1;
                } else {
                    // Не пропускаем позиции
                    currentRank = prevResult.rank + sameScoreCount + 1;
                }
                result.rank = currentRank;
                sameScoreCount = 0;
            }
        }
    });

    return sortedResults;
}

/**
 * Сравнение компонентов оценок (E > A > D)
 * @returns {number} - 0 если равны, >0 если a лучше, <0 если b лучше
 */
function compareComponents(a, b) {
    // Получаем средние оценки по компонентам для всех выступлений участника
    const aAvg = calculateAverageComponents(a.scores);
    const bAvg = calculateAverageComponents(b.scores);

    // Сравниваем E (Execution) - больше = лучше
    if (Math.abs(aAvg.E - bAvg.E) > 0.001) {
        return aAvg.E - bAvg.E;
    }

    // Если E равны, сравниваем A (Artistry) - больше = лучше
    if (Math.abs(aAvg.A - bAvg.A) > 0.001) {
        return aAvg.A - bAvg.A;
    }

    // Если A равны, сравниваем D (Difficulty) - больше = лучше
    if (Math.abs(aAvg.D - bAvg.D) > 0.001) {
        return aAvg.D - bAvg.D;
    }

    // Все компоненты равны
    return 0;
}

/**
 * Расчет средних значений компонентов
 */
function calculateAverageComponents(scores) {
    if (!scores || scores.length === 0) {
        return { D: 0, E: 0, A: 0 };
    }

    const totals = scores.reduce((acc, score) => {
        acc.D += (score.dScore || 0);
        acc.E += (score.eScore || 0);
        acc.A += (score.aScore || 0);
        return acc;
    }, { D: 0, E: 0, A: 0 });

    return {
        D: totals.D / scores.length,
        E: totals.E / scores.length,
        A: totals.A / scores.length
    };
}

/**
 * Расчет D-оценки с учетом настроек соревнования
 * @param {Object} scores - Объект с оценками DB и DA
 * @param {Object} competition - Объект соревнования с настройками
 * @returns {number} - Итоговая D-оценка
 */
function calculateDScore(scores, competition) {
    const { db1 = 0, db2 = 0, db3 = 0, db4 = 0, da1 = 0, da2 = 0, da3 = 0, da4 = 0 } = scores;

    const dbAvg = (db1 + db2) / 2;
    const daAvg = (da1 + da2) / 2;

    // Проверяем настройки соревнования
    if (competition && competition.rankingSettings) {
        if (competition.rankingSettings.dCalculation === 'sum') {
            // Сумма двух бригад: (DB1+DB2) + (DA1+DA2)
            return (db1 + db2) + (da1 + da2);
        }
    }

    // Российское правило (по умолчанию): ((DB1+DB2) + (DA1+DA2)) / 2
    return (dbAvg + daAvg);
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

    // Преобразовать в массив
    const resultsArray = Object.values(participantResults);

    // Применить ранжирование с учетом настроек соревнования
    const rankedResults = rankResults(resultsArray, competition.rankingSettings);

    // Отобразить таблицу результатов
    displayResultsTable(rankedResults, competition);

    // Отобразить подиум победителей
    displayWinnersPodium(rankedResults);
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
        const rank = result.rank || (index + 1);
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

// ==============================================
// ПРОТОКОЛЫ
// ==============================================

function loadProtocols() {
    const competitionId = parseInt(document.getElementById('selectCompetitionProtocol').value);
    updateCompetitionSelectForProtocols();
}

function updateCompetitionSelectForProtocols() {
    const select = document.getElementById('selectCompetitionProtocol');
    const options = competitions.map(c =>
        `<option value="${c.id}">${c.name} (${new Date(c.date).toLocaleDateString('ru-RU')})</option>`
    ).join('');
    select.innerHTML = '<option value="">-- Выберите соревнование --</option>' + options;
}

// Генерация стартового протокола
function generateStartProtocol() {
    const competitionId = parseInt(document.getElementById('selectCompetitionProtocol').value);
    if (!competitionId) {
        alert('Выберите соревнование!');
        return;
    }

    const competition = competitions.find(c => c.id === competitionId);
    const eligibleParticipants = participants.filter(p => p.category === competition.category);

    let html = `
        <div class="protocol-header">
            <h2>СТАРТОВЫЙ ПРОТОКОЛ</h2>
            <div class="protocol-info">
                <p><strong>${competition.name}</strong></p>
                <p>Дата: ${new Date(competition.date).toLocaleDateString('ru-RU')}</p>
                <p>Категория: ${categoryNames[competition.category]}</p>
            </div>
        </div>

        <table class="protocol-table">
            <thead>
                <tr>
                    <th>№</th>
                    <th>ФИО</th>
                    <th>Возраст</th>
                    <th>Клуб/Школа</th>
                    <th>Дисциплины</th>
                </tr>
            </thead>
            <tbody>
    `;

    eligibleParticipants.forEach((p, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${p.name}</td>
                <td>${p.age}</td>
                <td>${p.club}</td>
                <td>${competition.disciplines.map(d => disciplineNames[d]).join(', ')}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div class="protocol-signature">
            <div class="signature-line">
                <div class="signature-label">Главный судья</div>
                <div>_________________</div>
            </div>
            <div class="signature-line">
                <div class="signature-label">Секретарь</div>
                <div>_________________</div>
            </div>
        </div>
    `;

    document.getElementById('protocolContent').innerHTML = html;
}

// Генерация протокола оценок
function generateScoreProtocol() {
    const competitionId = parseInt(document.getElementById('selectCompetitionProtocol').value);
    if (!competitionId) {
        alert('Выберите соревнование!');
        return;
    }

    const competition = competitions.find(c => c.id === competitionId);
    const competitionScores = scores.filter(s => s.competitionId === competitionId);

    let html = `
        <div class="protocol-header">
            <h2>ПРОТОКОЛ ОЦЕНОК</h2>
            <div class="protocol-info">
                <p><strong>${competition.name}</strong></p>
                <p>Дата: ${new Date(competition.date).toLocaleDateString('ru-RU')}</p>
            </div>
        </div>

        <table class="protocol-table">
            <thead>
                <tr>
                    <th>Участник</th>
                    <th>Дисциплина</th>
                    <th>D-Score</th>
                    <th>E-Score</th>
                    <th>A-Score</th>
                    <th>Штрафы</th>
                    <th>Итого</th>
                </tr>
            </thead>
            <tbody>
    `;

    competitionScores.forEach(s => {
        const participant = participants.find(p => p.id === s.participantId);
        const isNewFormat = s.dScore !== undefined;

        html += `
            <tr>
                <td>${participant ? participant.name : 'Неизвестный'}</td>
                <td>${disciplineNames[s.discipline]}</td>
                ${isNewFormat ? `
                    <td>${s.dScore.toFixed(2)}</td>
                    <td>${s.eScore.toFixed(2)}</td>
                    <td>${s.aScore.toFixed(2)}</td>
                    <td>${s.penalties ? s.penalties.toFixed(2) : '0.00'}</td>
                ` : `
                    <td>${s.difficulty ? s.difficulty.toFixed(2) : '-'}</td>
                    <td>${s.execution ? s.execution.toFixed(2) : '-'}</td>
                    <td>${s.artistry ? s.artistry.toFixed(2) : '-'}</td>
                    <td>-</td>
                `}
                <td><strong>${s.total.toFixed(2)}</strong></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div class="protocol-signature">
            <div class="signature-line">
                <div class="signature-label">Главный судья</div>
                <div>_________________</div>
            </div>
        </div>
    `;

    document.getElementById('protocolContent').innerHTML = html;
}

// Генерация итогового протокола
function generateFinalProtocol() {
    const competitionId = parseInt(document.getElementById('selectCompetitionProtocol').value);
    if (!competitionId) {
        alert('Выберите соревнование!');
        return;
    }

    const competition = competitions.find(c => c.id === competitionId);
    const competitionScores = scores.filter(s => s.competitionId === competitionId);

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

    let html = `
        <div class="protocol-header">
            <h2>ИТОГОВЫЙ ПРОТОКОЛ</h2>
            <div class="protocol-info">
                <p><strong>${competition.name}</strong></p>
                <p>Дата: ${new Date(competition.date).toLocaleDateString('ru-RU')}</p>
                <p>Категория: ${categoryNames[competition.category]}</p>
            </div>
        </div>

        <table class="protocol-table">
            <thead>
                <tr>
                    <th>Место</th>
                    <th>ФИО</th>
                    <th>Клуб</th>
                    ${competition.disciplines.map(d => `<th>${disciplineNames[d]}</th>`).join('')}
                    <th>Общий балл</th>
                </tr>
            </thead>
            <tbody>
    `;

    resultsArray.forEach((result, index) => {
        const rank = index + 1;
        html += `
            <tr>
                <td><strong>${rank}</strong></td>
                <td>${result.participant.name}</td>
                <td>${result.participant.club}</td>
        `;

        // Отобразить оценки по каждой дисциплине
        competition.disciplines.forEach(discipline => {
            const score = result.scores.find(s => s.discipline === discipline);
            html += `<td>${score ? score.total.toFixed(2) : '-'}</td>`;
        });

        html += `
                <td><strong>${result.totalScore.toFixed(2)}</strong></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div class="protocol-signature">
            <div class="signature-line">
                <div class="signature-label">Главный судья</div>
                <div>_________________</div>
            </div>
            <div class="signature-line">
                <div class="signature-label">Секретарь</div>
                <div>_________________</div>
            </div>
            <div class="signature-line">
                <div class="signature-label">Технический специалист</div>
                <div>_________________</div>
            </div>
        </div>
    `;

    document.getElementById('protocolContent').innerHTML = html;
}

// Экспорт протокола в PDF (упрощенная версия - print)
function exportProtocolPDF() {
    const content = document.getElementById('protocolContent').innerHTML;
    if (!content || content.trim() === '') {
        alert('Сначала создайте протокол!');
        return;
    }

    // Открыть окно печати
    window.print();
}

// ==============================================
// ОТЧЕТЫ И СТАТИСТИКА
// ==============================================

function updateReportsStats() {
    // Общая статистика
    document.getElementById('totalCompetitions').textContent = competitions.length;
    document.getElementById('totalParticipants').textContent = participants.length;
    document.getElementById('totalScores').textContent = scores.length;

    // Лучшие результаты
    displayTopResults();

    // Статистика по категориям
    displayCategoryStats();

    // Средние оценки
    displayAverageScores();
}

function displayTopResults() {
    const container = document.getElementById('topResults');

    if (scores.length === 0) {
        container.innerHTML = '<p style="color: #6c757d;">Нет данных</p>';
        return;
    }

    // Найти лучшие оценки
    const topScores = [...scores]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    let html = '';
    topScores.forEach((s, index) => {
        const participant = participants.find(p => p.id === s.participantId);
        const competition = competitions.find(c => c.id === s.competitionId);

        html += `
            <div class="top-result-item">
                <strong>${index + 1}. ${participant ? participant.name : 'Неизвестный'}</strong>
                <span>${disciplineNames[s.discipline]} - ${s.total.toFixed(2)} баллов</span>
                <span style="font-size: 0.85em;">${competition ? competition.name : ''}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function displayCategoryStats() {
    const container = document.getElementById('categoryStats');

    const categoryData = {};

    participants.forEach(p => {
        if (!categoryData[p.category]) {
            categoryData[p.category] = {
                count: 0,
                avgAge: 0,
                totalAge: 0
            };
        }
        categoryData[p.category].count++;
        categoryData[p.category].totalAge += p.age;
    });

    let html = '';
    Object.keys(categoryData).forEach(category => {
        const data = categoryData[category];
        const avgAge = (data.totalAge / data.count).toFixed(1);

        html += `
            <div class="category-stat">
                <strong>${categoryNames[category]}</strong>: ${data.count} участников
                <br><small>Средний возраст: ${avgAge} лет</small>
            </div>
        `;
    });

    container.innerHTML = html || '<p style="color: #6c757d;">Нет данных</p>';
}

function displayAverageScores() {
    const container = document.getElementById('averageScores');

    if (scores.length === 0) {
        container.innerHTML = '<p style="color: #6c757d;">Нет данных</p>';
        return;
    }

    // Подсчет средних оценок по новому формату
    const newFormatScores = scores.filter(s => s.dScore !== undefined);

    if (newFormatScores.length === 0) {
        container.innerHTML = '<p style="color: #6c757d;">Нет оценок в новом формате</p>';
        return;
    }

    const totalD = newFormatScores.reduce((sum, s) => sum + s.dScore, 0);
    const totalE = newFormatScores.reduce((sum, s) => sum + s.eScore, 0);
    const totalA = newFormatScores.reduce((sum, s) => sum + s.aScore, 0);
    const count = newFormatScores.length;

    const avgD = (totalD / count).toFixed(2);
    const avgE = (totalE / count).toFixed(2);
    const avgA = (totalA / count).toFixed(2);

    container.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Средний D-Score:</span>
            <span class="stat-value">${avgD}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Средний E-Score:</span>
            <span class="stat-value">${avgE}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Средний A-Score:</span>
            <span class="stat-value">${avgA}</span>
        </div>
    `;
}

// ==============================================
// УПРАВЛЕНИЕ ДАННЫМИ
// ==============================================

function exportAllData() {
    const data = {
        participants: participants,
        competitions: competitions,
        scores: scores,
        exportDate: new Date().toISOString(),
        version: '2.0.0'
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `gymnastics-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            if (confirm('Это заменит все текущие данные. Продолжить?')) {
                participants = data.participants || [];
                competitions = data.competitions || [];
                scores = data.scores || [];

                saveDataToStorage();
                displayParticipants();
                displayCompetitions();
                updateCompetitionSelects();
                updateReportsStats();

                alert('Данные успешно импортированы!');
            }
        } catch (error) {
            alert('Ошибка при импорте данных: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('Вы уверены? Это удалит ВСЕ данные без возможности восстановления!')) {
        if (confirm('Это действие НЕОБРАТИМО. Точно удалить все данные?')) {
            participants = [];
            competitions = [];
            scores = [];

            saveDataToStorage();
            displayParticipants();
            displayCompetitions();
            updateCompetitionSelects();

            if (currentUser.permissions && currentUser.permissions.tabs.includes('reports')) {
                updateReportsStats();
            }

            alert('Все данные удалены!');
        }
    }
}

// ======================================================================
// GROUPS AND STREAMS MANAGEMENT
// ======================================================================

// Global variable for groups
let groups = JSON.parse(localStorage.getItem('groups')) || [];
let currentGroup = null;
let currentGroupParticipants = [];

// Initialize groups
function initGroups() {
    groups = JSON.parse(localStorage.getItem('groups')) || [];
    displayGroups();
}

// Show group creator
function showGroupCreator() {
    document.getElementById('groupCreatorModal').style.display = 'block';
    document.getElementById('groupForm').reset();
}

// Close group creator
function closeGroupCreator() {
    document.getElementById('groupCreatorModal').style.display = 'none';
}

// Update apparatus options based on performance type
function updateApparatusOptions() {
    const performanceType = document.getElementById('groupPerformanceType').value;
    const apparatusCheckboxes = document.querySelectorAll('input[name="apparatus"]');

    // All apparatus types are available for all performance types
    // Just a placeholder for future logic if needed
}

// Handle group form submission
document.addEventListener('DOMContentLoaded', function() {
    const groupForm = document.getElementById('groupForm');
    if (groupForm) {
        groupForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get selected apparatus
            const selectedApparatus = Array.from(document.querySelectorAll('input[name="apparatus"]:checked'))
                .map(cb => cb.value);

            if (selectedApparatus.length === 0) {
                alert('Выберите хотя бы один вид программы');
                return;
            }

            // Get subgroups
            const subgroupsStr = document.getElementById('subgroups').value;
            const subgroups = subgroupsStr.split(',').map(s => s.trim()).filter(s => s);

            const group = {
                id: Date.now(),
                name: document.getElementById('groupName').value,
                discipline: document.getElementById('groupDiscipline').value,
                ageCategory: document.getElementById('groupAgeCategory').value,
                yearFrom: document.getElementById('groupYearFrom').value || null,
                yearTo: document.getElementById('groupYearTo').value || null,
                program: document.getElementById('groupProgram').value,
                performanceType: document.getElementById('groupPerformanceType').value,
                apparatus: selectedApparatus,
                performanceDuration: parseInt(document.getElementById('performanceDuration').value),
                participantsPerStream: parseInt(document.getElementById('participantsPerStream').value),
                minParticipantsPerStream: parseInt(document.getElementById('minParticipantsPerStream').value),
                streamStartTime: document.getElementById('streamStartTime').value,
                subgroups: subgroups,
                participants: [],
                createdAt: new Date().toISOString()
            };

            groups.push(group);
            localStorage.setItem('groups', JSON.stringify(groups));

            closeGroupCreator();
            displayGroups();

            showMessage('Группа успешно создана!', 'success');
        });
    }
});

// Display groups
function displayGroups() {
    const groupsList = document.getElementById('groupsList');

    if (groups.length === 0) {
        groupsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Нет созданных групп</p>
                <p style="font-size: 14px; color: var(--ios-gray-1);">Создайте первую группу для организации соревнований</p>
            </div>
        `;
        return;
    }

    groupsList.innerHTML = groups.map(group => `
        <div class="group-card" data-group-id="${group.id}">
            <div class="group-card-header">
                <div>
                    <div class="group-card-title">${group.name}</div>
                    <div class="group-card-info">
                        ${translateAgeCategory(group.ageCategory)} • ${translateProgram(group.program)}
                    </div>
                </div>
            </div>

            <div class="group-card-stats">
                <div class="group-stat">
                    <div class="group-stat-label">Участников</div>
                    <div class="group-stat-value">${group.participants.length}</div>
                </div>
                <div class="group-stat">
                    <div class="group-stat-label">Потоки</div>
                    <div class="group-stat-value">${calculateStreamsCount(group)}</div>
                </div>
            </div>

            <div class="group-card-info" style="margin-bottom: 12px;">
                <strong>Дисциплина:</strong> ${translateDisciplineType(group.discipline)}<br>
                <strong>Тип:</strong> ${translatePerformanceType(group.performanceType)}<br>
                <strong>Виды:</strong> ${group.apparatus.map(a => translateApparatus(a)).join(', ')}<br>
                <strong>Время выступления:</strong> ${group.performanceDuration} сек.
            </div>

            <div class="group-card-actions">
                <button class="btn btn-primary btn-sm" onclick="openGroupParticipants(${group.id})">
                    👥 Управление участниками
                </button>
                <button class="btn btn-secondary btn-sm" onclick="editGroup(${group.id})">
                    ✏️ Редактировать
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteGroup(${group.id})">
                    🗑️ Удалить
                </button>
            </div>
        </div>
    `).join('');
}

// Calculate streams count
function calculateStreamsCount(group) {
    if (group.participants.length === 0) return 0;
    return Math.ceil(group.participants.length / group.participantsPerStream);
}

// Open group participants management
function openGroupParticipants(groupId) {
    currentGroup = groups.find(g => g.id === groupId);
    if (!currentGroup) return;

    currentGroupParticipants = [...currentGroup.participants];

    document.getElementById('currentGroupName').textContent = currentGroup.name;
    document.getElementById('currentGroupInfo').textContent = `${translateAgeCategory(currentGroup.ageCategory)} • ${translateProgram(currentGroup.program)}`;

    displayGroupParticipants();
    document.getElementById('groupParticipantsModal').style.display = 'block';
}

// Close group participants
function closeGroupParticipants() {
    document.getElementById('groupParticipantsModal').style.display = 'none';
    currentGroup = null;
    currentGroupParticipants = [];
}

// Display group participants
function displayGroupParticipants() {
    const tbody = document.getElementById('groupParticipantsTableBody');

    if (currentGroupParticipants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: var(--ios-gray-1);">
                    Нет участников. Добавьте участников или загрузите из файла.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = currentGroupParticipants.map((participant, index) => `
        <tr>
            <td><span class="participant-number">${index + 1}</span></td>
            <td>${participant.fullName}</td>
            <td>${formatDate(participant.birthDate)}</td>
            <td>${participant.city}</td>
            <td>${participant.club}</td>
            <td>${participant.coach}</td>
            <td><span class="rank-badge ${participant.rank}">${translateRank(participant.rank)}</span></td>
            <td>${participant.stream ? `<span class="stream-badge stream-${participant.stream.toLowerCase()}">${participant.stream}</span>` : '-'}</td>
            <td>${participant.streamTime ? `<span class="time-badge">${participant.streamTime}</span>` : '-'}</td>
            <td>${participant.apparatus ? `<span class="apparatus-badge">Вид ${participant.apparatus}</span>` : '-'}</td>
            <td>
                <div class="participant-actions">
                    <button class="btn-icon-sm btn-up" onclick="moveParticipantUp(${index})" title="Вверх" ${index === 0 ? 'disabled' : ''}>
                        ↑
                    </button>
                    <button class="btn-icon-sm btn-down" onclick="moveParticipantDown(${index})" title="Вниз" ${index === currentGroupParticipants.length - 1 ? 'disabled' : ''}>
                        ↓
                    </button>
                    <button class="btn-icon-sm btn-delete" onclick="deleteParticipantFromGroup(${index})" title="Удалить">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add participant to group
function addParticipantToGroup() {
    document.getElementById('addParticipantModal').style.display = 'block';
    document.getElementById('addParticipantForm').reset();
}

// Close add participant modal
function closeAddParticipantModal() {
    document.getElementById('addParticipantModal').style.display = 'none';
}

// Handle add participant form submission
document.addEventListener('DOMContentLoaded', function() {
    const addParticipantForm = document.getElementById('addParticipantForm');
    if (addParticipantForm) {
        addParticipantForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const participant = {
                fullName: document.getElementById('partFullName').value,
                birthDate: document.getElementById('partBirthDate').value,
                city: document.getElementById('partCity').value,
                club: document.getElementById('partClub').value,
                coach: document.getElementById('partCoach').value,
                rank: document.getElementById('partRank').value,
                apparatus: document.getElementById('partApparatus').value || null,
                stream: null,
                streamTime: null
            };

            currentGroupParticipants.push(participant);
            displayGroupParticipants();
            closeAddParticipantModal();

            showMessage('Участник добавлен!', 'success');
        });
    }
});

// Move participant up
function moveParticipantUp(index) {
    if (index > 0) {
        [currentGroupParticipants[index - 1], currentGroupParticipants[index]] =
        [currentGroupParticipants[index], currentGroupParticipants[index - 1]];
        displayGroupParticipants();
    }
}

// Move participant down
function moveParticipantDown(index) {
    if (index < currentGroupParticipants.length - 1) {
        [currentGroupParticipants[index], currentGroupParticipants[index + 1]] =
        [currentGroupParticipants[index + 1], currentGroupParticipants[index]];
        displayGroupParticipants();
    }
}

// Delete participant from group
function deleteParticipantFromGroup(index) {
    if (confirm('Удалить участника из группы?')) {
        currentGroupParticipants.splice(index, 1);
        displayGroupParticipants();
        showMessage('Участник удален', 'info');
    }
}

// Clear group participants
function clearGroupParticipants() {
    if (confirm('Вы уверены, что хотите очистить весь список участников?')) {
        currentGroupParticipants = [];
        displayGroupParticipants();
        document.getElementById('streamsInfo').style.display = 'none';
        showMessage('Список участников очищен', 'info');
    }
}

// Perform draw (жеребьёвка)
function performDraw() {
    if (currentGroupParticipants.length === 0) {
        alert('Нет участников для жеребьёвки');
        return;
    }

    // Animate shuffle
    const tbody = document.getElementById('groupParticipantsTableBody');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => row.classList.add('drawing'));

    setTimeout(() => {
        // Fisher-Yates shuffle algorithm
        for (let i = currentGroupParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentGroupParticipants[i], currentGroupParticipants[j]] =
            [currentGroupParticipants[j], currentGroupParticipants[i]];
        }

        displayGroupParticipants();
        showMessage('Жеребьёвка выполнена!', 'success');
    }, 1500);
}

// Create streams
function createStreams() {
    if (currentGroupParticipants.length === 0) {
        alert('Нет участников для формирования потоков');
        return;
    }

    const participantsPerStream = currentGroup.participantsPerStream;
    const minPerStream = currentGroup.minParticipantsPerStream;
    const subgroups = currentGroup.subgroups;
    const startTime = currentGroup.streamStartTime;
    const duration = currentGroup.performanceDuration;

    // Calculate number of streams
    let numStreams = Math.ceil(currentGroupParticipants.length / participantsPerStream);

    // Check if last stream has enough participants
    const lastStreamSize = currentGroupParticipants.length % participantsPerStream;
    if (lastStreamSize > 0 && lastStreamSize < minPerStream && numStreams > 1) {
        // Redistribute participants
        numStreams = Math.ceil(currentGroupParticipants.length / participantsPerStream);
    }

    // Assign streams and times
    let streamIndex = 0;
    let currentTime = parseTime(startTime);
    const streamsData = [];

    for (let i = 0; i < currentGroupParticipants.length; i++) {
        const participant = currentGroupParticipants[i];

        // Determine stream
        streamIndex = Math.floor(i / participantsPerStream);
        const subgroup = subgroups[streamIndex % subgroups.length] || `Поток ${streamIndex + 1}`;

        participant.stream = subgroup;
        participant.streamTime = formatTime(currentTime);

        // Calculate next time
        if ((i + 1) % participantsPerStream === 0 && i < currentGroupParticipants.length - 1) {
            // Move to next stream, add break time (5 minutes)
            currentTime += duration + 300; // 5 min break
        } else {
            currentTime += duration;
        }

        // Track stream data
        if (!streamsData[streamIndex]) {
            streamsData[streamIndex] = {
                name: subgroup,
                participants: [],
                startTime: participant.streamTime
            };
        }
        streamsData[streamIndex].participants.push(participant);
    }

    displayGroupParticipants();
    displayStreamsInfo(streamsData);

    showMessage(`Сформировано потоков: ${streamsData.length}`, 'success');
}

// Parse time string to seconds
function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60;
}

// Format seconds to time string
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Display streams info
function displayStreamsInfo(streamsData) {
    const streamsInfo = document.getElementById('streamsInfo');
    const streamsInfoContent = document.getElementById('streamsInfoContent');

    streamsInfoContent.innerHTML = `
        <div class="streams-info-grid">
            ${streamsData.map((stream, index) => `
                <div class="stream-info-card">
                    <div class="stream-info-header">
                        <div class="stream-info-title">${stream.name}</div>
                        <div class="stream-info-count">${stream.participants.length} чел.</div>
                    </div>
                    <div class="stream-info-time">${stream.startTime}</div>
                    <div class="stream-info-participants">
                        ${stream.participants.map(p => p.fullName).join(', ')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    streamsInfo.style.display = 'block';
}

// Save group participants
function saveGroupParticipants() {
    if (!currentGroup) return;

    // Find and update group
    const groupIndex = groups.findIndex(g => g.id === currentGroup.id);
    if (groupIndex !== -1) {
        groups[groupIndex].participants = currentGroupParticipants;
        localStorage.setItem('groups', JSON.stringify(groups));

        displayGroups();
        showMessage('Изменения сохранены!', 'success');
    }
}

// Import participants from Excel
function importParticipantsFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Skip header row
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[1]) continue; // Skip empty rows

                const participant = {
                    fullName: row[1] || '',
                    birthDate: row[2] || '',
                    city: row[3] || '',
                    club: row[4] || '',
                    coach: row[5] || '',
                    rank: row[6] || '',
                    stream: row[7] || null,
                    streamTime: row[8] || null,
                    apparatus: row[9] || null
                };

                currentGroupParticipants.push(participant);
            }

            displayGroupParticipants();
            showMessage(`Загружено участников: ${rows.length - 1}`, 'success');
        } catch (error) {
            alert('Ошибка при загрузке файла: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    event.target.value = '';
}

// Export participants to Excel
function exportParticipantsToExcel() {
    if (currentGroupParticipants.length === 0) {
        alert('Нет участников для выгрузки');
        return;
    }

    // Prepare data
    const data = [
        ['№', 'ФИО спортсмена', 'Дата рождения', 'Город', 'Клуб', 'Тренер', 'Разряд', 'Поток', 'Время потока', 'Вид программы']
    ];

    currentGroupParticipants.forEach((participant, index) => {
        data.push([
            index + 1,
            participant.fullName,
            participant.birthDate,
            participant.city,
            participant.club,
            participant.coach,
            translateRank(participant.rank),
            participant.stream || '',
            participant.streamTime || '',
            participant.apparatus ? `Вид ${participant.apparatus}` : ''
        ]);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
        { wch: 5 },  // №
        { wch: 25 }, // ФИО
        { wch: 12 }, // Дата рождения
        { wch: 15 }, // Город
        { wch: 20 }, // Клуб
        { wch: 20 }, // Тренер
        { wch: 15 }, // Разряд
        { wch: 10 }, // Поток
        { wch: 12 }, // Время
        { wch: 15 }  // Вид программы
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Участники');

    // Save file
    const fileName = `${currentGroup.name}_участники_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showMessage('Файл Excel выгружен!', 'success');
}

// Edit group
function editGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    // Populate form
    document.getElementById('groupName').value = group.name;
    document.getElementById('groupDiscipline').value = group.discipline;
    document.getElementById('groupAgeCategory').value = group.ageCategory;
    document.getElementById('groupYearFrom').value = group.yearFrom || '';
    document.getElementById('groupYearTo').value = group.yearTo || '';
    document.getElementById('groupProgram').value = group.program;
    document.getElementById('groupPerformanceType').value = group.performanceType;
    document.getElementById('performanceDuration').value = group.performanceDuration;
    document.getElementById('participantsPerStream').value = group.participantsPerStream;
    document.getElementById('minParticipantsPerStream').value = group.minParticipantsPerStream;
    document.getElementById('streamStartTime').value = group.streamStartTime;
    document.getElementById('subgroups').value = group.subgroups.join(', ');

    // Check apparatus
    document.querySelectorAll('input[name="apparatus"]').forEach(cb => {
        cb.checked = group.apparatus.includes(cb.value);
    });

    // Delete old group
    deleteGroup(groupId, true);

    // Show form
    showGroupCreator();
}

// Delete group
function deleteGroup(groupId, silent = false) {
    if (!silent && !confirm('Удалить группу?')) return;

    const index = groups.findIndex(g => g.id === groupId);
    if (index !== -1) {
        groups.splice(index, 1);
        localStorage.setItem('groups', JSON.stringify(groups));
        displayGroups();

        if (!silent) {
            showMessage('Группа удалена', 'info');
        }
    }
}

// Translation helpers
function translateDisciplineType(discipline) {
    const map = {
        'individual': 'Индивидуальные',
        'group': 'Групповые',
        'fitness': 'ОФП'
    };
    return map[discipline] || discipline;
}

function translateAgeCategory(category) {
    const map = {
        '5-under': 'Девочки (5 лет и младше)',
        '6-7': 'Девочки (6-7 лет)',
        '8': 'Девочки (8 лет)',
        '9': 'Девочки (9 лет)',
        '10': 'Девочки (10 лет)',
        '11-12': 'Девочки (11-12 лет)',
        '13-15': 'Девочки (13-15 лет)',
        '15-plus': 'Женщины (15 лет и старше)'
    };
    return map[category] || category;
}

function translateProgram(program) {
    const map = {
        '3-jun': '3-й юношеский',
        '2-jun': '2-й юношеский',
        '1-jun': '1-й юношеский',
        '3-sport': '3-й спортивный',
        '2-sport': '2-й спортивный',
        '1-sport': '1-й спортивный',
        'kms': 'КМС',
        'ms': 'МС'
    };
    return map[program] || program;
}

function translatePerformanceType(type) {
    const map = {
        'individual': 'Индивидуальные',
        'team-5plus': 'Команда (5+)',
        'pairs': 'Двойки',
        'triples': 'Тройки'
    };
    return map[type] || type;
}

function translateApparatus(apparatus) {
    const map = {
        'free': 'Без предмета',
        'rope': 'Скакалка',
        'hoop': 'Обруч',
        'ball': 'Мяч',
        'clubs': 'Булавы',
        'ribbon': 'Лента',
        'mixed': 'Смешанные'
    };
    return map[apparatus] || apparatus;
}

function translateRank(rank) {
    return translateProgram(rank);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
}

// Show message banner
function showMessage(message, type = 'info') {
    const banner = document.createElement('div');
    banner.className = `message-banner ${type}`;
    banner.innerHTML = `
        <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span>${message}</span>
    `;

    const modal = document.getElementById('groupParticipantsModal');
    if (modal && modal.style.display === 'block') {
        modal.querySelector('.form-card').prepend(banner);
    } else {
        const groupsList = document.getElementById('groupsList');
        groupsList.parentElement.insertBefore(banner, groupsList);
    }

    setTimeout(() => banner.remove(), 3000);
}

// Initialize groups on page load
if (typeof initGroups === 'function') {
    initGroups();
}
