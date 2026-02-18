/* ============================================================
   Charts: Categorical Forecasts (Bar Charts + Gauges)
   ============================================================ */

// --- Horizontal Bar Charts ---
function drawHorizontalBarChart(containerId, categories, probs, colors, seedBase) {
    d3.select('#' + containerId).selectAll('*').remove();

    const container = document.getElementById(containerId);
    const margin = {top: 8, right: 60, bottom: 10, left: 120};
    const width = container.clientWidth - margin.left - margin.right;
    const barHeight = 32;
    const gap = 10;
    const height = categories.length * (barHeight + gap) - gap;

    const svgEl = d3.select('#' + containerId)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    categories.forEach((cat, i) => {
        const y = i * (barHeight + gap);
        const prob = probs[cat];
        const barW = xScale(prob);

        // Bar
        if (barW > 2) {
            svg.node().appendChild(rc.rectangle(0, y, barW, barHeight, {
                fill: colors[cat], fillStyle: 'solid',
                stroke: colors[cat], strokeWidth: 0.5,
                roughness: 1.2, seed: seedBase + i
            }));
        }

        // Category label (left)
        svg.append('text').attr('class', 'tick-label')
            .attr('x', -8).attr('y', y + barHeight / 2 + 4)
            .attr('text-anchor', 'end')
            .style('font-size', '15px')
            .text(cat.toUpperCase());

        // Percentage label (right of bar)
        svg.append('text').attr('class', 'tick-label')
            .attr('x', barW + 8).attr('y', y + barHeight / 2 + 4)
            .style('font-size', '15px').style('font-weight', '600')
            .text(Math.round(prob * 100) + '%');
    });
}

function drawTrendChart() {
    const categories = ['Large Increase', 'Increase', 'Stable', 'Decrease', 'Large Decrease'];
    const probs = { 'Large Increase': 0.08, 'Increase': 0.52, 'Stable': 0.28, 'Decrease': 0.09, 'Large Decrease': 0.03 };
    const colors = {
        'Large Increase': '#E8A56D', 'Increase': '#EFDA86', 'Stable': '#D1E5B7',
        'Decrease': '#9CD3B4', 'Large Decrease': '#75BFBD'
    };
    drawHorizontalBarChart('trend-chart', categories, probs, colors, 4000);
}

function drawActivityChart() {
    const categories = ['Very High', 'High', 'Medium', 'Low'];
    const probs = { 'Very High': 0.05, 'High': 0.35, 'Medium': 0.45, 'Low': 0.15 };
    const colors = {
        'Very High': '#4D6891', 'High': '#4B9AC1', 'Medium': '#9CD8D3', 'Low': '#E4F7EE'
    };
    drawHorizontalBarChart('activity-chart', categories, probs, colors, 4100);
}

