/* ============================================================
   Charts: WIS Box, Boxplot, WIS Decomposition, Relative WIS
   ============================================================ */

// --- WIS Box Chart (Section 1) ---
function drawBoxChart(enabledIntervals) {
    const { forecast, surveillance } = chartData;

    d3.select('#wis-box-chart').selectAll('*').remove();

    const margin = {top: 20, right: 30, bottom: 50, left: 70};
    const container = document.getElementById('wis-box-chart');
    const width = container.clientWidth - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    const svgEl = d3.select('#wis-box-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const allDates = [...surveillance.map(d => d.date), ...forecast.map(d => d.date)];
    const allValues = [
        ...surveillance.map(d => d.value),
        ...forecast.flatMap(d => [d.q025, d.q975])
    ];

    const xScale = d3.scaleTime().domain(d3.extent(allDates)).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, d3.max(allValues) * 1.1]).range([height, 0]);

    // Axes
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 1 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 2 }));

    xScale.ticks(6).forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, height, x, height + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 10 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 20).attr('text-anchor', 'middle').text(d3.timeFormat('%b %d')(tick).toUpperCase());
    });

    yScale.ticks(6).forEach((tick, i) => {
        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 20 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(d3.format(',')(tick));
    });

    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -55).attr('x', -height / 2).attr('text-anchor', 'middle').text('WEEKLY HOSPITALIZATIONS');
    svg.append('text').attr('class', 'axis-label').attr('x', width / 2).attr('y', height + 42).attr('text-anchor', 'middle').text('WEEK');

    // Band half-width
    const dateSpan = forecast.length > 1 ? xScale(forecast[1].date) - xScale(forecast[0].date) : 60;
    const bandHW = Math.min(dateSpan * 0.35, 28);

    // PI rectangles at each forecast date
    const pis = [
        {level: 95, lower: 'q025', upper: 'q975', color: COLORS.pi95, opacity: 0.6},
        {level: 80, lower: 'q100', upper: 'q900', color: COLORS.pi80, opacity: 0.7},
        {level: 50, lower: 'q250', upper: 'q750', color: COLORS.pi50, opacity: 0.8},
    ];

    pis.forEach(pi => {
        if (!enabledIntervals.includes(pi.level)) return;
        forecast.forEach((d, i) => {
            const cx = xScale(d.date);
            const top = yScale(d[pi.upper]);
            const bot = yScale(d[pi.lower]);
            const rect = rc.rectangle(cx - bandHW, top, bandHW * 2, bot - top, {
                fill: pi.color, fillStyle: 'solid', stroke: pi.color, strokeWidth: 1, roughness: 1.2, seed: pi.level * 100 + i
            });
            rect.style.opacity = pi.opacity;
            svg.node().appendChild(rect);
        });
    });

    // Median blue line — horizontal segment within each box only
    forecast.forEach((d, i) => {
        const cx = xScale(d.date);
        const my = yScale(d.q500);
        svg.node().appendChild(rc.line(cx - bandHW, my, cx + bandHW, my, {
            stroke: COLORS.forecast, strokeWidth: 2.5, roughness: 0.8, seed: 42 + i
        }));
    });

    // Out-of-sample dots (white fill, dark border) — noisy increasing trend
    const oosData = getOOSValues(surveillance, forecast);
    oosData.forEach((d, i) => {
        svg.node().appendChild(rc.circle(xScale(d.date), yScale(d.value), 10, {
            fill: 'white', fillStyle: 'solid', stroke: COLORS.observed, strokeWidth: 2, roughness: 0.8, seed: 500 + i
        }));
    });

    // Observed line + dots
    const obsLine = d3.line().x(d => xScale(d.date)).y(d => yScale(d.value));
    svg.node().appendChild(rc.path(obsLine(surveillance), {
        stroke: COLORS.observed, strokeWidth: 2, roughness: 1, fill: 'none', seed: 550
    }));
    surveillance.forEach((d, i) => {
        svg.node().appendChild(rc.circle(xScale(d.date), yScale(d.value), 10, {
            fill: COLORS.observed, fillStyle: 'solid', stroke: COLORS.observed, strokeWidth: 1, roughness: 1, seed: 560 + i
        }));
    });

    // Legend
    const lg = svg.append('g').attr('transform', `translate(${width - 200}, 10)`);
    lg.node().appendChild(rc.circle(8, 0, 8, { fill: COLORS.observed, fillStyle: 'solid', stroke: COLORS.observed, roughness: 0.8, seed: 570 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 18).attr('y', 4).text('OBSERVED');
    lg.node().appendChild(rc.circle(8, 18, 8, { fill: 'white', fillStyle: 'solid', stroke: COLORS.observed, strokeWidth: 2, roughness: 0.8, seed: 571 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 18).attr('y', 22).text('OUT-OF-SAMPLE');
    lg.node().appendChild(rc.line(0, 36, 16, 36, { stroke: COLORS.forecast, strokeWidth: 2.5, roughness: 0.8, seed: 572 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 22).attr('y', 40).text('FORECAST MEDIAN');
}

function setupWISBoxControls() {
    document.querySelectorAll('.toggle-btn[data-wis-box-interval]').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const enabled = Array.from(document.querySelectorAll('.toggle-btn.active[data-wis-box-interval]'))
                .map(b => parseInt(b.dataset.wisBoxInterval));
            drawBoxChart(enabled);
        });
    });
}

// --- Boxplot (Section 2) ---
function getBPEnabledPIs() {
    return Array.from(document.querySelectorAll('.toggle-btn.active[data-bp-interval]'))
        .map(b => parseInt(b.dataset.bpInterval));
}

function getBPWidth() {
    return parseFloat(document.getElementById('bp-width-slider').value);
}

function redrawBoxplot() {
    drawBoxplot(bpObservedValue, getBPWidth(), getBPEnabledPIs());
}

function renderObservedDot(svg, rc, xScale, obsVal, centerY, allQ, enabledPIs) {
    svg.selectAll('.obs-group').remove();

    const obsG = svg.select('.drag-overlay').empty()
        ? svg.append('g').attr('class', 'obs-group')
        : svg.insert('g', '.drag-overlay').attr('class', 'obs-group');

    const obsX = xScale(obsVal);

    obsG.node().appendChild(rc.line(obsX, centerY - 45, obsX, centerY + 45, {
        stroke: COLORS.observed, strokeWidth: 1, roughness: 0.6, strokeLineDash: [4, 4], seed: 461
    }));

    obsG.node().appendChild(rc.circle(obsX, centerY, 14, {
        fill: COLORS.observed, fillStyle: 'solid', stroke: '#fff', strokeWidth: 2, roughness: 1, seed: 460
    }));

    obsG.append('text').attr('class', 'tick-label')
        .attr('x', obsX).attr('y', centerY - 50)
        .attr('text-anchor', 'middle')
        .style('font-weight', '700').style('font-size', '13px')
        .text('OBSERVED: ' + d3.format(',')(Math.round(obsVal)));

    updateBPCoverage(allQ, obsVal, enabledPIs);
    const activePairs = enabledPIs.flatMap(level => PI_TO_PAIRS[level] || []);
    const wis = computeWIS(allQ, obsVal, activePairs.length > 0 ? activePairs : WIS_PAIRS);
    document.getElementById('wis-model-val').textContent = Math.round(wis.total).toLocaleString();
    drawWISDecomp(wis);
}

function drawBoxplot(obsVal, widthFactor, enabledPIs) {
    const d = SYNTH_DATA[2];
    const sigma = d.observed * 0.12 * widthFactor;
    const allQ = generateQuantiles(d.modelMedian, sigma);

    d3.select('#boxplot').selectAll('*').remove();

    const container = document.getElementById('boxplot');
    const margin = {top: 30, right: 30, bottom: 40, left: 20};
    const W = container.clientWidth - margin.left - margin.right;
    const H = 130;

    const svgEl = d3.select('#boxplot')
        .append('svg')
        .attr('width', W + margin.left + margin.right)
        .attr('height', H + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const maxQ = d.modelMedian + 1.96 * d.observed * 0.12 * 3.0;
    const minQ = Math.max(0, d.modelMedian - 1.96 * d.observed * 0.12 * 3.0);
    const xScale = d3.scaleLinear().domain([minQ * 0.8, maxQ * 1.1]).range([0, W]);

    // Axis
    svg.node().appendChild(rc.line(0, H, W, H, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 300 }));

    xScale.ticks(8).forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, H, x, H + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 310 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', H + 20).attr('text-anchor', 'middle').text(d3.format(',')(tick));
    });

    svg.append('text').attr('class', 'axis-label').attr('x', W / 2).attr('y', H + 38).attr('text-anchor', 'middle').text('WEEKLY HOSPITALIZATIONS');

    const piDefs = [
        { level: 95, lower: '0.025', upper: '0.975', color: COLORS.pi95, barH: 60 },
        { level: 80, lower: '0.1',   upper: '0.9',   color: COLORS.pi80, barH: 40 },
        { level: 50, lower: '0.25',  upper: '0.75',  color: COLORS.pi50, barH: 22 },
    ];

    const centerY = H / 2;

    // Draw PI bars (widest first)
    piDefs.forEach((pi, i) => {
        if (!enabledPIs.includes(pi.level)) return;
        const x1 = xScale(allQ[pi.lower]);
        const x2 = xScale(allQ[pi.upper]);
        const y = centerY - pi.barH / 2;
        svg.node().appendChild(rc.rectangle(x1, y, x2 - x1, pi.barH, {
            fill: pi.color, fillStyle: 'solid', stroke: pi.color, strokeWidth: 1.5, roughness: 1.2, seed: 400 + i
        }));
        svg.append('text').attr('class', 'legend-text')
            .attr('x', (x1 + x2) / 2).attr('y', centerY - pi.barH / 2 - 4)
            .attr('text-anchor', 'middle').style('font-size', '11px')
            .text(pi.level + '% PI')
            .style('text-transform', 'uppercase');
    });

    // Median line — drawn AFTER PI bars so it renders on top
    const maxBarH = piDefs.filter(p => enabledPIs.includes(p.level)).reduce((m, p) => Math.max(m, p.barH), 30);
    const medX = xScale(allQ['0.5']);
    svg.node().appendChild(rc.line(medX, centerY - maxBarH / 2 - 5, medX, centerY + maxBarH / 2 + 5, {
        stroke: COLORS.forecast, strokeWidth: 2.5, roughness: 0.8, seed: 450
    }));

    // Annotation
    let annotation = '';
    if (widthFactor < 0.5) annotation = 'TOO SHARP! OBSERVATIONS FALL OUTSIDE \u2014 LARGE PENALTY';
    else if (widthFactor < 0.8) annotation = 'SHARPER INTERVALS, BUT SOME COVERAGE MISSES';
    else if (widthFactor <= 1.3) annotation = 'GOOD BALANCE OF SHARPNESS AND CALIBRATION';
    else if (widthFactor <= 2.0) annotation = 'WIDE INTERVALS \u2014 HIGH DISPERSION PENALTY';
    else annotation = 'VERY WIDE \u2014 SAFE COVERAGE BUT POOR SHARPNESS';

    svg.append('text').attr('class', 'tick-label')
        .attr('x', W / 2).attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('fill', '#666').style('font-size', '13px')
        .text(annotation);

    // Observed dot
    renderObservedDot(svg, rc, xScale, obsVal, centerY, allQ, enabledPIs);

    // Drag overlay
    svg.append('rect')
        .attr('class', 'drag-overlay')
        .attr('x', 0).attr('y', 0)
        .attr('width', W).attr('height', H)
        .attr('fill', 'transparent')
        .style('cursor', 'ew-resize')
        .call(d3.drag()
            .on('drag', function(event) {
                const newVal = xScale.invert(Math.max(0, Math.min(W, event.x)));
                bpObservedValue = newVal;
                renderObservedDot(svg, rc, xScale, newVal, centerY, allQ, enabledPIs);
            })
        );
}

