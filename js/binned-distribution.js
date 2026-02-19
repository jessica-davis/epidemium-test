/* ============================================================
   Charts: Binned Distributions
   ============================================================ */

const BINNED_FORECAST = { mean: 500, sd: 80 };
const BINNED_DOMAIN = [200, 800];
const BINNED_DEFAULT_WIDTH = 50;

// --- State ---
let binnedBinWidth = BINNED_DEFAULT_WIDTH;

// --- Compute bins ---
function computeBins(mean, sd, domain, binWidth) {
    const bins = [];
    const start = Math.floor(domain[0] / binWidth) * binWidth;
    const end = Math.ceil(domain[1] / binWidth) * binWidth;
    for (let lower = start; lower < end; lower += binWidth) {
        const upper = lower + binWidth;
        const prob = normalCDF(upper, mean, sd) - normalCDF(lower, mean, sd);
        bins.push({ lower, upper, prob });
    }
    return bins;
}

// --- Part 1: Interactive Explorer ---
function drawBinnedExplorer() {
    d3.select('#binned-explorer').selectAll('*').remove();

    const container = document.getElementById('binned-explorer');
    if (!container) return;
    const margin = { top: 20, right: 30, bottom: 45, left: 55 };
    const totalWidth = container.clientWidth;
    const width = totalWidth - margin.left - margin.right;
    const height = 260;

    const svgEl = d3.select('#binned-explorer')
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', height + margin.top + margin.bottom);

    const svg = svgEl.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rc = rough.svg(svgEl.node());

    const { mean, sd } = BINNED_FORECAST;
    const [domLo, domHi] = BINNED_DOMAIN;
    const bins = computeBins(mean, sd, BINNED_DOMAIN, binnedBinWidth);
    const maxProb = d3.max(bins, d => d.prob);

    // Scales
    const xScale = d3.scaleLinear().domain([domLo, domHi]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, maxProb * 1.15]).range([height, 0]);

    // Axes (rough)
    svg.node().appendChild(rc.line(0, height, width, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9000 }));
    svg.node().appendChild(rc.line(0, 0, 0, height, { stroke: '#1C2442', strokeWidth: 1.5, roughness: 0.8, seed: 9001 }));

    // X-axis ticks
    const xTicks = d3.range(domLo, domHi + 1, 100);
    xTicks.forEach((tick, i) => {
        const x = xScale(tick);
        svg.node().appendChild(rc.line(x, height, x, height + 6, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 9010 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', x).attr('y', height + 20).attr('text-anchor', 'middle').text(tick);
    });
    svg.append('text').attr('class', 'axis-label').attr('x', width / 2).attr('y', height + 40).attr('text-anchor', 'middle').text('WEEKLY HOSPITALIZATIONS');

    // Y-axis ticks
    const yTicks = yScale.ticks(5);
    yTicks.forEach((tick, i) => {
        const y = yScale(tick);
        svg.node().appendChild(rc.line(-6, y, 0, y, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.5, seed: 9030 + i }));
        svg.append('text').attr('class', 'tick-label').attr('x', -10).attr('y', y + 4).attr('text-anchor', 'end').text(tick < 0.01 ? tick.toFixed(3) : tick.toFixed(2));
    });
    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('y', -42).attr('x', -height / 2).attr('text-anchor', 'middle').text('PROBABILITY');

    // Histogram bars (rough.js)
    bins.forEach((bin, i) => {
        const x = xScale(bin.lower);
        const w = xScale(bin.upper) - xScale(bin.lower);
        const barTop = yScale(bin.prob);
        const barH = height - barTop;

        if (barH > 0.5) {
            svg.node().appendChild(rc.rectangle(x, barTop, w, barH, {
                fill: '#B9E1D9', fillStyle: 'solid',
                stroke: '#79CAC4', strokeWidth: 1,
                roughness: 1.0, seed: 9100 + i
            }));
        }
    });

    // Smooth PDF overlay (D3 line — not rough)
    const pdfPoints = d3.range(domLo, domHi + 1, 1).map(x => ({
        x, y: normalPDF(x, mean, sd)
    }));

    // Scale PDF to match histogram: pdf * binWidth gives probability per bin
    const pdfLine = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y * binnedBinWidth))
        .curve(d3.curveBasis);

    svg.append('path')
        .datum(pdfPoints)
        .attr('d', pdfLine)
        .attr('fill', 'none')
        .attr('stroke', '#1E9CC5')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.8);

    // Update display
    const nBins = bins.length;
    const display = document.getElementById('binned-info-display');
    if (display) {
        display.innerHTML = `<span style="font-weight:600;">Bin width: ${binnedBinWidth}</span> &nbsp;|&nbsp; <span>${nBins} bins</span>`;
    }
}

