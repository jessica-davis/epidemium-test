/* ============================================================
   Charts: Brier Score (Multi-Category)
   ============================================================ */

// Categories in display order (top-to-bottom for bar charts)
const BRIER_CATEGORIES = ['Large Increase', 'Increase', 'Stable', 'Decrease', 'Large Decrease'];

const BRIER_CAT_COLORS = {
    'Large Increase': '#E8A56D', 'Increase': '#EFDA86', 'Stable': '#D1E5B7',
    'Decrease': '#9CD3B4', 'Large Decrease': '#75BFBD'
};

// Example PMF for the explorer (same forecast shown in Categorical Forecasts section)
const BRIER_EXAMPLE_PMF = {
    'Large Increase': 0.08, 'Increase': 0.52, 'Stable': 0.28,
    'Decrease': 0.09, 'Large Decrease': 0.03
};

// 12-week season data — rate trend forecasts
const BRIER_DATA = [
    { week: 'Oct 5',  pmf: { 'Large Decrease': 0.02, 'Decrease': 0.05, 'Stable': 0.10, 'Increase': 0.60, 'Large Increase': 0.23 }, observed: 'Increase' },
    { week: 'Oct 12', pmf: { 'Large Decrease': 0.01, 'Decrease': 0.03, 'Stable': 0.08, 'Increase': 0.28, 'Large Increase': 0.60 }, observed: 'Large Increase' },
    { week: 'Oct 19', pmf: { 'Large Decrease': 0.01, 'Decrease': 0.02, 'Stable': 0.05, 'Increase': 0.32, 'Large Increase': 0.60 }, observed: 'Large Increase' },
    { week: 'Oct 26', pmf: { 'Large Decrease': 0.02, 'Decrease': 0.03, 'Stable': 0.10, 'Increase': 0.60, 'Large Increase': 0.25 }, observed: 'Increase' },
    { week: 'Nov 2',  pmf: { 'Large Decrease': 0.03, 'Decrease': 0.08, 'Stable': 0.42, 'Increase': 0.32, 'Large Increase': 0.15 }, observed: 'Stable' },
    { week: 'Nov 9',  pmf: { 'Large Decrease': 0.03, 'Decrease': 0.12, 'Stable': 0.40, 'Increase': 0.30, 'Large Increase': 0.15 }, observed: 'Increase' },
    { week: 'Nov 16', pmf: { 'Large Decrease': 0.05, 'Decrease': 0.22, 'Stable': 0.45, 'Increase': 0.20, 'Large Increase': 0.08 }, observed: 'Stable' },
    { week: 'Nov 23', pmf: { 'Large Decrease': 0.08, 'Decrease': 0.50, 'Stable': 0.25, 'Increase': 0.12, 'Large Increase': 0.05 }, observed: 'Decrease' },
    { week: 'Nov 30', pmf: { 'Large Decrease': 0.12, 'Decrease': 0.55, 'Stable': 0.20, 'Increase': 0.10, 'Large Increase': 0.03 }, observed: 'Decrease' },
    { week: 'Dec 7',  pmf: { 'Large Decrease': 0.58, 'Decrease': 0.25, 'Stable': 0.10, 'Increase': 0.05, 'Large Increase': 0.02 }, observed: 'Large Decrease' },
    { week: 'Dec 14', pmf: { 'Large Decrease': 0.10, 'Decrease': 0.38, 'Stable': 0.30, 'Increase': 0.15, 'Large Increase': 0.07 }, observed: 'Increase' },
    { week: 'Dec 21', pmf: { 'Large Decrease': 0.18, 'Decrease': 0.55, 'Stable': 0.18, 'Increase': 0.06, 'Large Increase': 0.03 }, observed: 'Decrease' },
];

// Uniform baseline (maximum uncertainty across 5 categories)
const BRIER_BASELINE_PMF = {
    'Large Decrease': 0.20, 'Decrease': 0.20, 'Stable': 0.20,
    'Increase': 0.20, 'Large Increase': 0.20
};

// --- State ---
let brierObservedCat = 'Increase';

// --- Scoring ---
function computeMultiBrier(pmf, observed) {
    let bs = 0;
    BRIER_CATEGORIES.forEach(cat => {
        const o = cat === observed ? 1 : 0;
        const diff = pmf[cat] - o;
        bs += diff * diff;
    });
    return bs;
}

