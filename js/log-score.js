/* ============================================================
   Charts: Log Score
   ============================================================ */

// 12-week season data: forecast mean, sd, and observed value
const LOG_SCORE_DATA = [
    { week: 'Oct 5',  mean: 340,  sd: 60,  observed: 375 },
    { week: 'Oct 12', mean: 480,  sd: 75,  observed: 510 },
    { week: 'Oct 19', mean: 620,  sd: 90,  observed: 590 },
    { week: 'Oct 26', mean: 850,  sd: 110, observed: 920 },
    { week: 'Nov 2',  mean: 1100, sd: 140, observed: 1050 },
    { week: 'Nov 9',  mean: 1350, sd: 160, observed: 1280 },
    { week: 'Nov 16', mean: 1500, sd: 170, observed: 1620 },
    { week: 'Nov 23', mean: 1400, sd: 180, observed: 1350 },
    { week: 'Nov 30', mean: 1200, sd: 150, observed: 1250 },
    { week: 'Dec 7',  mean: 900,  sd: 120, observed: 850 },
    { week: 'Dec 14', mean: 650,  sd: 95,  observed: 700 },
    { week: 'Dec 21', mean: 500,  sd: 80,  observed: 480 },
];

const LOG_SCORE_DOMAIN = [0, 2200];
const LOG_SCORE_DEFAULT_BIN_WIDTH = 50;

// Explorer uses a single forecast
const LOG_SCORE_EXAMPLE = { mean: 500, sd: 80 };
const LOG_SCORE_EXAMPLE_DOMAIN = [200, 800];

// --- State ---
let logScoreBinWidth = LOG_SCORE_DEFAULT_BIN_WIDTH;
let logScoreObserved = 540;

// --- Scoring ---
function computeLogScore(mean, sd, observed, binWidth, domain) {
    const bins = computeBins(mean, sd, domain, binWidth);
    const bin = bins.find(b => observed >= b.lower && observed < b.upper);
    // Handle edge: if observed == domain upper, use last bin
    const effectiveBin = bin || bins[bins.length - 1];
    const pk = Math.max(effectiveBin.prob, 1e-12);
    const logScore = -Math.log2(pk);
    return { pk, logScore, binLower: effectiveBin.lower, binUpper: effectiveBin.upper };
}