function updateBPCoverage(allQ, obsVal, enabledPIs) {
    const el = document.getElementById('bp-coverage');
    el.innerHTML = '';
    const piChecks = [
        { level: 95, lower: '0.025', upper: '0.975' },
        { level: 80, lower: '0.1',   upper: '0.9'   },
        { level: 50, lower: '0.25',  upper: '0.75'  },
    ];
    piChecks.forEach(pi => {
        if (!enabledPIs.includes(pi.level)) return;
        const inRange = obsVal >= allQ[pi.lower] && obsVal <= allQ[pi.upper];
        const row = document.createElement('div');
        row.className = 'coverage-row';
        row.innerHTML = `<span class="coverage-check ${inRange ? 'coverage-hit' : 'coverage-miss'}">${inRange ? '&#10003;' : '&#10007;'}</span>
            <span>${pi.level}% PI: ${inRange ? 'Covered' : 'Miss'} [${d3.format(',')(Math.round(allQ[pi.lower]))} \u2013 ${d3.format(',')(Math.round(allQ[pi.upper]))}]</span>`;
        el.appendChild(row);
    });
}

function setupBoxplotControls() {
    document.querySelectorAll('.toggle-btn[data-bp-interval]').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            redrawBoxplot();
        });
    });

    const slider = document.getElementById('bp-width-slider');
    const label = document.getElementById('bp-width-value');
    slider.addEventListener('input', () => {
        label.textContent = parseFloat(slider.value).toFixed(1) + 'x';
        redrawBoxplot();
    });
}