// --- Part 1: Interactive Explorer ---
function drawBrierExplorer() {
    d3.select('#brier-explorer').selectAll('*').remove();

    const container = document.getElementById('brier-explorer');
    const margin = { top: 8, right: 60, bottom: 10, left: 140 };
    const width = container.clientWidth - margin.left - margin.right;
    const barHeight = 34;
    const gap = 10;
    const height = BRIER_CATEGORIES.length * (barHeight + gap) - gap;

    const svgEl = d3.select('#brier-explorer')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    BRIER_CATEGORIES.forEach((cat, i) => {
        const y = i * (barHeight + gap);
        const prob = BRIER_EXAMPLE_PMF[cat];
        const barW = Math.max(xScale(prob), 2);
        const isObserved = cat === brierObservedCat;

        // Bar
        const fillColor = BRIER_CAT_COLORS[cat];
        const strokeColor = isObserved ? '#1C2442' : fillColor;
        const strokeW = isObserved ? 2.5 : 0.5;

        svg.node().appendChild(rc.rectangle(0, y, barW, barHeight, {
            fill: fillColor, fillStyle: 'solid',
            stroke: strokeColor, strokeWidth: strokeW,
            roughness: 1.2, seed: 8000 + i
        }));

        // Observed indicator (triangle)
        if (isObserved) {
            svg.append('text')
                .attr('x', -120).attr('y', y + barHeight / 2 + 5)
                .style('font-size', '14px').style('fill', '#1C2442').style('font-weight', '700')
                .text('\u25B6');
        }

        // Category label
        svg.append('text').attr('class', 'tick-label')
            .attr('x', isObserved ? -106 : -8)
            .attr('y', y + barHeight / 2 + 4)
            .attr('text-anchor', isObserved ? 'start' : 'end')
            .style('font-size', '14px')
            .style('font-weight', isObserved ? '700' : '400')
            .text(cat.toUpperCase());

        // Percentage label (right of bar)
        svg.append('text').attr('class', 'tick-label')
            .attr('x', barW + 8).attr('y', y + barHeight / 2 + 4)
            .style('font-size', '15px').style('font-weight', '600')
            .text(Math.round(prob * 100) + '%');
    });

    updateBrierCalcDisplay();
}

function updateBrierCalcDisplay() {
    const el = document.getElementById('brier-calc-display');
    if (!el) return;

    const bs = computeMultiBrier(BRIER_EXAMPLE_PMF, brierObservedCat);

    // Build per-category breakdown
    const rows = BRIER_CATEGORIES.map(cat => {
        const p = BRIER_EXAMPLE_PMF[cat];
        const o = cat === brierObservedCat ? 1 : 0;
        const val = (p - o) * (p - o);
        const isObs = cat === brierObservedCat;
        const color = isObs ? '#1C2442' : '#888';
        const weight = isObs ? 'font-weight:700;' : '';
        return `<span style="color:${color}; ${weight}">(${p.toFixed(2)}&minus;${o})&sup2;</span>`;
    });

    el.innerHTML = `
        <div style="background:#f8f8f8; padding:14px 18px; border-radius:6px; margin-top:12px;">
            <div style="font-family:'Just Another Hand', cursive; font-size:1.2rem; color:#1C2442; line-height:1.6;">
                BS = ${rows.join(' + ')}
            </div>
            <div style="font-family:'Just Another Hand', cursive; font-size:1.5rem; color:#1C2442; margin-top:2px;">
                &nbsp;&nbsp;&nbsp;&nbsp;= <strong>${bs.toFixed(3)}</strong>
            </div>
        </div>`;
}

