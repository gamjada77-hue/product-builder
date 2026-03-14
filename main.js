// XSS 방어 유틸리티
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
    // --- State & Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const pages = document.querySelectorAll('.page');
    let currentDate = new Date();

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            tabBtns.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
            if (target === 'mypage') renderCalendar();
            if (target === 'gym-page') initGymPage();
        });
    });

    let userInfo = JSON.parse(localStorage.getItem('kintore-user-info-v5') || '{}');
    let workouts = JSON.parse(localStorage.getItem('kintore-workouts-v5') || '[]');
    let routines = JSON.parse(localStorage.getItem('kintore-routines-v5') || '[]');
    let plans = JSON.parse(localStorage.getItem('kintore-plans-v5') || '{}');
    let customEx = JSON.parse(localStorage.getItem('kintore-custom-ex-v5') || '["벤치프레스", "스쿼트", "데드리프트"]');

    // --- Calendar Logic ---
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthDisplay = document.getElementById('current-month-display');
    const planModal = document.getElementById('plan-modal');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    let activePlanDate = '';

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        currentMonthDisplay.textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day empty';
            calendarGrid.appendChild(div);
        }

        for (let d = 1; d <= lastDate; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSunday = new Date(year, month, d).getDay() === 0;
            const isToday = new Date().toLocaleDateString() === new Date(year, month, d).toLocaleDateString();

            const dayDiv = document.createElement('div');
            dayDiv.className = `calendar-day ${isSunday ? 'sunday' : ''} ${isToday ? 'today' : ''}`;
            dayDiv.innerHTML = `<span class="day-num">${d}</span><div class="day-content"></div>`;

            const dayContent = dayDiv.querySelector('.day-content');
            if (plans[dateStr] && plans[dateStr].length > 0) {
                const dot = document.createElement('div');
                dot.className = 'plan-dot';
                dayContent.appendChild(dot);
                plans[dateStr].forEach(p => {
                    const tag = document.createElement('span');
                    tag.className = 'plan-tag';
                    tag.textContent = `${p.name} ${p.weight}kg`;
                    dayContent.appendChild(tag);
                });
            }

            const isCompleted = workouts.some(w => w.fullDate === new Date(year, month, d).toLocaleDateString());
            if (isCompleted && plans[dateStr]) {
                const stamp = document.createElement('div');
                stamp.className = 'day-stamp';
                stamp.textContent = '완료';
                dayDiv.appendChild(stamp);
            }

            dayDiv.onclick = () => openPlanModal(dateStr);
            calendarGrid.appendChild(dayDiv);
        }
    }

    function openPlanModal(date) {
        activePlanDate = date;
        selectedDateDisplay.textContent = date;
        renderDayPlanList();
        planModal.style.display = 'block';
    }

    function renderDayPlanList() {
        const list = document.getElementById('day-plan-list');
        list.innerHTML = '';
        const dayPlans = plans[activePlanDate] || [];
        dayPlans.forEach((p, idx) => {
            const li = document.createElement('li');
            li.className = 'manage-item';
            li.innerHTML = `<span>${p.name} - ${p.weight}kg</span> <button class="remove-btn" onclick="removePlan(${idx})">&times;</button>`;
            list.appendChild(li);
        });
    }

    window.removePlan = (idx) => {
        plans[activePlanDate].splice(idx, 1);
        localStorage.setItem('kintore-plans-v5', JSON.stringify(plans));
        renderDayPlanList();
        renderCalendar();
    };

    document.getElementById('add-plan-btn').onclick = () => {
        const name = document.getElementById('plan-exercise').value.trim();
        const weight = document.getElementById('plan-weight').value;
        if (name && weight) {
            if (!plans[activePlanDate]) plans[activePlanDate] = [];
            plans[activePlanDate].push({ name, weight });
            localStorage.setItem('kintore-plans-v5', JSON.stringify(plans));
            renderDayPlanList();
            renderCalendar();
            document.getElementById('plan-exercise').value = '';
            document.getElementById('plan-weight').value = '';
        }
    };

    document.querySelector('.close-modal').onclick = () => planModal.style.display = 'none';
    document.getElementById('prev-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('next-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };

    // --- Workout & Routine Logic ---
    const workoutForm = document.getElementById('workout-form');
    const workoutList = document.getElementById('workout-list');
    const routineContainer = document.getElementById('today-routine-list');
    const bigStamp = document.getElementById('well-done-stamp');

    workoutForm.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('exercise-name').value;
        const weight = document.getElementById('workout-weight').value;
        const reps = document.getElementById('workout-reps').value;
        const now = new Date();
        const fullDate = now.toLocaleDateString();

        const workout = { name, weight, reps, date: now.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), fullDate };
        workouts.unshift(workout);
        localStorage.setItem('kintore-workouts-v5', JSON.stringify(workouts));

        renderWorkoutList();
        updateRoutineChecklist();
        renderWeeklyPlan();
        workoutForm.reset();
        if (pages[1].classList.contains('active')) renderCalendar();
    };

    function renderWorkoutList() {
        workoutList.innerHTML = '';
        workouts.forEach(w => {
            const li = document.createElement('li');
            li.className = 'timeline-item';
            li.innerHTML = `<div class="item-content"><span class="item-date">${w.date}</span><span class="item-title">${w.name}</span><span class="item-stats">${w.weight}kg × ${w.reps}회</span></div>`;
            workoutList.appendChild(li);
        });
    }

    let openTodoItem = null;

    function updateRoutineChecklist() {
        const today = new Date().toLocaleDateString();
        const todayWorkouts = workouts.filter(w => w.fullDate === today);
        const todayNames = todayWorkouts.map(w => w.name);
        routineContainer.innerHTML = '';
        let doneCount = 0;
        openTodoItem = null;

        if (routines.length === 0) {
            routineContainer.innerHTML = '<p class="empty-msg">마이페이지에서 루틴을 설정하세요.</p>';
            return;
        }

        routines.forEach(r => {
            const lastRecord = [...todayWorkouts].reverse().find(w => w.name === r);
            const isDone = !!lastRecord;
            if (isDone) doneCount++;

            const item = document.createElement('div');
            item.className = `routine-todo-item ${isDone ? 'completed' : ''}`;

            if (isDone) {
                item.innerHTML = `
                    <div class="todo-row">
                        <div class="todo-check done"><i class="fa-solid fa-circle-check"></i></div>
                        <div class="todo-info">
                            <span class="todo-name">${r}</span>
                            <span class="todo-record">${lastRecord.weight}kg × ${lastRecord.reps}회</span>
                        </div>
                    </div>`;
            } else {
                item.innerHTML = `
                    <div class="todo-row">
                        <div class="todo-check"><i class="fa-regular fa-circle"></i></div>
                        <div class="todo-info">
                            <span class="todo-name">${r}</span>
                            <span class="todo-hint">탭하여 기록</span>
                        </div>
                    </div>`;
                item.addEventListener('click', () => openTodoForm(item, r));
            }

            routineContainer.appendChild(item);
        });

        if (doneCount > 0 && doneCount === routines.length) {
            bigStamp.classList.add('active');
            setTimeout(() => bigStamp.classList.remove('active'), 3000);
        }
    }

    function openTodoForm(item, exerciseName) {
        // Close previously open form
        if (openTodoItem && openTodoItem !== item) {
            openTodoItem.querySelector('.todo-inline-form')?.remove();
            openTodoItem.classList.remove('form-open');
        }

        // Toggle off if already open
        if (item.querySelector('.todo-inline-form')) {
            item.querySelector('.todo-inline-form').remove();
            item.classList.remove('form-open');
            openTodoItem = null;
            return;
        }

        item.classList.add('form-open');
        openTodoItem = item;

        // Suggest last recorded weight for this exercise
        const lastWorkout = workouts.find(w => w.name === exerciseName);
        const suggestedWeight = lastWorkout ? lastWorkout.weight : '';
        const suggestedReps = lastWorkout ? lastWorkout.reps : '';

        const form = document.createElement('div');
        form.className = 'todo-inline-form';
        form.innerHTML = `
            <input type="number" class="todo-weight-input" placeholder="무게 (kg)" value="${suggestedWeight}" step="0.5">
            <input type="number" class="todo-reps-input" placeholder="횟수" value="${suggestedReps}">
            <button class="todo-confirm-btn"><i class="fa-solid fa-check"></i> 완료</button>
            <button class="todo-cancel-btn">취소</button>`;
        item.appendChild(form);
        form.querySelector('.todo-weight-input').focus();

        form.querySelector('.todo-confirm-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const weight = form.querySelector('.todo-weight-input').value;
            const reps = form.querySelector('.todo-reps-input').value;
            if (!weight || !reps) { alert('무게와 횟수를 입력하세요.'); return; }

            const now = new Date();
            workouts.unshift({
                name: exerciseName, weight, reps,
                date: now.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                fullDate: now.toLocaleDateString(),
            });
            localStorage.setItem('kintore-workouts-v5', JSON.stringify(workouts));
            renderWorkoutList();
            updateRoutineChecklist();
            renderWeeklyPlan();
            if (pages[1].classList.contains('active')) renderCalendar();
        });

        form.querySelector('.todo-cancel-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            form.remove();
            item.classList.remove('form-open');
            openTodoItem = null;
        });

        // Prevent clicks inside form from bubbling to item
        form.addEventListener('click', (e) => e.stopPropagation());
    }

    // --- My Page Profile & Management ---
    const userForm = document.getElementById('user-info-form');

    function loadUserInfo() {
        const fields = ['nickname', 'height', 'weight', 'goalWeight'];
        fields.forEach(f => {
            const el = document.getElementById(`user-${f.replace('goalWeight', 'goal-weight')}`);
            if (el && userInfo[f]) el.value = userInfo[f];
        });
        // Load training settings radio buttons
        const settingMap = {
            'workout-goal': userInfo.goal || 'hypertrophy',
            'workout-freq': String(userInfo.frequency || '4'),
            'workout-exp': userInfo.experience || 'beginner',
            'workout-split': userInfo.splitPref || 'auto',
        };
        Object.entries(settingMap).forEach(([name, val]) => {
            const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
            if (el) el.checked = true;
        });
        if (userInfo.gender) {
            const g = document.querySelector(`input[name="gender"][value="${userInfo.gender}"]`);
            if (g) g.checked = true;
        }
        if (userInfo.character) {
            document.querySelectorAll('.char-option').forEach(o => o.classList.remove('selected'));
            const c = document.querySelector(`.char-option[data-char="${userInfo.character}"]`);
            if (c) c.classList.add('selected');
        }
        updateProfileDisplay();
    }

    function updateProfileDisplay() {
        document.getElementById('display-nickname').textContent = userInfo.nickname || '반가워요!';
        document.getElementById('display-weight').textContent = userInfo.weight || '0.0';
        const h = parseFloat(userInfo.height), w = parseFloat(userInfo.weight);
        const gw = parseFloat(userInfo.goalWeight);
        if (h && w) {
            const bmi = (w / ((h / 100) ** 2)).toFixed(1);
            document.getElementById('user-bmi').textContent = bmi;
        }
        if (w && gw) {
            const diff = (w - gw).toFixed(1);
            document.getElementById('weight-to-goal').textContent = diff > 0 ? `-${diff}kg` : `+${Math.abs(diff)}kg`;
        }
        updateRecommendations(userInfo.weight);
    }

    userForm.onsubmit = (e) => {
        e.preventDefault();
        userInfo.nickname = document.getElementById('user-nickname').value;
        userInfo.height = parseFloat(document.getElementById('user-height').value) || userInfo.height;
        userInfo.weight = parseFloat(document.getElementById('user-weight').value) || userInfo.weight;
        userInfo.goalWeight = parseFloat(document.getElementById('user-goal-weight').value) || userInfo.goalWeight;
        userInfo.gender = document.querySelector('input[name="gender"]:checked')?.value || 'male';
        userInfo.goal = document.querySelector('input[name="workout-goal"]:checked')?.value || 'hypertrophy';
        userInfo.frequency = parseInt(document.querySelector('input[name="workout-freq"]:checked')?.value) || 4;
        userInfo.experience = document.querySelector('input[name="workout-exp"]:checked')?.value || 'beginner';
        userInfo.splitPref = document.querySelector('input[name="workout-split"]:checked')?.value || 'auto';
        localStorage.setItem('kintore-user-info-v5', JSON.stringify(userInfo));
        updateProfileDisplay();
        renderWeeklyPlan();
        initSettingOptionFallback();
        // Visual feedback (no alert)
        const btn = userForm.querySelector('.save-user-btn');
        btn.textContent = '✓ 저장 완료!';
        setTimeout(() => { btn.textContent = '설정 저장'; }, 1800);
    };

    function updateRecommendations(w) {
        if (!w) return;
        document.getElementById('bp-weight').textContent = `${(w * 0.7).toFixed(1)}kg`;
        document.getElementById('sq-weight').textContent = `${(w * 1.0).toFixed(1)}kg`;
        document.getElementById('dl-weight').textContent = `${(w * 1.2).toFixed(1)}kg`;
    }

    // --- Routine & Exercise Management ---
    const routineInput = document.getElementById('routine-input');
    const customExInput = document.getElementById('custom-ex-input');
    const exerciseDatalist = document.getElementById('exercise-suggestions');

    function renderManageLists() {
        const rList = document.getElementById('routine-items');
        const eList = document.getElementById('custom-ex-items');
        rList.innerHTML = '';
        if (eList) eList.innerHTML = '';
        exerciseDatalist.innerHTML = '';

        routines.forEach((r, i) => {
            const li = document.createElement('li'); li.className = 'manage-item';
            li.innerHTML = `<span>${r}</span><button onclick="removeR(${i})">&times;</button>`;
            rList.appendChild(li);
        });
        customEx.forEach((e, i) => {
            if (eList) {
                const li = document.createElement('li'); li.className = 'manage-item';
                li.innerHTML = `<span>${e}</span><button onclick="removeE(${i})">&times;</button>`;
                eList.appendChild(li);
            }
            const opt = document.createElement('option'); opt.value = e; exerciseDatalist.appendChild(opt);
        });
        localStorage.setItem('kintore-routines-v5', JSON.stringify(routines));
        localStorage.setItem('kintore-custom-ex-v5', JSON.stringify(customEx));
        updateRoutineChecklist();
    }

    window.removeR = (i) => { routines.splice(i, 1); renderManageLists(); };
    window.removeE = (i) => { customEx.splice(i, 1); renderManageLists(); };
    document.getElementById('add-routine-btn').onclick = () => { if (routineInput.value) { routines.push(routineInput.value); routineInput.value = ''; renderManageLists(); } };
    if (customExInput) {
        document.getElementById('add-custom-ex-btn').onclick = () => { if (customExInput.value) { customEx.push(customExInput.value); customExInput.value = ''; renderManageLists(); } };
    }

    // =========================================================
    // FEATURE 1: 주간 운동 플랜 추천 (Algorithm-based Weekly Plan)
    // =========================================================

    const MUSCLE_GROUP_MAP = {
        '스쿼트': 'legs', '레그프레스': 'legs', '런지': 'legs', '레그익스텐션': 'legs', '레그컬': 'legs',
        '데드리프트': 'pull', '바벨로우': 'pull', '랫풀다운': 'pull', '시티드로우': 'pull', '풀업': 'pull', '친업': 'pull',
        '벤치프레스': 'push', '인클라인벤치': 'push', '오버헤드프레스': 'push', '딥스': 'push', '덤벨플라이': 'push', '숄더프레스': 'push',
    };

    const EXERCISE_TEMPLATES = {
        Push: ['벤치프레스', '인클라인벤치', '오버헤드프레스', '딥스'],
        Pull: ['데드리프트', '바벨로우', '랫풀다운', '풀업'],
        Legs: ['스쿼트', '레그프레스', '런지', '레그컬'],
        Upper: ['벤치프레스', '오버헤드프레스', '바벨로우', '풀업'],
        Lower: ['스쿼트', '레그프레스', '런지', '레그컬'],
        Full:  ['스쿼트', '벤치프레스', '데드리프트', '풀업'],
    };

    const BASE_MULTIPLIERS = {
        '벤치프레스': 0.7, '인클라인벤치': 0.6, '오버헤드프레스': 0.45, '딥스': 0.5,
        '데드리프트': 1.2, '바벨로우': 0.8, '랫풀다운': 0.7, '풀업': 0.4, '친업': 0.4,
        '스쿼트': 1.0, '레그프레스': 1.5, '런지': 0.5, '레그컬': 0.4,
    };

    function analyzeMuscleGroupCoverage(daysBack = 28) {
        const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
        const coverage = { push: 0, pull: 0, legs: 0 };
        workouts.forEach(w => {
            if (new Date(w.fullDate).getTime() >= cutoff) {
                const group = MUSCLE_GROUP_MAP[w.name];
                if (group) coverage[group]++;
            }
        });
        return coverage;
    }

    function detectProgressiveOverload(exerciseName) {
        const now = Date.now();
        const MS7 = 7 * 24 * 60 * 60 * 1000;
        const MS28 = 28 * 24 * 60 * 60 * 1000;
        const last7 = workouts.filter(w => w.name === exerciseName && (now - new Date(w.fullDate).getTime()) <= MS7);
        const last28 = workouts.filter(w => w.name === exerciseName && (now - new Date(w.fullDate).getTime()) <= MS28);

        const bodyWeight = parseFloat(userInfo.weight) || 70;
        const baseMultiplier = BASE_MULTIPLIERS[exerciseName] || 0.5;
        const expFactor = { beginner: 0.85, intermediate: 1.0, advanced: 1.1 }[userInfo.experience] || 1.0;

        let baseWeight;
        if (last28.length > 0) {
            baseWeight = Math.max(...last28.map(w => parseFloat(w.weight) || 0));
        } else {
            baseWeight = Math.round(bodyWeight * baseMultiplier * expFactor / 2.5) * 2.5;
        }

        let progressMultiplier = 1.0;
        if (last7.length >= 3) progressMultiplier = 1.025;
        else if (last28.length >= 9) progressMultiplier = 1.05;

        const recommended = Math.round(baseWeight * progressMultiplier / 2.5) * 2.5;
        const maxSafe = bodyWeight * baseMultiplier * 2.5;
        return Math.min(Math.max(recommended, 20), maxSafe);
    }

    function assignPPLSplit(coverage) {
        const min = Math.min(coverage.push, coverage.pull, coverage.legs);
        let weakest = 'push';
        if (coverage.pull === min) weakest = 'pull';
        if (coverage.legs === min) weakest = 'legs';
        // PPL cycle starting from weakest
        const cycle = { push: ['Push','Pull','Legs'], pull: ['Pull','Push','Legs'], legs: ['Legs','Push','Pull'] };
        return cycle[weakest];
    }

    function buildWorkoutSchedule(coverage) {
        const splitPref = userInfo.splitPref || 'auto';
        const freqDays = parseInt(userInfo.frequency) || 4;

        // Which day indices (0=Mon..6=Sun) are workout days
        const freqPatterns = {
            3: [0, 2, 4],
            4: [0, 1, 3, 4],
            5: [0, 1, 2, 4, 5],
            6: [0, 1, 2, 3, 4, 5],
        };
        const workoutIndices = new Set(freqPatterns[freqDays] || freqPatterns[4]);

        // Determine exercise type cycle
        let typeCycle;
        if (splitPref === 'upper-lower') {
            typeCycle = ['Upper', 'Lower'];
        } else if (splitPref === 'full') {
            typeCycle = ['Full'];
        } else {
            // auto or ppl
            typeCycle = assignPPLSplit(coverage);
        }

        const schedule = [];
        let cycleIdx = 0;
        for (let i = 0; i < 7; i++) {
            if (workoutIndices.has(i)) {
                schedule.push(typeCycle[cycleIdx % typeCycle.length]);
                cycleIdx++;
            } else {
                schedule.push('Rest');
            }
        }
        return schedule;
    }

    function generateWeeklyPlan() {
        const coverage = analyzeMuscleGroupCoverage();
        const schedule = buildWorkoutSchedule(coverage);
        const today = new Date();

        return schedule.map((type, i) => {
            const day = new Date(today);
            day.setDate(today.getDate() + i);
            const dayName = ['일', '월', '화', '수', '목', '금', '토'][day.getDay()];
            const dateStr = `${day.getMonth() + 1}/${day.getDate()}`;
            if (type === 'Rest') return { day: dayName, date: dateStr, type: 'Rest', exercises: [] };
            const exercises = (EXERCISE_TEMPLATES[type] || []).slice(0, 3).map(name => ({
                name, weight: detectProgressiveOverload(name),
            }));
            return { day: dayName, date: dateStr, type, exercises };
        });
    }

    function renderWeeklyPlan() {
        const container = document.getElementById('weekly-plan-container');
        if (!container) return;
        const plan = generateWeeklyPlan();
        const typeColors = { Push: '#4f46e5', Pull: '#0891b2', Legs: '#059669', Rest: '#94a3b8', Upper: '#7c3aed', Lower: '#d97706', Full: '#dc2626' };
        const typeIcons  = { Push: '💪', Pull: '⚡', Legs: '🏋️', Rest: '😴', Upper: '👆', Lower: '👇', Full: '🎯' };
        const goalLabels = { hypertrophy: '근비대', strength: '근력', diet: '다이어트', health: '건강유지' };
        const goalLabel  = goalLabels[userInfo.goal] || '';

        container.innerHTML = plan.map((day, idx) => `
            <div class="weekly-plan-card ${day.type === 'Rest' ? 'rest-day' : ''} ${idx === 0 ? 'today-card' : ''}">
                <div class="plan-day-header">
                    <div class="plan-day-left">
                        <span class="plan-day-name">${day.day}</span>
                        <span class="plan-day-date">${day.date}</span>
                    </div>
                    <span class="plan-day-type" style="color:${typeColors[day.type] || '#94a3b8'}">${typeIcons[day.type] || ''} ${day.type}</span>
                </div>
                ${day.exercises.map(ex => `
                    <div class="plan-exercise-row">
                        <span class="plan-ex-name">${escapeHtml(ex.name)}</span>
                        <span class="plan-ex-weight">${ex.weight}kg</span>
                    </div>
                `).join('') || '<span class="plan-rest-text">😴 오늘은 쉬어요</span>'}
                ${idx === 0 && goalLabel ? `<div class="plan-goal-tag">${goalLabel}</div>` : ''}
            </div>
        `).join('');
    }

    document.getElementById('refresh-plan-btn').addEventListener('click', renderWeeklyPlan);

    // =========================================================
    // FEATURE 2: 근처 헬스장 목록 (Geolocation + Overpass API)
    // =========================================================

    let gymPageInitialized = false;

    function initGymPage() {
        if (gymPageInitialized) {
            renderCheckInStatus();
            return;
        }
        gymPageInitialized = true;
        renderCheckInStatus();
        document.getElementById('find-gyms-btn').addEventListener('click', findNearbyGyms);
        document.getElementById('checkout-btn').addEventListener('click', checkOut);
    }

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    async function fetchGymsFromOverpass(lat, lon) {
        const query = `[out:json][timeout:15];(node["leisure"="fitness_centre"](around:2000,${lat},${lon});way["leisure"="fitness_centre"](around:2000,${lat},${lon}););out center;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query),
        });
        if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
        const data = await res.json();
        return data.elements
            .filter(el => el.tags?.name)
            .map(el => {
                const elLat = el.lat || el.center?.lat;
                const elLon = el.lon || el.center?.lon;
                return {
                    id: `${el.type}_${el.id}`,
                    name: el.tags.name,
                    address: el.tags['addr:full'] || el.tags['addr:street'] || '',
                    lat: elLat,
                    lon: elLon,
                    distance: haversineDistance(lat, lon, elLat, elLon),
                };
            })
            .sort((a, b) => a.distance - b.distance);
    }

    async function findNearbyGyms() {
        const statusEl = document.getElementById('gym-search-status');
        const listEl = document.getElementById('gym-list');

        // Check 10-minute cache
        const cache = JSON.parse(localStorage.getItem('kintore-gym-cache-v5') || 'null');
        if (cache && (Date.now() - cache.timestamp) < 10 * 60 * 1000) {
            renderGymList(cache.gyms);
            statusEl.textContent = `${cache.gyms.length}개 (캐시)`;
            return;
        }

        statusEl.textContent = '위치 정보를 가져오는 중...';
        listEl.innerHTML = '';

        if (!navigator.geolocation) {
            statusEl.textContent = '이 브라우저는 위치 서비스를 지원하지 않습니다.';
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            statusEl.textContent = '주변 헬스장을 검색 중...';
            try {
                const gyms = await fetchGymsFromOverpass(latitude, longitude);
                localStorage.setItem('kintore-gym-cache-v5', JSON.stringify({
                    lat: latitude, lon: longitude, timestamp: Date.now(), gyms,
                }));
                renderGymList(gyms);
                statusEl.textContent = gyms.length ? `${gyms.length}개 헬스장 발견` : '주변에 헬스장이 없습니다';
            } catch (e) {
                statusEl.textContent = '검색 중 오류가 발생했습니다.';
                console.error('Overpass API error:', e);
            }
        }, () => {
            statusEl.textContent = '위치 접근이 거부되었습니다.';
        });
    }

    function renderGymList(gyms) {
        const listEl = document.getElementById('gym-list');
        if (!gyms.length) {
            listEl.innerHTML = '<p class="empty-msg">주변 2km 이내 헬스장을 찾지 못했습니다.</p>';
            return;
        }
        const checkin = JSON.parse(localStorage.getItem('kintore-checkin-v5') || 'null');
        listEl.innerHTML = gyms.map(g => {
            const isCheckedIn = checkin?.gymId === g.id;
            const gymJson = JSON.stringify(g).replace(/'/g, "\\'");
            return `
            <div class="gym-list-item ${isCheckedIn ? 'checked-in' : ''}">
                <div class="gym-info">
                    <span class="gym-name">${escapeHtml(g.name)}</span>
                    ${g.address ? `<span class="gym-address"><i class="fa-solid fa-map-pin"></i> ${escapeHtml(g.address)}</span>` : ''}
                    <span class="gym-distance"><i class="fa-solid fa-route"></i> ${(g.distance / 1000).toFixed(2)} km</span>
                </div>
                ${isCheckedIn
                    ? '<span class="checkin-badge"><i class="fa-solid fa-circle-check"></i> 체크인 중</span>'
                    : `<button class="checkin-btn" onclick='window.checkInGym(${JSON.stringify(g)})'>체크인</button>`
                }
            </div>`;
        }).join('');
    }

    window.checkInGym = (gym) => {
        const checkin = { gymName: gym.name, gymId: gym.id, checkinTime: new Date().toISOString(), lat: gym.lat, lon: gym.lon };
        localStorage.setItem('kintore-checkin-v5', JSON.stringify(checkin));
        renderCheckInStatus();
        const cache = JSON.parse(localStorage.getItem('kintore-gym-cache-v5') || 'null');
        if (cache) renderGymList(cache.gyms);
        loadGymRanking(gym.id);
    };

    function checkOut() {
        localStorage.removeItem('kintore-checkin-v5');
        document.getElementById('checkin-status-section').style.display = 'none';
        document.getElementById('gym-ranking-section').style.display = 'none';
        const cache = JSON.parse(localStorage.getItem('kintore-gym-cache-v5') || 'null');
        if (cache) renderGymList(cache.gyms);
    }

    function renderCheckInStatus() {
        const checkin = JSON.parse(localStorage.getItem('kintore-checkin-v5') || 'null');
        const statusSection = document.getElementById('checkin-status-section');
        const rankingSection = document.getElementById('gym-ranking-section');

        if (!checkin) {
            if (statusSection) statusSection.style.display = 'none';
            if (rankingSection) rankingSection.style.display = 'none';
            return;
        }

        if (statusSection) {
            statusSection.style.display = 'block';
            document.getElementById('checkin-gym-name').textContent = checkin.gymName;
            document.getElementById('checkin-time').textContent =
                new Date(checkin.checkinTime).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }

        if (rankingSection) {
            rankingSection.style.display = 'block';
            loadGymRanking(checkin.gymId);
        }
    }

    // =========================================================
    // FEATURE 3: 커뮤니티 헬스장 랭킹 (Firebase Firestore)
    // =========================================================

    let db = null;
    let currentRankingExercise = 'squat';
    let currentGymId = null;

    function initFirebase() {
        if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
            try {
                if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
                db = firebase.firestore();
            } catch (e) {
                console.warn('Firebase init failed:', e);
            }
        }
    }

    async function ensureGymDocument(gymId, checkinData) {
        if (!db) return;
        const ref = db.collection('gyms').doc(gymId);
        const doc = await ref.get();
        if (!doc.exists) {
            await ref.set({
                name: checkinData.gymName,
                lat: checkinData.lat,
                lon: checkinData.lon,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    async function loadGymRanking(gymId) {
        currentGymId = gymId;
        const section = document.getElementById('gym-ranking-section');
        if (!section) return;
        section.style.display = 'block';

        const listEl = document.getElementById('ranking-list');

        if (!db) {
            listEl.innerHTML = '<p class="empty-msg"><i class="fa-solid fa-circle-info"></i> Firebase 설정이 필요합니다.<br>firebase-config.js를 추가하면 커뮤니티 랭킹을 사용할 수 있어요.</p>';
            return;
        }

        listEl.innerHTML = '<p class="empty-msg">로딩 중...</p>';
        try {
            const ref = db.collection('gyms').doc(gymId).collection('leaderboard').doc(currentRankingExercise);
            const doc = await ref.get();
            const entries = doc.exists ? (doc.data().entries || []) : [];
            renderGymRanking(entries, currentRankingExercise);
        } catch (e) {
            listEl.innerHTML = '<p class="empty-msg">랭킹 로드 중 오류가 발생했습니다.</p>';
            console.error('Ranking load error:', e);
        }
    }

    function renderGymRanking(entries, exercise) {
        const listEl = document.getElementById('ranking-list');
        const badges = { squat: '스쿼트 짱', deadlift: '데드리프트 짱', bench: '벤치프레스 짱' };
        const sorted = [...entries].sort((a, b) => b.weight - a.weight).slice(0, 10);

        if (!sorted.length) {
            listEl.innerHTML = '<p class="empty-msg">아직 기록이 없습니다. 첫 번째로 등록해보세요! 🏆</p>';
            return;
        }

        listEl.innerHTML = sorted.map((entry, i) => `
            <div class="ranking-row ${i === 0 ? 'rank-first' : ''}">
                <span class="rank-position">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                <span class="rank-nickname">
                    ${escapeHtml(entry.nickname)}
                    ${i === 0 ? `<span class="rank-badge">${escapeHtml(badges[exercise])}</span>` : ''}
                </span>
                <span class="rank-weight">${entry.weight}kg</span>
            </div>
        `).join('');
    }

    async function submitBestLift(gymId, exercise, weight, nickname) {
        if (!db) {
            alert('Firebase 설정이 필요합니다. firebase-config.js를 추가해 주세요.');
            return;
        }

        const checkin = JSON.parse(localStorage.getItem('kintore-checkin-v5') || 'null');
        if (checkin) await ensureGymDocument(gymId, checkin);

        const ref = db.collection('gyms').doc(gymId).collection('leaderboard').doc(exercise);
        const badgeMap = { squat: '스쿼트 짱', deadlift: '데드리프트 짱', bench: '벤치프레스 짱' };

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(ref);
            let entries = doc.exists ? (doc.data().entries || []) : [];

            // Replace existing entry for same nickname
            entries = entries.filter(e => e.nickname !== nickname);
            entries.push({ nickname, weight: parseFloat(weight), submittedAt: new Date().toISOString() });
            entries.sort((a, b) => b.weight - a.weight);
            if (entries.length > 20) entries = entries.slice(0, 20);

            // Assign badge to top entry
            entries = entries.map((e, i) => ({ ...e, badge: i === 0 ? badgeMap[exercise] : '' }));
            transaction.set(ref, { entries });
        });

        await loadGymRanking(gymId);
    }

    window.switchRankingTab = (exercise) => {
        currentRankingExercise = exercise;
        document.querySelectorAll('.ranking-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.ranking-tab-btn[data-exercise="${exercise}"]`).classList.add('active');
        if (currentGymId) loadGymRanking(currentGymId);
    };

    window.submitRankingForm = () => {
        const nickname = document.getElementById('ranking-nickname').value.trim();
        const weight = document.getElementById('ranking-weight').value;
        if (!nickname || !weight) { alert('닉네임과 무게를 입력해주세요.'); return; }
        if (!currentGymId) { alert('먼저 헬스장에 체크인해주세요.'); return; }
        submitBestLift(currentGymId, currentRankingExercise, parseFloat(weight), nickname);
        document.getElementById('ranking-nickname').value = '';
        document.getElementById('ranking-weight').value = '';
    };

    // =========================================================
    // SAMPLE DATA: 첫 실행 시 데모용 샘플 데이터 로드
    // =========================================================

    function initSampleData() {
        if (localStorage.getItem('kintore-sample-loaded-v5')) return;
        if (workouts.length > 0) return;

        // 유저 정보
        userInfo = {
            nickname: '운동왕', gender: 'male',
            height: 175, weight: 75, goalWeight: 70,
            character: 'fa-user-ninja',
            goal: 'hypertrophy', frequency: 4,
            experience: 'intermediate', splitPref: 'auto',
        };
        localStorage.setItem('kintore-user-info-v5', JSON.stringify(userInfo));

        // 28일치 운동 기록 (Push 11회, Pull 9회, Legs 4회 → Legs-first 스플릿)
        const now = Date.now();
        const day = 86400000;
        const sampleWorkouts = [
            { daysAgo: 27, name: '벤치프레스', weight: 60, reps: 8 },
            { daysAgo: 26, name: '데드리프트', weight: 80, reps: 5 },
            { daysAgo: 25, name: '스쿼트', weight: 70, reps: 8 },
            { daysAgo: 24, name: '오버헤드프레스', weight: 40, reps: 10 },
            { daysAgo: 22, name: '바벨로우', weight: 55, reps: 8 },
            { daysAgo: 21, name: '벤치프레스', weight: 62.5, reps: 8 },
            { daysAgo: 20, name: '데드리프트', weight: 82.5, reps: 5 },
            { daysAgo: 18, name: '인클라인벤치', weight: 50, reps: 10 },
            { daysAgo: 17, name: '풀업', weight: 0, reps: 8 },
            { daysAgo: 16, name: '오버헤드프레스', weight: 42.5, reps: 8 },
            { daysAgo: 15, name: '데드리프트', weight: 85, reps: 5 },
            { daysAgo: 14, name: '스쿼트', weight: 72.5, reps: 8 },
            { daysAgo: 13, name: '벤치프레스', weight: 65, reps: 8 },
            { daysAgo: 11, name: '바벨로우', weight: 57.5, reps: 8 },
            { daysAgo: 10, name: '딥스', weight: 0, reps: 12 },
            { daysAgo: 9,  name: '데드리프트', weight: 87.5, reps: 5 },
            { daysAgo: 8,  name: '스쿼트', weight: 75, reps: 8 },
            { daysAgo: 7,  name: '벤치프레스', weight: 67.5, reps: 8 },
            { daysAgo: 6,  name: '오버헤드프레스', weight: 45, reps: 8 },
            { daysAgo: 5,  name: '데드리프트', weight: 90, reps: 5 },
            { daysAgo: 4,  name: '레그프레스', weight: 100, reps: 12 },
            { daysAgo: 3,  name: '벤치프레스', weight: 70, reps: 6 },
            { daysAgo: 2,  name: '풀업', weight: 0, reps: 10 },
            { daysAgo: 1,  name: '벤치프레스', weight: 70, reps: 8 },
        ];

        workouts = sampleWorkouts.map(s => {
            const ts = now - s.daysAgo * day;
            const d = new Date(ts);
            return {
                id: `sample-${ts}`,
                name: s.name,
                weight: s.weight,
                reps: s.reps,
                date: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`,
                fullDate: d.toLocaleDateString(),
                timestamp: ts,
            };
        });
        localStorage.setItem('kintore-workouts-v5', JSON.stringify(workouts));

        // 루틴 설정
        routines = ['스쿼트', '벤치프레스', '데드리프트'];
        localStorage.setItem('kintore-routines-v5', JSON.stringify(routines));

        localStorage.setItem('kintore-sample-loaded-v5', '1');
    }

    // --- :has() 폴백: 구버전 브라우저용 .active 클래스 토글 ---
    function initSettingOptionFallback() {
        document.querySelectorAll('.setting-options').forEach(group => {
            const options = group.querySelectorAll('.setting-option');
            options.forEach(opt => {
                const radio = opt.querySelector('input[type="radio"]');
                if (radio && radio.checked) opt.classList.add('active');
                opt.addEventListener('click', () => {
                    options.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                });
            });
        });
    }

    // --- Init ---
    initSampleData();
    initFirebase();
    loadUserInfo();
    initSettingOptionFallback();
    renderWorkoutList();
    renderManageLists();
    renderCalendar();
    renderWeeklyPlan();
});