// --- Part 1: Interactive Explorer ---
function drawLogScoreExplorer() {
    d3.select('#log-score-explorer').selectAll('*').remove();

    const container = document.getElementById('log-score-explorer');
    if (!container) return;
    const margin = { top: 20, right: 30, bottom: 45, left: 55 };
    const totalWidth = container.clientWidth;
    const width = totalWidth - margin.left - margin.right;
    const height = 260;

    const svgEl = d3.select('#log-score-explorer')
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const { mean, sd } = LOG_SCORE_EXAMPLE;
    const [domLo, domHi] = LOG_SCORE_EXAMPLE_DOMAIN;
    const bins = computeBins(mean, sd, LOG_SCORE_EXAMPLE_DOMAIN, logScoreBinWidth);
    const maxProb = d3.max(bins, d => d.prob);

    const xScale = d3.scaleLinear().domain([domLo, domHi]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, maxProb * 1.15]).range([height, 0]);

    // Axes
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9500 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9501 }));

    // X-axis ticks
    const xTicks = d3.range(domLo, domHi + 1, 100);
    xTicks.forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, height, x, height + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 9510 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 20).attr('text-anchor', 'middle').text(tick);
    });
    svg.append('text').attr('class', 'axis-label').attr('x', width / 2).attr('y', height + 40).attr('text-anchor', 'middle').text('WEEKLY HOSPITALIZATIONS');

    // Y-axis ticks
    const yTicks = yScale.ticks(5);
    yTicks.forEach((tick, i) => {
        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 9530 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(tick < 0.01 ? tick.toFixed(3) : tick.toFixed(2));
    });
    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -42).attr('x', -height / 2).attr('text-anchor', 'middle').text('PROBABILITY');

    // Find the observed bin
    const result = computeLogScore(mean, sd, logScoreObserved, logScoreBinWidth, LOG_SCORE_EXAMPLE_DOMAIN);

    // Histogram bars
    bins.forEach((bin, i) => {
        const x = xScale(bin.lower);
        const w = xScale(bin.upper) - xScale(bin.lower);
        const barTop = yScale(bin.prob);
        const barH = height - barTop;
        const isObsBin = bin.lower === result.binLower;

        if (barH > 0.5) {
            svg.node().appendChild(rc.rectangle(x, barTop, w, barH, {
                fill: isObsBin ? '#E8A56D' : '#B9E1D9',
                fillStyle: 'solid',
                stroke: isObsBin ? '#1C2442' : '#79CAC4',
                strokeWidth: isObsBin ? 2.5 : 1,
                roughness: 1.0, seed: 9600 + i
            }));
        }
    });

    // PDF overlay
    const pdfPoints = d3.range(domLo, domHi + 1, 1).map(x => ({
        x, y: normalPDF(x, mean, sd)
    }));
    const pdfLine = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y * logScoreBinWidth))
        .curve(d3.curveBasis);

    svg.append('path')
        .datum(pdfPoints)
        .attr('d', pdfLine)
        .attr('fill', 'none')
        .attr('stroke', '#1E9CC5')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.8);

    // Observed value marker (draggable)
    const obsX = xScale(logScoreObserved);
    svg.node().appendChild(rc.circle(obsX, height, 14, {
        fill: '#1C2442', fillStyle: 'solid', stroke: '#1C2442', strokeWidth: 2,
        roughness: 0.8, seed: 9700
    }));

    // Dashed vertical line from observed to top of highlighted bin
    const obsBin = bins.find(b => logScoreObserved >= b.lower && logScoreObserved < b.upper) || bins[bins.length - 1];
    svg.node().appendChild(rc.line(obsX, height - 7, obsX, yScale(obsBin.prob) + 4, {
        stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.4, strokeLineDash: [4, 3], seed: 9701
    }));

    // Drag behavior
    const drag = d3.drag()
        .on('drag', function (event) {
            const newX = Math.max(0, Math.min(width, event.x - margin.left));
            const newVal = Math.round(xScale.invert(newX));
            logScoreObserved = Math.max(domLo, Math.min(domHi, newVal));
            drawLogScoreExplorer();
        });

    svgEl.call(drag);

    // Update calculation display
    updateLogScoreCalcDisplay(result);
}

function updateLogScoreCalcDisplay(result) {
    const el = document.getElementById('log-score-calc-display');
    if (!el || !result) return;

    el.innerHTML = `
        <div style="background:#f8f8f8; padding:14px 18px; border-radius:6px; margin-top:12px;">
            <div style="font-family:'Just Another Hand', cursive; font-size:1.2rem; color:#1C2442; line-height:1.6;">
                Observed = ${logScoreObserved} falls in bin [${result.binLower}, ${result.binUpper})
            </div>
            <div style="font-family:'Just Another Hand', cursive; font-size:1.2rem; color:#1C2442; line-height:1.6;">
                p<sub>k</sub> = ${result.pk.toFixed(4)}
            </div>
            <div style="font-family:'Just Another Hand', cursive; font-size:1.5rem; color:#1C2442; margin-top:2px;">
                LS = &minus;log<sub>2</sub>(${result.pk.toFixed(4)}) = <strong>${result.logScore.toFixed(3)}</strong>
            </div>
        </div>`;
}

