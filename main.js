document.addEventListener('DOMContentLoaded', () => {
    const weightInput = document.getElementById('user-weight');
    const bpValue = document.getElementById('bp-weight');
    const sqValue = document.getElementById('sq-weight');
    const dlValue = document.getElementById('dl-weight');
    
    const workoutForm = document.getElementById('workout-form');
    const workoutList = document.getElementById('workout-list');

    // Load weight from localStorage
    const savedWeight = localStorage.getItem('kintore-weight');
    if (savedWeight) {
        weightInput.value = savedWeight;
        updateRecommendations(savedWeight);
    }

    // Weight input listener
    weightInput.addEventListener('input', (e) => {
        const weight = e.target.value;
        localStorage.setItem('kintore-weight', weight);
        updateRecommendations(weight);
    });

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

    // Workout Entry logic
    workoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('exercise-name').value;
        const weight = document.getElementById('workout-weight').value;
        const reps = document.getElementById('workout-reps').value;
        const date = new Date().toLocaleString('ko-KR', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit' 
        });

        addTimelineItem(name, weight, reps, date);
        
        // Clear form
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

    // Persist Workouts
    function saveWorkouts() {
        const workouts = [];
        document.querySelectorAll('.timeline-item').forEach(item => {
            workouts.push({
                date: item.querySelector('.item-date').textContent,
                name: item.querySelector('.item-title').textContent,
                stats: item.querySelector('.item-stats').textContent
            });
        });
        localStorage.setItem('kintore-workouts', JSON.stringify(workouts));
    }

    function loadWorkouts() {
        const saved = localStorage.getItem('kintore-workouts');
        if (saved) {
            const workouts = JSON.parse(saved);
            workouts.reverse().forEach(w => {
                const statsMatch = w.stats.match(/(\d+(\.\d+)?) kg × (\d+)회/);
                if (statsMatch) {
                    addTimelineItem(w.name, statsMatch[1], statsMatch[3], w.date);
                } else {
                    // Fallback for custom text
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
                }
            });
        }
    }

    loadWorkouts();
});
