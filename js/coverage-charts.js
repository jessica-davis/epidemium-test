/* ============================================================
   Charts: Coverage
   ============================================================ */

let coverageRevealed = false;
let activeCovPI = 50;

// All symmetric PI definitions from the 23 quantiles
const COV_PI_DEFS = [
    { level: 10,  lower: '0.45', upper: '0.55' },
    { level: 20,  lower: '0.4',  upper: '0.6'  },
    { level: 30,  lower: '0.35', upper: '0.65' },
    { level: 40,  lower: '0.3',  upper: '0.7'  },
    { level: 50,  lower: '0.25', upper: '0.75' },
    { level: 60,  lower: '0.2',  upper: '0.8'  },
    { level: 70,  lower: '0.15', upper: '0.85' },
    { level: 80,  lower: '0.1',  upper: '0.9'  },
    { level: 90,  lower: '0.05', upper: '0.95' },
    { level: 95,  lower: '0.025',upper: '0.975'},
    { level: 98,  lower: '0.01', upper: '0.99' },
];

function getCovPI(level) {
    return COV_PI_DEFS.find(p => p.level === level);
}

function getCovPIColor() {
    return COLORS.pi80;
}

function drawCoverageChart(piLevel, showCoverage) {
    const { forecastH0, targetH0 } = chartData;

    d3.select('#coverage-chart').selectAll('*').remove();

    const margin = {top: 20, right: 30, bottom: 50, left: 70};
    const container = document.getElementById('coverage-chart');
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svgEl = d3.select('#coverage-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const obsByDate = {};
    targetH0.forEach(d => { obsByDate[d.date.toISOString().slice(0, 10)] = d.value; });

    const matchedForecasts = forecastH0.filter(d => obsByDate[d.date.toISOString().slice(0, 10)] !== undefined);

    const pi = getCovPI(piLevel);
    const piColor = getCovPIColor();

    const allDates = [...targetH0.map(d => d.date), ...forecastH0.map(d => d.date)];
    const allValues = [
        ...targetH0.map(d => d.value),
        ...matchedForecasts.flatMap(d => [+d.allQ[pi.lower] || 0, +d.allQ[pi.upper] || 0])
    ];

    const xScale = d3.scaleTime().domain(d3.extent(allDates)).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, d3.max(allValues) * 1.15]).range([height, 0]);

    // Axes
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 6000 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 6001 }));

    xScale.ticks(8).forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, height, x, height + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 6010 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 20).attr('text-anchor', 'middle').text(d3.timeFormat('%b %d')(tick).toUpperCase());
    });

    yScale.ticks(6).forEach((tick, i) => {
        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 6020 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(d3.format(',')(tick));
    });

    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -55).attr('x', -height / 2).attr('text-anchor', 'middle').text('WEEKLY HOSPITALIZATIONS');
    svg.append('text').attr('class', 'axis-label').attr('x', width / 2).attr('y', height + 42).attr('text-anchor', 'middle').text('WEEK');

    // Band half-width
    const dateSpan = matchedForecasts.length > 1 ? xScale(matchedForecasts[1].date) - xScale(matchedForecasts[0].date) : 40;
    const bandHW = Math.min(dateSpan * 0.35, 20);

    // Covered / not-covered colors
    const coveredColor = '#79CAC4';
    const missedColor = '#E8A56D';

    // Draw PI boxes
    matchedForecasts.forEach((d, i) => {
        const dateKey = d.date.toISOString().slice(0, 10);
        const obs = obsByDate[dateKey];
        const lower = d.allQ[pi.lower];
        const upper = d.allQ[pi.upper];
        const cx = xScale(d.date);
        const top = yScale(upper);
        const bot = yScale(lower);

        let fillColor = piColor;
        let strokeColor = piColor;
        let fillStyle = 'solid';
        let opacity = 0.7;

        if (showCoverage && obs !== undefined) {
            const inside = obs >= lower && obs <= upper;
            fillColor = inside ? coveredColor : missedColor;
            strokeColor = inside ? '#5ABAB2' : '#D08A55';
            fillStyle = inside ? 'solid' : 'hachure';
            opacity = inside ? 0.8 : 0.9;
        }

        const rect = rc.rectangle(cx - bandHW, top, bandHW * 2, bot - top, {
            fill: fillColor, fillStyle: fillStyle,
            fillWeight: fillStyle === 'hachure' ? 2 : undefined,
            hachureGap: fillStyle === 'hachure' ? 5 : undefined,
            stroke: strokeColor, strokeWidth: 1,
            roughness: 1.2, seed: 6100 + i
        });
        rect.style.opacity = opacity;
        svg.node().appendChild(rect);
    });

    // Observed line + dots
    const obsLine = d3.line().x(d => xScale(d.date)).y(d => yScale(d.value));
    svg.node().appendChild(rc.path(obsLine(targetH0), {
        stroke: COLORS.observed, strokeWidth: 2, roughness: 1, fill: 'none', seed: 6600
    }));
    targetH0.forEach((d, i) => {
        svg.node().appendChild(rc.circle(xScale(d.date), yScale(d.value), 9, {
            fill: 'white', fillStyle: 'solid',
            stroke: COLORS.observed, strokeWidth: 2,
            roughness: 0.8, seed: 6610 + i
        }));
    });

    // Legend
    const lg = svg.append('g').attr('transform', `translate(${width - 180}, 10)`);
    lg.node().appendChild(rc.circle(8, 0, 8, { fill: 'white', fillStyle: 'solid', stroke: COLORS.observed, strokeWidth: 2, roughness: 0.8, seed: 6700 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 18).attr('y', 4).text('OBSERVED');
    lg.node().appendChild(rc.rectangle(0, 12, 16, 10, { fill: piColor, fillStyle: 'solid', stroke: piColor, roughness: 0.8, seed: 6701 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 22).attr('y', 22).text(piLevel + '% PI');

    if (showCoverage) {
        lg.node().appendChild(rc.rectangle(0, 30, 16, 10, { fill: coveredColor, fillStyle: 'solid', stroke: '#5ABAB2', roughness: 0.8, seed: 6702 }));
        lg.append('text').attr('class', 'legend-text').attr('x', 22).attr('y', 40).text('COVERED');
        lg.node().appendChild(rc.rectangle(0, 48, 16, 10, { fill: missedColor, fillStyle: 'hachure', fillWeight: 2, hachureGap: 4, stroke: '#D08A55', roughness: 0.8, seed: 6703 }));
        lg.append('text').attr('class', 'legend-text').attr('x', 22).attr('y', 58).text('NOT COVERED');
    }

    // Coverage results
    const resultsDiv = document.getElementById('coverage-results');
    if (showCoverage) {
        const stats = computeCoverageStats(forecastH0, obsByDate, pi);
        const pctRound = Math.round(stats.pct);
        resultsDiv.innerHTML = `
            <div style="background:#f8f8f8; padding:16px 20px; border-radius:6px; font-size:0.9rem;">
                <strong style="color:#1C2442;">${piLevel}% Prediction Interval Coverage:</strong>
                <span style="font-family:'Just Another Hand', cursive; font-size:1.6rem; margin-left:10px; vertical-align:middle; color:#1C2442;">
                    ${stats.covered} / ${stats.total} FORECASTS COVERED
                </span>
                <span style="font-family:'Just Another Hand', cursive; font-size:1.6rem; margin-left:6px; vertical-align:middle; color:#666;">&rArr;</span>
                <span style="font-family:'Just Another Hand', cursive; font-size:1.8rem; margin-left:6px; vertical-align:middle; font-weight:700; color:${pctRound >= piLevel ? '#5ABAB2' : '#D08A55'};">
                    ${pctRound}%
                </span>
                <span style="font-size:0.8rem; color:#888; margin-left:8px;">(target: ${piLevel}%)</span>
            </div>`;
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.style.display = 'none';
    }
}

// Coverage Curve Chart
function drawCoverageCurve() {
    const { forecastH0, targetH0 } = chartData;

    d3.select('#coverage-curve-chart').selectAll('*').remove();

    const obsByDate = {};
    targetH0.forEach(d => { obsByDate[d.date.toISOString().slice(0, 10)] = d.value; });

    // Compute coverage for each PI level
    const curveData = COV_PI_DEFS.map(pi => {
        const stats = computeCoverageStats(forecastH0, obsByDate, pi);
        return { nominal: pi.level, empirical: stats.pct };
    });

    const margin = {top: 30, right: 30, bottom: 55, left: 65};
    const container = document.getElementById('coverage-curve-chart');
    const width = container.clientWidth - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    const svgEl = d3.select('#coverage-curve-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    // Axes
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 7000 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 7001 }));

    [0, 20, 40, 60, 80, 100].forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, height, x, height + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 7010 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 20).attr('text-anchor', 'middle').text(tick + '%');

        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 7020 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(tick + '%');
    });

    svg.append('text').attr('class', 'axis-label').attr('x', width / 2).attr('y', height + 45).attr('text-anchor', 'middle').text('PREDICTION INTERVAL');
    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -50).attr('x', -height / 2).attr('text-anchor', 'middle').text('COVERAGE %');

    // Diagonal reference line (perfect calibration)
    svg.node().appendChild(rc.line(xScale(0), yScale(0), xScale(100), yScale(100), {
        stroke: '#999', strokeWidth: 2.5, roughness: 0.6, seed: 7050,
        strokeLineDash: [8, 6]
    }));

    // Region labels
    svg.append('text')
        .attr('x', xScale(70)).attr('y', yScale(85))
        .attr('text-anchor', 'middle')
        .style('font-family', "'Just Another Hand', cursive")
        .style('font-size', '18px')
        .style('fill', '#999')
        .text('UNDERCONFIDENT');

    svg.append('text')
        .attr('x', xScale(70)).attr('y', yScale(52))
        .attr('text-anchor', 'middle')
        .style('font-family', "'Just Another Hand', cursive")
        .style('font-size', '18px')
        .style('fill', '#999')
        .text('OVERCONFIDENT');

    // Draw the coverage curve
    const lineGen = d3.line().x(d => xScale(d.nominal)).y(d => yScale(d.empirical));
    svg.node().appendChild(rc.path(lineGen(curveData), {
        stroke: '#79CAC4', strokeWidth: 2.5, roughness: 1, fill: 'none', seed: 7100
    }));

    // Dots at each PI level
    curveData.forEach((d, i) => {
        svg.node().appendChild(rc.circle(xScale(d.nominal), yScale(d.empirical), 10, {
            fill: 'white', fillStyle: 'solid',
            stroke: '#1C2442', strokeWidth: 2,
            roughness: 0.8, seed: 7200 + i
        }));
    });

    // Legend — bottom right, below the diagonal
    const lg = svg.append('g').attr('transform', `translate(${width - 210}, ${height - 30})`);
    lg.node().appendChild(rc.line(0, 0, 20, 0, { stroke: '#79CAC4', strokeWidth: 2.5, roughness: 0.8, seed: 7300 }));
    lg.node().appendChild(rc.circle(10, 0, 8, { fill: 'white', fillStyle: 'solid', stroke: '#1C2442', strokeWidth: 2, roughness: 0.8, seed: 7301 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 26).attr('y', 4).text('EMPIRICAL COVERAGE');
    lg.node().appendChild(rc.line(0, 16, 20, 16, { stroke: '#999', strokeWidth: 2, roughness: 0.6, seed: 7302, strokeLineDash: [6, 4] }));
    lg.append('text').attr('class', 'legend-text').attr('x', 26).attr('y', 20).text('PERFECT CALIBRATION');
}

function setupCoverageControls() {
    // Radio-style PI buttons — only one active at a time
    document.querySelectorAll('[data-cov-interval]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-cov-interval]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCovPI = parseInt(btn.dataset.covInterval);
            coverageRevealed = false;
            document.getElementById('calc-coverage-btn').textContent = 'Calculate Coverage';
            drawCoverageChart(activeCovPI, false);
        });
    });

    // Calculate Coverage button
    document.getElementById('calc-coverage-btn').addEventListener('click', () => {
        coverageRevealed = !coverageRevealed;
        const btn = document.getElementById('calc-coverage-btn');
        btn.textContent = coverageRevealed ? 'Reset' : 'Calculate Coverage';
        drawCoverageChart(activeCovPI, coverageRevealed);
    });
}
