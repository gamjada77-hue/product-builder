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

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day empty';
            calendarGrid.appendChild(div);
        }

        // Days of current month
        for (let d = 1; d <= lastDate; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSunday = new Date(year, month, d).getDay() === 0;
            const isToday = new Date().toLocaleDateString() === new Date(year, month, d).toLocaleDateString();

            const dayDiv = document.createElement('div');
            dayDiv.className = `calendar-day ${isSunday ? 'sunday' : ''} ${isToday ? 'today' : ''}`;
            dayDiv.innerHTML = `<span class="day-num">${d}</span><div class="day-content"></div>`;
            
            // Add Plan indicators
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

            // Add Stamp if completed
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

    function updateRoutineChecklist() {
        const today = new Date().toLocaleDateString();
        const todayWorkouts = workouts.filter(w => w.fullDate === today).map(w => w.name);
        routineContainer.innerHTML = '';
        let doneCount = 0;

        if (routines.length === 0) {
            routineContainer.innerHTML = '<p class="empty-msg">마이페이지에서 루틴을 설정하세요.</p>';
            return;
        }

        routines.forEach(r => {
            const isDone = todayWorkouts.includes(r);
            if (isDone) doneCount++;
            const chip = document.createElement('div');
            chip.className = `routine-chip ${isDone ? 'completed' : ''}`;
            chip.innerHTML = `${isDone ? '<i class="fa-solid fa-check"></i>' : ''} ${r}`;
            routineContainer.appendChild(chip);
        });

        if (doneCount > 0 && doneCount === routines.length) {
            bigStamp.classList.add('active');
            setTimeout(() => bigStamp.classList.remove('active'), 3000);
        }
    }

    // --- My Page Profile & Management ---
    const userForm = document.getElementById('user-info-form');
    function loadUserInfo() {
        const fields = ['nickname', 'height', 'weight'];
        fields.forEach(f => { if(userInfo[f]) document.getElementById(`user-${f}`).value = userInfo[f]; });
        updateProfileDisplay();
    }

    function updateProfileDisplay() {
        document.getElementById('display-nickname').textContent = userInfo.nickname || '반가워요!';
        document.getElementById('display-weight').textContent = userInfo.weight || '0.0';
        updateRecommendations(userInfo.weight);
    }

    userForm.onsubmit = (e) => {
        e.preventDefault();
        userInfo.nickname = document.getElementById('user-nickname').value;
        userInfo.height = document.getElementById('user-height').value;
        userInfo.weight = document.getElementById('user-weight').value;
        localStorage.setItem('kintore-user-info-v5', JSON.stringify(userInfo));
        updateProfileDisplay();
        alert('저장되었습니다.');
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
        rList.innerHTML = ''; eList.innerHTML = ''; exerciseDatalist.innerHTML = '';

        routines.forEach((r, i) => {
            const li = document.createElement('li'); li.className='manage-item';
            li.innerHTML=`<span>${r}</span><button onclick="removeR(${i})">&times;</button>`;
            rList.appendChild(li);
        });
        customEx.forEach((e, i) => {
            const li = document.createElement('li'); li.className='manage-item';
            li.innerHTML=`<span>${e}</span><button onclick="removeE(${i})">&times;</button>`;
            eList.appendChild(li);
            const opt = document.createElement('option'); opt.value = e; exerciseDatalist.appendChild(opt);
        });
        localStorage.setItem('kintore-routines-v5', JSON.stringify(routines));
        localStorage.setItem('kintore-custom-ex-v5', JSON.stringify(customEx));
        updateRoutineChecklist();
    }

    window.removeR = (i) => { routines.splice(i, 1); renderManageLists(); };
    window.removeE = (i) => { customEx.splice(i, 1); renderManageLists(); };
    document.getElementById('add-routine-btn').onclick = () => { if(routineInput.value) { routines.push(routineInput.value); routineInput.value=''; renderManageLists(); } };
    document.getElementById('add-custom-ex-btn').onclick = () => { if(customExInput.value) { customEx.push(customExInput.value); customExInput.value=''; renderManageLists(); } };

    // --- Init ---
    loadUserInfo();
    renderWorkoutList();
    renderManageLists();
    renderCalendar();
});
