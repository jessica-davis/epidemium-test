/* ============================================================
   App Initialization — Data Loading & Setup
   ============================================================ */

let chartData = null;
let bpObservedValue = null;

async function loadData() {
    try {
        const [forecastRaw, surveillanceRaw, baselineRaw, forecastH0Raw, targetH0Raw] = await Promise.all([
            d3.csv(FORECAST_URL),
            d3.csv(SURVEILLANCE_URL),
            d3.csv(BASELINE_URL),
            d3.csv(FORECAST_H0_URL),
            d3.csv(TARGET_H0_URL)
        ]);

        // Process forecast data
        const forecastByDate = d3.group(forecastRaw, d => d.target_end_date);
        const forecastData = Array.from(forecastByDate, ([date, rows]) => {
            const q = {};
            rows.forEach(r => {
                if (r.output_type === 'quantile') q[r.output_type_id] = +r.value;
            });
            return {
                date: new Date(date),
                q025: q['0.025'], q100: q['0.1'], q250: q['0.25'],
                q500: q['0.5'], q750: q['0.75'], q900: q['0.9'], q975: q['0.975'],
                allQ: q
            };
        }).sort((a, b) => a.date - b.date);

        // Process surveillance data
        const byDate = d3.rollup(
            surveillanceRaw,
            v => d3.max(v, d => +d.observation || 0),
            d => d.target_end_date
        );
        const surveillanceData = Array.from(byDate, ([date, value]) => ({
            date: new Date(date),
            value: value
        })).sort((a, b) => a.date - b.date);

        // Process baseline data
        const baselineUS = baselineRaw.filter(r => r.location === 'US' && r.output_type === 'quantile' && r.horizon !== '-1');
        const baselineByDate = d3.group(baselineUS, d => d.target_end_date);
        const baselineData = Array.from(baselineByDate, ([date, rows]) => {
            const q = {};
            rows.forEach(r => { q[r.output_type_id] = +r.value; });
            return {
                date: new Date(date),
                q025: q['0.025'], q100: q['0.1'], q250: q['0.25'],
                q500: q['0.5'], q750: q['0.75'], q900: q['0.9'], q975: q['0.975'],
                allQ: q
            };
        }).sort((a, b) => a.date - b.date);

        // Process horizon-0 forecast data
        const h0ByDate = d3.group(forecastH0Raw, d => d.target_end_date);
        const forecastH0Data = Array.from(h0ByDate, ([date, rows]) => {
            const q = {};
            rows.forEach(r => {
                if (r.output_type === 'quantile') q[r.output_type_id] = +r.value;
            });
            return {
                date: new Date(date),
                q025: q['0.025'], q050: q['0.05'], q100: q['0.1'], q250: q['0.25'],
                q500: q['0.5'], q750: q['0.75'], q900: q['0.9'], q950: q['0.95'], q975: q['0.975'],
                allQ: q
            };
        }).sort((a, b) => a.date - b.date);

        // Process horizon-0 surveillance data
        const h0ByDateRoll = d3.rollup(
            targetH0Raw,
            v => d3.max(v, d => +d.observation || 0),
            d => d.target_end_date
        );
        const targetH0Data = Array.from(h0ByDateRoll, ([date, value]) => ({
            date: new Date(date),
            value: value
        })).sort((a, b) => a.date - b.date);

        chartData = { forecast: forecastData, surveillance: surveillanceData, baseline: baselineData, forecastH0: forecastH0Data, targetH0: targetH0Data };

        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';

        drawChart([95, 80, 50]);
        setupControls();
        setupNavigation();
        bpObservedValue = SYNTH_DATA[2].observed;
        setupBoxplotControls();
        setupWISBoxControls();
        setupCoverageControls();
        setupBrierControls();
        setupBinnedControls();
        setupLogScoreControls();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = `Error: ${error.message}`;
    }
}

// --- Init ---
loadData();
