document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
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

    // --- My Page Logic ---
    const userForm = document.getElementById('user-info-form');
    const displayNickname = document.getElementById('display-nickname');
    const displayWeightHeader = document.getElementById('display-weight');
    
    const fields = ['nickname', 'age', 'height', 'weight', 'goal-weight'];
    
    function loadUserInfo() {
        const userInfo = JSON.parse(localStorage.getItem('kintore-user-info') || '{}');
        fields.forEach(f => {
            const input = document.getElementById(`user-${f}`);
            if (userInfo[f]) {
                input.value = userInfo[f];
            }
        });
        updateHeader(userInfo);
        calculateStats(userInfo);
        updateRecommendations(userInfo.weight);
    }

    function updateHeader(info) {
        displayNickname.textContent = info.nickname ? `${info.nickname}님, 반가워요!` : '반가워요!';
        displayWeightHeader.textContent = info.weight || '0.0';
    }

    function calculateStats(info) {
        const bmiEl = document.getElementById('user-bmi');
        const goalEl = document.getElementById('weight-to-goal');

        if (info.height && info.weight) {
            const heightM = info.height / 100;
            const bmi = (info.weight / (heightM * heightM)).toFixed(1);
            bmiEl.textContent = bmi;
        } else {
            bmiEl.textContent = '-';
        }

        if (info.weight && info['goal-weight']) {
            const diff = (info.weight - info['goal-weight']).toFixed(1);
            goalEl.textContent = diff > 0 ? `${diff}kg 감량 필요` : `${Math.abs(diff)}kg 증량 필요`;
        } else {
            goalEl.textContent = '-';
        }
    }

    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInfo = {};
        fields.forEach(f => {
            userInfo[f] = document.getElementById(`user-${f}`).value;
        });
        localStorage.setItem('kintore-user-info', JSON.stringify(userInfo));
        updateHeader(userInfo);
        calculateStats(userInfo);
        updateRecommendations(userInfo.weight);
        alert('정보가 저장되었습니다!');
    });

    // --- Workout Note Logic ---
    const bpValue = document.getElementById('bp-weight');
    const sqValue = document.getElementById('sq-weight');
    const dlValue = document.getElementById('dl-weight');
    
    const workoutForm = document.getElementById('workout-form');
    const workoutList = document.getElementById('workout-list');

    function updateRecommendations(weight) {
        if (!weight || weight <= 0) {
            bpValue.textContent = '0 kg';
            sqValue.textContent = '0 kg';
            dlValue.textContent = '0 kg';
            return;
        }
        bpValue.textContent = `${(weight * 0.7).toFixed(1)} kg`;
        sqValue.textContent = `${(weight * 1.0).toFixed(1)} kg`;
        dlValue.textContent = `${(weight * 1.2).toFixed(1)} kg`;
    }

    workoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('exercise-name').value;
        const weight = document.getElementById('workout-weight').value;
        const reps = document.getElementById('workout-reps').value;
        const date = new Date().toLocaleString('ko-KR', { 
            month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit' 
        });

        addTimelineItem(name, weight, reps, date);
        
        workoutForm.reset();
        saveWorkouts();
    });

    function addTimelineItem(name, weight, reps, date) {
        const li = document.createElement('li');
        li.className = 'timeline-item';
        li.innerHTML = `
            <div class="item-content">
                <div class="item-date">${date}</div>
                <div class="item-title">${name}</div>
                <div class="item-stats">${weight} kg × ${reps}회</div>
            </div>
        `;
        workoutList.prepend(li);
    }

    function saveWorkouts() {
        const workouts = [];
        document.querySelectorAll('.timeline-item').forEach(item => {
            workouts.push({
                date: item.querySelector('.item-date').textContent,
                name: item.querySelector('.item-title').textContent,
                stats: item.querySelector('.item-stats').textContent
            });
        });
        localStorage.setItem('kintore-workouts-v2', JSON.stringify(workouts));
    }

    function loadWorkouts() {
        const saved = localStorage.getItem('kintore-workouts-v2');
        if (saved) {
            const workouts = JSON.parse(saved);
            workouts.reverse().forEach(w => {
                const li = document.createElement('li');
                li.className = 'timeline-item';
                li.innerHTML = `
                    <div class="item-content">
                        <div class="item-date">${w.date}</div>
                        <div class="item-title">${w.name}</div>
                        <div class="item-stats">${w.stats}</div>
                    </div>
                `;
                workoutList.prepend(li);
            });
        }
    }

    // Initialize
    loadUserInfo();
    loadWorkouts();
});