// --- WIS Decomposition Bar ---
function drawWISDecomp(wis) {
    const el = d3.select('#wis-decomp');
    el.selectAll('*').remove();

    const total = wis.total;
    if (total === 0) return;

    const barW = 260, barH = 26;
    const svgBar = el.append('svg').attr('width', barW + 10).attr('height', barH + 28);
    const rc = rough.svg(svgBar.node());

    const parts = [
        { label: 'Dispersion', value: wis.dispersion, color: '#5ACDC5' },
        { label: 'Under', value: wis.underprediction, color: '#E87D5F' },
        { label: 'Over', value: wis.overprediction, color: '#8B6DB0' },
    ];

    let x = 0;
    parts.forEach((p, i) => {
        const w = (p.value / total) * barW;
        if (w > 1) {
            svgBar.node().appendChild(rc.rectangle(x, 0, w, barH, {
                fill: p.color, fillStyle: 'solid', stroke: 'none', roughness: 0.8, seed: 1000 + i
            }));
            if (w > 40) {
                svgBar.append('text').attr('x', x + w / 2).attr('y', barH / 2 + 5)
                    .attr('text-anchor', 'middle').attr('class', 'tick-label')
                    .style('fill', 'white').style('font-size', '11px')
                    .text(Math.round(p.value));
            }
            x += w;
        }
    });

    x = 0;
    parts.forEach(p => {
        const w = (p.value / total) * barW;
        if (w > 30) {
            svgBar.append('text').attr('x', x + w / 2).attr('y', barH + 16)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px').style('fill', '#1C2442')
                .style('font-family', "'Just Another Hand', cursive")
                .text(p.label.toUpperCase());
        }
        x += w;
    });
}