// --- Part 2: Season-Long Evaluation ---
function drawSeasonBrierChart() {
    d3.select('#brier-season-chart').selectAll('*').remove();

    const container = document.getElementById('brier-season-chart');
    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    const svgEl = d3.select('#brier-season-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const xScale = d3.scaleBand().domain(BRIER_DATA.map(d => d.week)).range([0, width]).padding(0.25);
    const yScale = d3.scaleLinear().domain([0, 1.1]).range([height, 0]);

    // Axes
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 8200 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 8201 }));

    // X-axis labels
    BRIER_DATA.forEach((d, i) => {
        const x = xScale(d.week) + xScale.bandwidth() / 2;
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 18)
            .attr('text-anchor', 'middle').style('font-size', '11px')
            .attr('transform', `rotate(-35, ${x}, ${height + 18})`)
            .text(d.week.toUpperCase());
    });

    // Y-axis ticks
    [0, 0.25, 0.50, 0.75, 1.0].forEach((tick, i) => {
        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 8220 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(tick.toFixed(2));
    });

    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -45).attr('x', -height / 2).attr('text-anchor', 'middle').text('BRIER SCORE');

    // Baseline reference line (uniform PMF → BS = 0.80)
    const baselineBS = computeMultiBrier(BRIER_BASELINE_PMF, 'Increase'); // 0.80 for any outcome
    svg.node().appendChild(rc.line(0, yScale(baselineBS), width, yScale(baselineBS), {
        stroke: '#bbb', strokeWidth: 1.5, roughness: 0.6, strokeLineDash: [6, 4], seed: 8250
    }));
    svg.append('text')
        .attr('x', width - 4).attr('y', yScale(baselineBS) - 6)
        .attr('text-anchor', 'end')
        .style('font-family', "'Just Another Hand', cursive")
        .style('font-size', '14px').style('fill', '#999')
        .text('BASELINE (UNIFORM)');

    // Draw bars
    BRIER_DATA.forEach((d, i) => {
        const bs = computeMultiBrier(d.pmf, d.observed);
        const barColor = bs < 0.50 ? '#79CAC4' : '#E8A56D';
        const x = xScale(d.week);
        const barTop = yScale(bs);
        const barH = height - barTop;

        svg.node().appendChild(rc.rectangle(x, barTop, xScale.bandwidth(), barH, {
            fill: barColor, fillStyle: 'solid', stroke: barColor, strokeWidth: 0.5,
            roughness: 1.2, seed: 8300 + i
        }));

        // Observed category dot above bar
        const dotY = barTop - 14;
        const dotColor = BRIER_CAT_COLORS[d.observed];
        svg.node().appendChild(rc.circle(x + xScale.bandwidth() / 2, dotY, 10, {
            fill: dotColor, fillStyle: 'solid', stroke: '#1C2442', strokeWidth: 1,
            roughness: 0.8, seed: 8350 + i
        }));

        // BS value label
        if (barH > 25) {
            svg.append('text').attr('class', 'tick-label')
                .attr('x', x + xScale.bandwidth() / 2).attr('y', barTop + 16)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px').style('fill', 'white')
                .text(bs.toFixed(2));
        }
    });

    // Legend
    const lg = svg.append('g').attr('transform', `translate(${width - 190}, 0)`);
    lg.node().appendChild(rc.rectangle(0, 0, 14, 10, { fill: '#79CAC4', fillStyle: 'solid', stroke: 'none', roughness: 0.8, seed: 8400 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 20).attr('y', 10).text('BS < 0.50');
    lg.node().appendChild(rc.rectangle(0, 16, 14, 10, { fill: '#E8A56D', fillStyle: 'solid', stroke: 'none', roughness: 0.8, seed: 8401 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 20).attr('y', 26).text('BS \u2265 0.50');

    // Category dot legend
    lg.append('text').attr('class', 'legend-text').attr('x', 0).attr('y', 44).style('font-weight', '600').text('OBSERVED:');
    const observedCats = [...new Set(BRIER_DATA.map(d => d.observed))];
    // Show in standard order
    let dotY = 54;
    BRIER_CATEGORIES.forEach((cat, ci) => {
        if (!observedCats.includes(cat)) return;
        lg.node().appendChild(rc.circle(7, dotY + 2, 8, {
            fill: BRIER_CAT_COLORS[cat], fillStyle: 'solid', stroke: '#1C2442', strokeWidth: 1,
            roughness: 0.8, seed: 8410 + ci
        }));
        lg.append('text').attr('class', 'legend-text').attr('x', 16).attr('y', dotY + 6).text(cat.toUpperCase());
        dotY += 14;
    });

    updateBrierSeasonResults();
}

function updateBrierSeasonResults() {
    const el = document.getElementById('brier-season-results');
    if (!el) return;

    let modelSum = 0, baselineSum = 0;
    BRIER_DATA.forEach(d => {
        modelSum += computeMultiBrier(d.pmf, d.observed);
        baselineSum += computeMultiBrier(BRIER_BASELINE_PMF, d.observed);
    });
    const avgModel = modelSum / BRIER_DATA.length;
    const avgBaseline = baselineSum / BRIER_DATA.length;
    const pctBetter = Math.round((1 - avgModel / avgBaseline) * 100);

    el.innerHTML = `
        <div style="background:#f8f8f8; padding:16px 20px; border-radius:6px; font-size:0.9rem; margin-top:16px;">
            <div style="display:flex; gap:30px; flex-wrap:wrap; align-items:center;">
                <div>
                    <span style="color:#1C2442; font-weight:600;">Model Avg BS:</span>
                    <span style="font-family:'Just Another Hand', cursive; font-size:1.6rem; margin-left:6px; color:#1C2442; font-weight:700;">${avgModel.toFixed(3)}</span>
                </div>
                <div>
                    <span style="color:#999; font-weight:600;">Baseline Avg BS:</span>
                    <span style="font-family:'Just Another Hand', cursive; font-size:1.6rem; margin-left:6px; color:#999;">${avgBaseline.toFixed(3)}</span>
                </div>
                <div>
                    <span style="font-family:'Just Another Hand', cursive; font-size:1.4rem; color:${avgModel < avgBaseline ? '#27ae60' : '#c0392b'}; font-weight:700;">
                        ${avgModel < avgBaseline ? pctBetter + '% better than baseline' : 'Worse than baseline'}
                    </span>
                </div>
            </div>
        </div>`;
}

// --- Controls ---
function setupBrierControls() {
    document.querySelectorAll('[data-brier-outcome]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-brier-outcome]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            brierObservedCat = btn.dataset.brierOutcome;
            drawBrierExplorer();
        });
    });
}
