/* ============================================================
   Charts: Brier Score (Multi-Category)
   ============================================================ */

// Categories in display order (top-to-bottom for explorer bars)
const BRIER_CATEGORIES = ['Large Increase', 'Increase', 'Stable', 'Decrease', 'Large Decrease'];

// Stack order for stacked bar chart (bottom-to-top)
const BRIER_STACK_ORDER = ['Large Decrease', 'Decrease', 'Stable', 'Increase', 'Large Increase'];

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

// --- Part 2: Season-Long Evaluation (two-panel chart) ---
function drawSeasonBrierChart() {
    d3.select('#brier-season-chart').selectAll('*').remove();

    const container = document.getElementById('brier-season-chart');
    const margin = { top: 10, right: 30, bottom: 55, left: 55 };
    const totalWidth = container.clientWidth;
    const width = totalWidth - margin.left - margin.right;

    // Panel dimensions
    const pmfHeight = 210;
    const gapH = 30;
    const bsHeight = 90;
    const totalHeight = margin.top + pmfHeight + gapH + bsHeight + margin.bottom;

    const svgEl = d3.select('#brier-season-chart')
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight);

    const rc = rough.svg(svgEl.node());

    // Shared x-scale
    const xScale = d3.scaleBand().domain(BRIER_DATA.map(d => d.week)).range([0, width]).padding(0.12);
    const bw = xScale.bandwidth();

    // ========== Top Panel: Stacked PMF Bars ==========
    const pmfG = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const yPMF = d3.scaleLinear().domain([0, 1]).range([pmfHeight, 0]);

    // Axes
    pmfG.node().appendChild(rc.line(0, pmfHeight, width, pmfHeight, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 8200 }));
    pmfG.node().appendChild(rc.line(0, 0, 0, pmfHeight, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 8201 }));

    // Y-axis ticks
    [0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((tick, i) => {
        const y = yPMF(tick);
        pmfG.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 8210 + i }));
        pmfG.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(Math.round(tick * 100) + '%');
    });

    pmfG.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -40).attr('x', -pmfHeight / 2).attr('text-anchor', 'middle').text('FORECAST PROBABILITY');

    // Draw stacked bars
    BRIER_DATA.forEach((d, i) => {
        let cumProb = 0;
        const x = xScale(d.week);

        BRIER_STACK_ORDER.forEach((cat, ci) => {
            const prob = d.pmf[cat];
            const y0 = cumProb;
            const y1 = cumProb + prob;
            cumProb = y1;

            const rectTop = yPMF(y1);
            const rectH = yPMF(y0) - yPMF(y1);

            if (rectH > 0.5) {
                const isObserved = cat === d.observed;
                pmfG.node().appendChild(rc.rectangle(x, rectTop, bw, rectH, {
                    fill: BRIER_CAT_COLORS[cat], fillStyle: 'solid',
                    stroke: isObserved ? '#1C2442' : 'rgba(255,255,255,0.6)',
                    strokeWidth: isObserved ? 2 : 0.5,
                    roughness: 0.7, seed: 8300 + i * 10 + ci
                }));
            }
        });

        // Observed marker: white dot at center of observed segment
        let obsCumBottom = 0;
        for (const cat of BRIER_STACK_ORDER) {
            if (cat === d.observed) break;
            obsCumBottom += d.pmf[cat];
        }
        const obsMid = obsCumBottom + d.pmf[d.observed] / 2;

        pmfG.node().appendChild(rc.circle(x + bw / 2, yPMF(obsMid), 9, {
            fill: 'white', fillStyle: 'solid',
            stroke: '#1C2442', strokeWidth: 2,
            roughness: 0.8, seed: 8500 + i
        }));
    });

    // Category legend (top-right of PMF panel)
    const lg = pmfG.append('g').attr('transform', `translate(${width - 135}, 6)`);
    // Reverse stack order so legend reads top-to-bottom matching visual
    BRIER_STACK_ORDER.slice().reverse().forEach((cat, i) => {
        lg.node().appendChild(rc.rectangle(0, i * 14, 12, 10, {
            fill: BRIER_CAT_COLORS[cat], fillStyle: 'solid', stroke: 'none', roughness: 0.8, seed: 8800 + i
        }));
        lg.append('text').attr('class', 'legend-text').attr('x', 18).attr('y', i * 14 + 9)
            .style('font-size', '10px').text(cat.toUpperCase());
    });

    const obsLegY = BRIER_STACK_ORDER.length * 14 + 4;
    lg.node().appendChild(rc.circle(6, obsLegY + 3, 8, {
        fill: 'white', fillStyle: 'solid', stroke: '#1C2442', strokeWidth: 2, roughness: 0.8, seed: 8810
    }));
    lg.append('text').attr('class', 'legend-text').attr('x', 18).attr('y', obsLegY + 7)
        .style('font-size', '10px').text('OBSERVED');

    // ========== Bottom Panel: BS Score Bars ==========
    const bsG = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top + pmfHeight + gapH})`);

    const yBS = d3.scaleLinear().domain([0, 1.05]).range([bsHeight, 0]);

    // Axes
    bsG.node().appendChild(rc.line(0, bsHeight, width, bsHeight, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 8600 }));
    bsG.node().appendChild(rc.line(0, 0, 0, bsHeight, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 8601 }));

    // Y-axis ticks
    [0, 0.5, 1.0].forEach((tick, i) => {
        const y = yBS(tick);
        bsG.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 8610 + i }));
        bsG.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(tick.toFixed(1));
    });

    bsG.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -40).attr('x', -bsHeight / 2).attr('text-anchor', 'middle').text('BRIER SCORE');

    // Baseline reference line (uniform PMF → BS = 0.80)
    const baselineBS = 0.80;
    bsG.node().appendChild(rc.line(0, yBS(baselineBS), width, yBS(baselineBS), {
        stroke: '#bbb', strokeWidth: 1.5, roughness: 0.6, strokeLineDash: [6, 4], seed: 8650
    }));
    bsG.append('text')
        .attr('x', width - 4).attr('y', yBS(baselineBS) - 5)
        .attr('text-anchor', 'end')
        .style('font-family', "'Just Another Hand', cursive")
        .style('font-size', '12px').style('fill', '#999')
        .text('BASELINE');

    // BS score bars
    BRIER_DATA.forEach((d, i) => {
        const bs = computeMultiBrier(d.pmf, d.observed);
        const barColor = bs < 0.50 ? '#79CAC4' : '#E8A56D';
        const x = xScale(d.week);
        const barTop = yBS(Math.min(bs, 1.05));
        const barH = bsHeight - barTop;

        bsG.node().appendChild(rc.rectangle(x, barTop, bw, barH, {
            fill: barColor, fillStyle: 'solid', stroke: barColor, strokeWidth: 0.5,
            roughness: 1.0, seed: 8700 + i
        }));
    });

    // BS legend (inline in bottom panel)
    const lg2 = bsG.append('g').attr('transform', `translate(${width - 120}, 2)`);
    lg2.node().appendChild(rc.rectangle(0, 0, 10, 8, { fill: '#79CAC4', fillStyle: 'solid', stroke: 'none', roughness: 0.8, seed: 8900 }));
    lg2.append('text').attr('class', 'legend-text').attr('x', 14).attr('y', 8).style('font-size', '10px').text('BS < 0.50');
    lg2.node().appendChild(rc.rectangle(0, 13, 10, 8, { fill: '#E8A56D', fillStyle: 'solid', stroke: 'none', roughness: 0.8, seed: 8901 }));
    lg2.append('text').attr('class', 'legend-text').attr('x', 14).attr('y', 21).style('font-size', '10px').text('BS \u2265 0.50');

    // ========== Shared X-axis Labels ==========
    const labelG = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top + pmfHeight + gapH + bsHeight})`);

    BRIER_DATA.forEach((d, i) => {
        const x = xScale(d.week) + bw / 2;
        labelG.append('text').attr('class', 'tick-label').attr('x', x).attr('y', 16)
            .attr('text-anchor', 'middle').style('font-size', '11px')
            .attr('transform', `rotate(-35, ${x}, 16)`)
            .text(d.week.toUpperCase());
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