// --- Gauge/Dial Visualizations ---
function drawGauge(containerId, categories, probs, colors, seedBase) {
    d3.select('#' + containerId).selectAll('*').remove();

    const container = document.getElementById(containerId);
    const padLR = 70; // horizontal padding for labels
    const totalW = Math.min(container.clientWidth, 420);
    const arcW = totalW - padLR * 2;
    const cx = totalW / 2;
    const outerR = arcW * 0.48;
    const innerR = outerR * 0.55;
    const cy = outerR + 20;
    const svgH = cy + 46;

    const svgEl = d3.select('#' + containerId)
        .append('svg')
        .attr('width', totalW)
        .attr('height', svgH);

    const rc = rough.svg(svgEl.node());

    // Draw arc segments — equal width, from π (left) to 0 (right)
    const n = categories.length;
    const equalSweep = Math.PI / n;
    const totalProb = categories.reduce((s, c) => s + probs[c], 0);

    // Build equal-width segments
    const segAngles = [];
    categories.forEach((c, i) => {
        const start = Math.PI - i * equalSweep;
        const end = start - equalSweep;
        const mid = (start + end) / 2;
        segAngles.push({ cat: c, start, end, mid });
    });

    // Compute needle angle (weighted average of segment centers)
    let needleAngle = 0;
    categories.forEach((c, i) => {
        needleAngle += probs[c] * segAngles[i].mid;
    });
    needleAngle /= totalProb;

    // Draw each arc segment
    segAngles.forEach((seg, i) => {
        const steps = 20;
        const sweepAngle = seg.start - seg.end;
        let pathD = '';

        // Outer arc
        for (let s = 0; s <= steps; s++) {
            const a = seg.start - (s / steps) * sweepAngle;
            const x = cx + outerR * Math.cos(a);
            const y = cy - outerR * Math.sin(a);
            pathD += (s === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        // Inner arc (reverse)
        for (let s = steps; s >= 0; s--) {
            const a = seg.start - (s / steps) * sweepAngle;
            const x = cx + innerR * Math.cos(a);
            const y = cy - innerR * Math.sin(a);
            pathD += 'L' + x.toFixed(1) + ',' + y.toFixed(1);
        }
        pathD += 'Z';

        svgEl.node().appendChild(rc.path(pathD, {
            fill: colors[seg.cat], fillStyle: 'solid',
            stroke: '#fff', strokeWidth: 2,
            roughness: 1.0, seed: seedBase + i
        }));

        // Category label on outer edge
        const labelR = outerR + 14;
        const labelAngle = seg.mid;
        const lx = cx + labelR * Math.cos(labelAngle);
        const ly = cy - labelR * Math.sin(labelAngle);
        const anchor = labelAngle > Math.PI / 2 ? 'end' : labelAngle < Math.PI / 2 ? 'start' : 'middle';
        svgEl.append('text')
            .attr('x', lx).attr('y', ly + 4)
            .attr('text-anchor', anchor)
            .style('font-family', "'Just Another Hand', cursive")
            .style('font-size', '14px')
            .style('fill', '#1C2442')
            .text(seg.cat.toUpperCase());
    });

    // Draw needle
    const needleLen = outerR * 0.92;
    const nx = cx + needleLen * Math.cos(needleAngle);
    const ny = cy - needleLen * Math.sin(needleAngle);
    svgEl.node().appendChild(rc.line(cx, cy, nx, ny, {
        stroke: '#1C2442', strokeWidth: 2.5, roughness: 0.6, seed: seedBase + 50
    }));
    // Needle hub
    svgEl.node().appendChild(rc.circle(cx, cy, 12, {
        fill: '#1C2442', fillStyle: 'solid',
        stroke: '#1C2442', strokeWidth: 1,
        roughness: 0.8, seed: seedBase + 51
    }));

    // Text below: top 1–2 probabilities
    const sorted = categories.map(c => ({ cat: c, prob: probs[c] }))
        .sort((a, b) => b.prob - a.prob);
    const top = sorted[0];
    const second = sorted[1];
    const showTwo = second && second.prob >= 0.10;

    svgEl.append('text')
        .attr('x', cx).attr('y', cy + 20)
        .attr('text-anchor', 'middle')
        .style('font-family', "'DM Sans', sans-serif")
        .style('font-size', '15px')
        .style('font-weight', '700')
        .style('fill', colors[top.cat])
        .text(top.cat.toUpperCase() + '  ' + Math.round(top.prob * 100) + '%');

    if (showTwo) {
        svgEl.append('text')
            .attr('x', cx).attr('y', cy + 38)
            .attr('text-anchor', 'middle')
            .style('font-family', "'DM Sans', sans-serif")
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('fill', colors[second.cat])
            .text(second.cat.toUpperCase() + '  ' + Math.round(second.prob * 100) + '%');
    }
}

function drawTrendGauge() {
    const categories = ['Large Decrease', 'Decrease', 'Stable', 'Increase', 'Large Increase'];
    const probs = { 'Large Increase': 0.08, 'Increase': 0.52, 'Stable': 0.28, 'Decrease': 0.09, 'Large Decrease': 0.03 };
    const colors = {
        'Large Increase': '#E8A56D', 'Increase': '#EFDA86', 'Stable': '#D1E5B7',
        'Decrease': '#9CD3B4', 'Large Decrease': '#75BFBD'
    };
    drawGauge('trend-gauge', categories, probs, colors, 5000);
}

function drawActivityGauge() {
    const categories = ['Low', 'Medium', 'High', 'Very High'];
    const probs = { 'Very High': 0.05, 'High': 0.35, 'Medium': 0.45, 'Low': 0.15 };
    const colors = {
        'Very High': '#4D6891', 'High': '#4B9AC1', 'Medium': '#9CD8D3', 'Low': '#E4F7EE'
    };
    drawGauge('activity-gauge', categories, probs, colors, 5100);
}
