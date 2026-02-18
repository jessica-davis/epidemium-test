/* ============================================================
   Chart: Prediction Intervals
   ============================================================ */

function drawChart(enabledIntervals) {
    const { forecast, surveillance } = chartData;

    d3.select('#chart').selectAll('*').remove();

    const margin = {top: 20, right: 30, bottom: 50, left: 70};
    const container = document.getElementById('chart');
    const width = container.clientWidth - margin.left - margin.right;
    const height = 380 - margin.top - margin.bottom;

    const svgEl = d3.select('#chart')
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

    // PI areas
    const pis = [
        {level: 95, lower: 'q025', upper: 'q975', color: COLORS.pi95, opacity: 0.3},
        {level: 80, lower: 'q100', upper: 'q900', color: COLORS.pi80, opacity: 0.4},
        {level: 50, lower: 'q250', upper: 'q750', color: COLORS.pi50, opacity: 0.5}
    ];

    pis.forEach(pi => {
        if (!enabledIntervals.includes(pi.level)) return;
        const area = d3.area().x(d => xScale(d.date)).y0(d => yScale(d[pi.lower])).y1(d => yScale(d[pi.upper]));
        const sketchyPath = rc.path(area(forecast), {
            fill: pi.color, fillStyle: 'solid', fillWeight: 1, stroke: 'none', roughness: 1.5, seed: pi.level
        });
        sketchyPath.style.opacity = pi.opacity;
        svg.node().appendChild(sketchyPath);

        // Bound lines
        [pi.lower, pi.upper].forEach((key, j) => {
            const line = d3.line().x(d => xScale(d.date)).y(d => yScale(d[key]));
            svg.node().appendChild(rc.path(line(forecast), {
                stroke: pi.color, strokeWidth: 1.5, roughness: 1.2, fill: 'none', seed: pi.level + j + 1
            }));
        });
    });

    // Median forecast line
    const medianLine = d3.line().x(d => xScale(d.date)).y(d => yScale(d.q500));
    svg.node().appendChild(rc.path(medianLine(forecast), {
        stroke: COLORS.forecast, strokeWidth: 2.5, roughness: 1.2, fill: 'none', seed: 42
    }));

    // Observed dots
    surveillance.forEach(d => {
        svg.node().appendChild(rc.circle(xScale(d.date), yScale(d.value), 10, {
            fill: COLORS.observed, fillStyle: 'solid', stroke: COLORS.observed, strokeWidth: 1, roughness: 1, seed: Math.round(d.value)
        }));
    });

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${width - 150}, 20)`);
    legend.node().appendChild(rc.circle(15, 0, 8, { fill: COLORS.observed, fillStyle: 'solid', stroke: COLORS.observed, roughness: 1, seed: 99 }));
    legend.append('text').attr('class', 'legend-text').attr('x', 25).attr('y', 4).text('OBSERVED');
    legend.node().appendChild(rc.line(0, 20, 30, 20, { stroke: COLORS.forecast, strokeWidth: 2.5, roughness: 1.2, seed: 100 }));
    legend.append('text').attr('class', 'legend-text').attr('x', 35).attr('y', 24).text('FORECAST');
}

function setupControls() {
    document.querySelectorAll('.toggle-btn[data-interval]').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const enabled = Array.from(document.querySelectorAll('.toggle-btn.active[data-interval]'))
                .map(b => parseInt(b.dataset.interval));
            drawChart(enabled);
        });
    });
}