// --- Part 2: Bin Width Effect Chart ---
function drawBinWidthEffect() {
    d3.select('#log-score-bw-effect').selectAll('*').remove();

    const container = document.getElementById('log-score-bw-effect');
    if (!container) return;
    const margin = { top: 20, right: 30, bottom: 45, left: 55 };
    const totalWidth = container.clientWidth;
    const width = totalWidth - margin.left - margin.right;
    const height = 200;

    const svgEl = d3.select('#log-score-bw-effect')
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const { mean, sd } = LOG_SCORE_EXAMPLE;
    const bwRange = d3.range(10, 210, 5);
    const data = bwRange.map(bw => {
        const r = computeLogScore(mean, sd, logScoreObserved, bw, LOG_SCORE_EXAMPLE_DOMAIN);
        return { bw, ls: r.logScore };
    });

    const xScale = d3.scaleLinear().domain([10, 200]).range([0, width]);
    const yMax = d3.max(data, d => d.ls);
    const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([height, 0]);

    // Axes
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9800 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9801 }));

    // X-axis ticks
    [10, 25, 50, 100, 150, 200].forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, height, x, height + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 9810 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 20).attr('text-anchor', 'middle').text(tick);
    });
    svg.append('text').attr('class', 'axis-label').attr('x', width / 2).attr('y', height + 40).attr('text-anchor', 'middle').text('BIN WIDTH');

    // Y-axis ticks
    yScale.ticks(5).forEach((tick, i) => {
        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 9830 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(tick.toFixed(1));
    });
    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -42).attr('x', -height / 2).attr('text-anchor', 'middle').text('LOG SCORE');

    // Line (rough)
    const linePoints = data.map(d => [xScale(d.bw), yScale(d.ls)]);
    svg.node().appendChild(rc.curve(linePoints, {
        stroke: '#1E9CC5', strokeWidth: 2.5, roughness: 0.8, seed: 9850
    }));

    // Current bin width marker
    const currentResult = computeLogScore(mean, sd, logScoreObserved, logScoreBinWidth, LOG_SCORE_EXAMPLE_DOMAIN);
    const cx = xScale(logScoreBinWidth);
    const cy = yScale(currentResult.logScore);
    svg.node().appendChild(rc.circle(cx, cy, 12, {
        fill: '#E8A56D', fillStyle: 'solid', stroke: '#1C2442', strokeWidth: 2,
        roughness: 0.8, seed: 9860
    }));

    // Annotation
    svg.append('text')
        .attr('x', cx + 10).attr('y', cy - 10)
        .style('font-family', "'Just Another Hand', cursive")
        .style('font-size', '14px').style('fill', '#1C2442')
        .text(`Width=${logScoreBinWidth}, LS=${currentResult.logScore.toFixed(2)}`);
}

// --- Part 3: Season-Long Evaluation ---
function drawSeasonLogScoreChart() {
    d3.select('#log-score-season-chart').selectAll('*').remove();

    const container = document.getElementById('log-score-season-chart');
    if (!container) return;
    const margin = { top: 10, right: 30, bottom: 55, left: 55 };
    const totalWidth = container.clientWidth;
    const width = totalWidth - margin.left - margin.right;

    const barH = 130;
    const totalHeight = margin.top + barH + margin.bottom;

    const svgEl = d3.select('#log-score-season-chart')
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight);

    const rc = rough.svg(svgEl.node());

    const g = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Compute scores
    const scores = LOG_SCORE_DATA.map(d => {
        const r = computeLogScore(d.mean, d.sd, d.observed, logScoreBinWidth, LOG_SCORE_DOMAIN);
        return { ...d, ...r };
    });

    // Baseline: uniform distribution over the domain → each bin gets equal prob
    const nBaseBins = Math.ceil((LOG_SCORE_DOMAIN[1] - LOG_SCORE_DOMAIN[0]) / logScoreBinWidth);
    const baselinePk = 1 / nBaseBins;
    const baselineLS = -Math.log2(baselinePk);

    const xScale = d3.scaleBand().domain(scores.map(d => d.week)).range([0, width]).padding(0.12);
    const bw = xScale.bandwidth();

    const maxLS = Math.max(d3.max(scores, d => d.logScore), baselineLS) * 1.1;
    const yScale = d3.scaleLinear().domain([0, maxLS]).range([barH, 0]);

    // Axes
    g.node().appendChild(rc.line(0, barH, width, barH, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9900 }));
    g.node().appendChild(rc.line(0, 0, 0, barH, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9901 }));

    // Y-axis ticks
    yScale.ticks(4).forEach((tick, i) => {
        const y = yScale(tick);
        g.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 9910 + i }));
        g.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(tick.toFixed(1));
    });
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -40).attr('x', -barH / 2).attr('text-anchor', 'middle').text('LOG SCORE');

    // Baseline reference line
    g.node().appendChild(rc.line(0, yScale(baselineLS), width, yScale(baselineLS), {
        stroke: '#bbb', strokeWidth: 1.5, roughness: 0.6, strokeLineDash: [6, 4], seed: 9950
    }));
    g.append('text')
        .attr('x', width - 4).attr('y', yScale(baselineLS) - 5)
        .attr('text-anchor', 'end')
        .style('font-family', "'Just Another Hand', cursive")
        .style('font-size', '12px').style('fill', '#999')
        .text('BASELINE');

    // Score bars
    const lsThreshold = baselineLS * 0.6;
    scores.forEach((d, i) => {
        const x = xScale(d.week);
        const barTop = yScale(Math.min(d.logScore, maxLS));
        const h = barH - barTop;
        const barColor = d.logScore < lsThreshold ? '#79CAC4' : '#E8A56D';

        g.node().appendChild(rc.rectangle(x, barTop, bw, h, {
            fill: barColor, fillStyle: 'solid', stroke: barColor, strokeWidth: 0.5,
            roughness: 1.0, seed: 9960 + i
        }));
    });

    // X-axis labels
    scores.forEach((d, i) => {
        const x = xScale(d.week) + bw / 2;
        g.append('text').attr('class', 'tick-label').attr('x', x).attr('y', barH + 16)
            .attr('text-anchor', 'middle').style('font-size', '11px')
            .attr('transform', `rotate(-35, ${x}, ${barH + 16})`)
            .text(d.week.toUpperCase());
    });

    // Update results display
    updateSeasonLogScoreResults(scores, baselineLS);
}

