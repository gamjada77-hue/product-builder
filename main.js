document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const pages = document.querySelectorAll('.page');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            tabBtns.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // --- State Management ---
    let userInfo = JSON.parse(localStorage.getItem('kintore-user-info-v4') || '{}');
    let workouts = JSON.parse(localStorage.getItem('kintore-workouts-v3') || '[]');
    let customExercises = JSON.parse(localStorage.getItem('kintore-custom-ex') || '["벤치프레스", "스쿼트", "데드리프트", "오버헤드 프레스", "바벨 로우"]');
    let routines = JSON.parse(localStorage.getItem('kintore-routines') || '[]');

    // --- My Page: Character Selection ---
    const charOptions = document.querySelectorAll('.char-option');
    let selectedChar = userInfo.character || 'fa-user-ninja';

    charOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            charOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedChar = opt.dataset.char;
        });
    });

    // --- My Page: Custom Exercises ---
    const customExInput = document.getElementById('custom-ex-input');
    const addCustomExBtn = document.getElementById('add-custom-ex-btn');
    const customExList = document.getElementById('custom-ex-items');
    const exerciseDatalist = document.getElementById('exercise-suggestions');

    function updateExerciseUI() {
        customExList.innerHTML = '';
        exerciseDatalist.innerHTML = '';
        customExercises.forEach((ex, index) => {
            const li = document.createElement('li');
            li.className = 'manage-item';
            li.innerHTML = `<span>${ex}</span> <button class="remove-btn" onclick="removeExercise(${index})"><i class="fa-solid fa-trash"></i></button>`;
            customExList.appendChild(li);

            const opt = document.createElement('option');
            opt.value = ex;
            exerciseDatalist.appendChild(opt);
        });
        localStorage.setItem('kintore-custom-ex', JSON.stringify(customExercises));
    }

    window.removeExercise = (index) => {
        customExercises.splice(index, 1);
        updateExerciseUI();
    };

    addCustomExBtn.addEventListener('click', () => {
        const val = customExInput.value.trim();
        if (val && !customExercises.includes(val)) {
            customExercises.push(val);
            customExInput.value = '';
            updateExerciseUI();
        }
    });

    // --- My Page: Routine Management ---
    const routineInput = document.getElementById('routine-input');
    const addRoutineBtn = document.getElementById('add-routine-btn');
    const routineList = document.getElementById('routine-items');

    function updateRoutineUI() {
        routineList.innerHTML = '';
        routines.forEach((r, index) => {
            const li = document.createElement('li');
            li.className = 'manage-item';
            li.innerHTML = `<span>${r}</span> <button class="remove-btn" onclick="removeRoutine(${index})"><i class="fa-solid fa-trash"></i></button>`;
            routineList.appendChild(li);
        });
        localStorage.setItem('kintore-routines', JSON.stringify(routines));
        updateTodayRoutineChecklist();
    }

    window.removeRoutine = (index) => {
        routines.splice(index, 1);
        updateRoutineUI();
    };

    addRoutineBtn.addEventListener('click', () => {
        const val = routineInput.value.trim();
        if (val && !routines.includes(val)) {
            routines.push(val);
            routineInput.value = '';
            updateRoutineUI();
        }
    });

    // --- Today's Routine Checklist & Stamp ---
    const todayRoutineContainer = document.getElementById('today-routine-list');
    const stampOverlay = document.getElementById('well-done-stamp');

    function updateTodayRoutineChecklist() {
        if (routines.length === 0) {
            todayRoutineContainer.innerHTML = '<p class="empty-msg">마이페이지에서 오늘의 루틴을 만들어보세요!</p>';
            return;
        }

        const today = new Date().toLocaleDateString();
        const todaysWorkouts = workouts.filter(w => w.fullDate === today).map(w => w.name);
        
        todayRoutineContainer.innerHTML = '';
        let completedCount = 0;

        routines.forEach(r => {
            const isDone = todaysWorkouts.includes(r);
            if (isDone) completedCount++;

            const chip = document.createElement('div');
            chip.className = `routine-chip ${isDone ? 'completed' : ''}`;
            chip.innerHTML = `${isDone ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-regular fa-circle"></i>'} ${r}`;
            todayRoutineContainer.appendChild(chip);
        });

        // Stamp Logic
        if (routines.length > 0 && completedCount === routines.length) {
            stampOverlay.classList.add('active');
        } else {
            stampOverlay.classList.remove('active');
        }
    }

    // --- User Info ---
    const userForm = document.getElementById('user-info-form');
    const displayNickname = document.getElementById('display-nickname');
    const displayWeightHeader = document.getElementById('display-weight');
    const headerAvatar = document.getElementById('header-avatar');
    
    function loadUserInfo() {
        const fields = ['nickname', 'age', 'height', 'weight', 'goal-weight'];
        fields.forEach(f => {
            const input = document.getElementById(`user-${f}`);
            if (userInfo[f]) input.value = userInfo[f];
        });

        if (userInfo.gender) {
            const radio = document.querySelector(`input[name="gender"][value="${userInfo.gender}"]`);
            if (radio) radio.checked = true;
        }

        if (userInfo.character) {
            charOptions.forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.char === userInfo.character) opt.classList.add('selected');
            });
        }

        updateTopProfile();
        calculateStats();
        updateRecommendations(userInfo.weight);
    }

    function updateTopProfile() {
        displayNickname.textContent = userInfo.nickname ? `${userInfo.nickname}님` : '반가워요!';
        displayWeightHeader.textContent = userInfo.weight || '0.0';
        headerAvatar.innerHTML = `<i class="fa-solid ${userInfo.character || 'fa-user-ninja'}"></i>`;
        
        const rankName = document.getElementById('rank-my-name');
        if (userInfo.nickname) rankName.textContent = userInfo.nickname;
        
        const points = (workouts.length * 150) + 1200;
        document.getElementById('rank-my-score').textContent = `${points.toLocaleString()} pts`;
    }

    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fields = ['nickname', 'age', 'height', 'weight', 'goal-weight'];
        fields.forEach(f => userInfo[f] = document.getElementById(`user-${f}`).value);
        userInfo.gender = document.querySelector('input[name="gender"]:checked').value;
        userInfo.character = selectedChar;

        localStorage.setItem('kintore-user-info-v4', JSON.stringify(userInfo));
        updateTopProfile();
        calculateStats();
        updateRecommendations(userInfo.weight);
        alert('프로필이 저장되었습니다!');
    });

    function calculateStats() {
        const bmiEl = document.getElementById('user-bmi');
        const goalEl = document.getElementById('weight-to-goal');

        if (userInfo.height && userInfo.weight) {
            const h = userInfo.height / 100;
            bmiEl.textContent = (userInfo.weight / (h * h)).toFixed(1);
        }
        if (userInfo.weight && userInfo['goal-weight']) {
            const diff = (userInfo.weight - userInfo['goal-weight']).toFixed(1);
            goalEl.textContent = diff > 0 ? `${diff}kg` : `${Math.abs(diff)}kg`;
        }
    }

    // --- Workout Logic ---
    const bpValue = document.getElementById('bp-weight');
    const sqValue = document.getElementById('sq-weight');
    const dlValue = document.getElementById('dl-weight');
    const workoutForm = document.getElementById('workout-form');
    const workoutList = document.getElementById('workout-list');

    function updateRecommendations(weight) {
        if (!weight || weight <= 0) return;
        bpValue.textContent = `${(weight * 0.7).toFixed(1)} kg`;
        sqValue.textContent = `${(weight * 1.0).toFixed(1)} kg`;
        dlValue.textContent = `${(weight * 1.2).toFixed(1)} kg`;
    }

    workoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('exercise-name').value;
        const weight = document.getElementById('workout-weight').value;
        const reps = document.getElementById('workout-reps').value;
        const now = new Date();
        const dateStr = now.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const fullDate = now.toLocaleDateString();

        const newWorkout = { name, weight, reps, date: dateStr, fullDate };
        workouts.unshift(newWorkout);
        
        addTimelineItem(newWorkout);
        workoutForm.reset();
        localStorage.setItem('kintore-workouts-v3', JSON.stringify(workouts));
        updateTodayRoutineChecklist();
        updateTopProfile();
    });

    function addTimelineItem(w) {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        li.innerHTML = `
            <div class="item-content">
                <div class="item-date">${w.date}</div>
                <div class="item-title">${w.name}</div>
                <div class="item-stats">${w.weight} kg × ${w.reps}회</div>
            </div>
        `;
        workoutList.prepend(li);
    }

    // --- Initialize ---
    loadUserInfo();
    updateExerciseUI();
    updateRoutineUI();
    workouts.slice().reverse().forEach(w => addTimelineItem(w));
    workoutList.innerHTML = ''; // Clear and re-populate for correct order
    workouts.forEach(w => addTimelineItem(w));
    updateTodayRoutineChecklist();
});