// --- Relative WIS Chart (Section 4) ---
function drawRWISChart() {
    const { forecast, surveillance, baseline } = chartData;

    d3.select('#rwis-chart').selectAll('*').remove();

    const margin = {top: 20, right: 30, bottom: 50, left: 70};
    const container = document.getElementById('rwis-chart');
    const width = container.clientWidth - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    const svgEl = d3.select('#rwis-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const allDates = [...surveillance.map(d => d.date), ...forecast.map(d => d.date), ...baseline.map(d => d.date)];
    const allValues = [
        ...surveillance.map(d => d.value),
        ...forecast.flatMap(d => [d.q100, d.q900]),
        ...baseline.map(d => d.q900)
    ];

    const xScale = d3.scaleTime().domain(d3.extent(allDates)).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, d3.max(allValues) * 1.1]).range([height, 0]);

    // Axes
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 1 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 2 }));

    xScale.ticks(6).forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, height, x, height + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 10 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 20).attr('text-anchor', 'middle').text(d3.timeFormat('%b %d')(tick).toUpperCase());
    });

    yScale.ticks(6).forEach((tick, i) => {
        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 20 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(d3.format(',')(tick));
    });

    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -55).attr('x', -height / 2).attr('text-anchor', 'middle').text('WEEKLY HOSPITALIZATIONS');
    svg.append('text').attr('class', 'axis-label').attr('x', width / 2).attr('y', height + 42).attr('text-anchor', 'middle').text('WEEK');

    // Band half-width
    const dateSpan = forecast.length > 1 ? xScale(forecast[1].date) - xScale(forecast[0].date) : 60;
    const bandHW = Math.min(dateSpan * 0.22, 22);
    const gap = 3;

    // --- Draw BASELINE first (behind) ---
    baseline.forEach((d, i) => {
        const cx = xScale(d.date) + gap / 2;
        const upper = d.q900;
        const lower = Math.max(d.q100, d.q500 * 0.3);
        const top = yScale(upper);
        const bot = yScale(lower);
        svg.node().appendChild(rc.rectangle(cx, top, bandHW * 2, bot - top, {
            fill: COLORS.baseline, fillStyle: 'hachure',
            fillWeight: 1.5, hachureGap: 5,
            stroke: COLORS.baseline, strokeWidth: 1,
            roughness: 1.2, seed: 2200 + i
        }));
    });

    baseline.forEach((d, i) => {
        const cx = xScale(d.date) + gap / 2;
        const top = yScale(d.q750);
        const bot = yScale(d.q250);
        svg.node().appendChild(rc.rectangle(cx + bandHW * 0.3, top, bandHW * 1.4, bot - top, {
            fill: COLORS.baseline, fillStyle: 'hachure',
            fillWeight: 2, hachureGap: 4,
            stroke: COLORS.baseline, strokeWidth: 1,
            roughness: 1.2, seed: 2300 + i
        }));
    });

    // --- Draw MODEL on top ---
    forecast.forEach((d, i) => {
        const cx = xScale(d.date) - gap / 2 - bandHW;
        const top = yScale(d.q900);
        const bot = yScale(d.q100);
        const rect = rc.rectangle(cx, top, bandHW * 2, bot - top, {
            fill: COLORS.pi95, fillStyle: 'solid',
            stroke: COLORS.pi80, strokeWidth: 1,
            roughness: 1.2, seed: 2000 + i
        });
        rect.style.opacity = 0.6;
        svg.node().appendChild(rect);
    });

    forecast.forEach((d, i) => {
        const cx = xScale(d.date) - gap / 2 - bandHW;
        const top = yScale(d.q750);
        const bot = yScale(d.q250);
        const rect = rc.rectangle(cx + bandHW * 0.3, top, bandHW * 1.4, bot - top, {
            fill: COLORS.pi50, fillStyle: 'solid',
            stroke: COLORS.pi50, strokeWidth: 1,
            roughness: 1.2, seed: 2100 + i
        });
        rect.style.opacity = 0.8;
        svg.node().appendChild(rect);
    });

    // Out-of-sample dots
    const oosData = getOOSValues(surveillance, forecast);
    oosData.forEach((d, i) => {
        svg.node().appendChild(rc.circle(xScale(d.date), yScale(d.value), 10, {
            fill: 'white', fillStyle: 'solid',
            stroke: COLORS.observed, strokeWidth: 2,
            roughness: 0.8, seed: 2400 + i
        }));
    });

    // Baseline median dots
    baseline.forEach((d, i) => {
        svg.node().appendChild(rc.circle(xScale(d.date) + gap / 2 + bandHW, yScale(d.q500), 8, {
            fill: COLORS.baseline, fillStyle: 'solid',
            stroke: COLORS.baseline, strokeWidth: 1,
            roughness: 0.8, seed: 2500 + i
        }));
    });

    // Observed line + dots
    const obsLine = d3.line().x(d => xScale(d.date)).y(d => yScale(d.value));
    svg.node().appendChild(rc.path(obsLine(surveillance), {
        stroke: COLORS.observed, strokeWidth: 2, roughness: 1, fill: 'none', seed: 2600
    }));
    surveillance.forEach((d, i) => {
        svg.node().appendChild(rc.circle(xScale(d.date), yScale(d.value), 10, {
            fill: COLORS.observed, fillStyle: 'solid',
            stroke: COLORS.observed, strokeWidth: 1,
            roughness: 1, seed: 2610 + i
        }));
    });

    // Legend
    const lg = svg.append('g').attr('transform', `translate(${width - 200}, 10)`);
    lg.node().appendChild(rc.circle(8, 0, 8, { fill: COLORS.observed, fillStyle: 'solid', stroke: COLORS.observed, roughness: 0.8, seed: 2700 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 18).attr('y', 4).text('OBSERVED');
    lg.node().appendChild(rc.circle(8, 16, 8, { fill: 'white', fillStyle: 'solid', stroke: COLORS.observed, strokeWidth: 2, roughness: 0.8, seed: 2703 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 18).attr('y', 20).text('OUT-OF-SAMPLE');
    lg.node().appendChild(rc.rectangle(0, 28, 16, 10, { fill: COLORS.pi80, fillStyle: 'solid', stroke: 'none', roughness: 0.8, seed: 2701 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 22).attr('y', 38).text('MODEL');
    lg.node().appendChild(rc.rectangle(0, 44, 16, 10, { fill: COLORS.baseline, fillStyle: 'hachure', fillWeight: 1.5, hachureGap: 4, stroke: COLORS.baseline, roughness: 0.8, seed: 2702 }));
    lg.append('text').attr('class', 'legend-text').attr('x', 22).attr('y', 54).text('BASELINE');

    // --- Compute real WIS ---
    const baselineByDateMap = {};
    baseline.forEach(d => { baselineByDateMap[d.date.toISOString().slice(0, 10)] = d; });

    const survByDate = {};
    surveillance.forEach(d => { survByDate[d.date.toISOString().slice(0, 10)] = d.value; });

    let modelWISSum = 0, baselineWISSum = 0, matchCount = 0;

    forecast.forEach(fd => {
        const dateKey = fd.date.toISOString().slice(0, 10);
        const obs = survByDate[dateKey];
        const bd = baselineByDateMap[dateKey];
        if (obs !== undefined && bd) {
            modelWISSum += computeWIS(fd.allQ, obs).total;
            baselineWISSum += computeWIS(bd.allQ, obs).total;
            matchCount++;
        }
    });

    if (matchCount > 0) {
        const avgModel = modelWISSum / matchCount;
        const avgBaseline = baselineWISSum / matchCount;
        const rWIS = avgBaseline > 0 ? avgModel / avgBaseline : NaN;

        document.getElementById('wis-avg-model-val').textContent = Math.round(avgModel).toLocaleString();
        document.getElementById('wis-baseline-val').textContent = Math.round(avgBaseline).toLocaleString();

        const rwisEl = document.getElementById('rwis-val');
        rwisEl.textContent = rWIS.toFixed(2);
        rwisEl.className = 'rwis-value ' + (rWIS < 1 ? 'rwis-good' : 'rwis-bad');

        const interpEl = document.getElementById('rwis-interp');
        if (rWIS < 1) interpEl.textContent = `Model is ${Math.round((1 - rWIS) * 100)}% better than the baseline`;
        else if (rWIS > 1) interpEl.textContent = `Model is ${Math.round((rWIS - 1) * 100)}% worse than the baseline`;
        else interpEl.textContent = 'Model performs the same as baseline';
    } else {
        document.getElementById('wis-avg-model-val').textContent = 'N/A';
        document.getElementById('wis-baseline-val').textContent = 'N/A';
        document.getElementById('rwis-val').textContent = 'N/A';
        document.getElementById('rwis-interp').textContent = 'No overlapping dates between forecast, baseline, and observations';
    }
}