// --- Part 2: Three-panel comparison ---
function drawBinnedComparison() {
    const container = document.getElementById('binned-comparison');
    if (!container) return;
    d3.select('#binned-comparison').selectAll('*').remove();

    const comparisonWidths = [25, 100, 200];
    const { mean, sd } = BINNED_FORECAST;
    const [domLo, domHi] = BINNED_DOMAIN;

    const totalWidth = container.clientWidth;
    const panelGap = 20;
    const panelW = Math.floor((totalWidth - panelGap * (comparisonWidths.length - 1)) / comparisonWidths.length);
    const panelH = 160;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const chartW = panelW - margin.left - margin.right;
    const chartH = panelH - margin.top - margin.bottom;

    const svgEl = d3.select('#binned-comparison')
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', panelH);

    const rc = rough.svg(svgEl.node());

    comparisonWidths.forEach((bw, pi) => {
        const offsetX = pi * (panelW + panelGap);
        const g = svgEl.append('g').attr('transform', `translate(${offsetX + margin.left},${margin.top})`);

        const bins = computeBins(mean, sd, BINNED_DOMAIN, bw);
        const maxP = d3.max(bins, d => d.prob);

        const xS = d3.scaleLinear().domain([domLo, domHi]).range([0, chartW]);
        const yS = d3.scaleLinear().domain([0, maxP * 1.15]).range([chartH, 0]);

        // Axes
        g.node().appendChild(rc.line(0, chartH, chartW, chartH, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.6, seed: 9200 + pi * 10 }));
        g.node().appendChild(rc.line(0, 0, 0, chartH, { stroke: '#1C2442', strokeWidth: 1, roughness: 0.6, seed: 9201 + pi * 10 }));

        // Bars
        bins.forEach((bin, i) => {
            const x = xS(bin.lower);
            const w = xS(bin.upper) - xS(bin.lower);
            const barTop = yS(bin.prob);
            const barH = chartH - barTop;
            if (barH > 0.3) {
                g.node().appendChild(rc.rectangle(x, barTop, w, barH, {
                    fill: '#B9E1D9', fillStyle: 'solid', stroke: '#79CAC4', strokeWidth: 0.5,
                    roughness: 0.8, seed: 9300 + pi * 100 + i
                }));
            }
        });

        // PDF overlay
        const pdfPts = d3.range(domLo, domHi + 1, 2).map(x => ({ x, y: normalPDF(x, mean, sd) }));
        const line = d3.line().x(d => xS(d.x)).y(d => yS(d.y * bw)).curve(d3.curveBasis);
        g.append('path').datum(pdfPts).attr('d', line)
            .attr('fill', 'none').attr('stroke', '#1E9CC5').attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,2').attr('opacity', 0.7);

        // Label
        g.append('text').attr('x', chartW / 2).attr('y', chartH + 22)
            .attr('text-anchor', 'middle').style('font-size', '12px').style('font-weight', '600').style('fill', '#1C2442')
            .text(`Width = ${bw} (${bins.length} bins)`);
    });
}

// --- Controls ---
function setupBinnedControls() {
    const slider = document.getElementById('binned-width-slider');
    const valLabel = document.getElementById('binned-width-value');
    if (!slider) return;

    slider.addEventListener('input', () => {
        binnedBinWidth = parseInt(slider.value);
        if (valLabel) valLabel.textContent = binnedBinWidth;
        drawBinnedExplorer();
    });
}