function updateSeasonLogScoreResults(scores, baselineLS) {
    const el = document.getElementById('log-score-season-results');
    if (!el) return;

    const avgModel = d3.mean(scores, d => d.logScore);
    const pctBetter = Math.round((1 - avgModel / baselineLS) * 100);

    el.innerHTML = `
        <div style="background:#f8f8f8; padding:16px 20px; border-radius:6px; font-size:0.9rem; margin-top:16px;">
            <div style="display:flex; gap:30px; flex-wrap:wrap; align-items:center;">
                <div>
                    <span style="color:#1C2442; font-weight:600;">Model Avg LS:</span>
                    <span style="font-family:'Just Another Hand', cursive; font-size:1.6rem; margin-left:6px; color:#1C2442; font-weight:700;">${avgModel.toFixed(3)}</span>
                </div>
                <div>
                    <span style="color:#999; font-weight:600;">Baseline LS:</span>
                    <span style="font-family:'Just Another Hand', cursive; font-size:1.6rem; margin-left:6px; color:#999;">${baselineLS.toFixed(3)}</span>
                </div>
                <div>
                    <span style="font-family:'Just Another Hand', cursive; font-size:1.4rem; color:${avgModel < baselineLS ? '#27ae60' : '#c0392b'}; font-weight:700;">
                        ${avgModel < baselineLS ? pctBetter + '% better than baseline' : 'Worse than baseline'}
                    </span>
                </div>
            </div>
            <div style="margin-top:8px; font-size:0.82rem; color:#888;">Bin width: ${logScoreBinWidth} | Baseline: uniform over [${LOG_SCORE_DOMAIN[0]}, ${LOG_SCORE_DOMAIN[1]}]</div>
        </div>`;
}

// --- Controls ---
function setupLogScoreControls() {
    // Bin width slider
    const slider = document.getElementById('log-score-bw-slider');
    const valLabel = document.getElementById('log-score-bw-value');
    if (slider) {
        slider.addEventListener('input', () => {
            logScoreBinWidth = parseInt(slider.value);
            if (valLabel) valLabel.textContent = logScoreBinWidth;
            drawLogScoreExplorer();
            drawBinWidthEffect();
            drawSeasonLogScoreChart();
        });
    }
}
