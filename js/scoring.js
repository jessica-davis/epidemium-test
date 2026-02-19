/* ============================================================
   Scoring Functions
   ============================================================ */

function generateQuantiles(median, sigma) {
    const q = {};
    Object.entries(Z_SCORES).forEach(([level, z]) => {
        q[level] = Math.max(0, median + z * sigma);
    });
    return q;
}

function computeWIS(allQ, y, pairs) {
    pairs = pairs || WIS_PAIRS;
    const median = allQ['0.5'];
    const K = pairs.length;
    let dispersion = 0, underpred = 0, overpred = 0;

    pairs.forEach(({alpha, lower, upper}) => {
        const l = allQ[lower], u = allQ[upper];
        const w = alpha / 2;
        dispersion += w * (u - l);
        if (y > u) underpred += w * (2 / alpha) * (y - u);
        if (y < l) overpred  += w * (2 / alpha) * (l - y);
    });

    const absErr = 0.5 * Math.abs(y - median);
    const denom = K + 0.5;
    return {
        dispersion: dispersion / denom,
        underprediction: underpred / denom,
        overprediction: overpred / denom,
        total: (dispersion + underpred + overpred + absErr) / denom
    };
}

// Generate out-of-sample "observed" values (projected from surveillance trend)
function getOOSValues(surveillance, forecastDates) {
    const n = surveillance.length;
    const lastVal = surveillance[n - 1].value;
    const growthRate = lastVal / surveillance[n - 2].value;
    const dampedRate = 1 + (growthRate - 1) * 0.6;
    let prev = lastVal;
    return forecastDates.map((d, i) => {
        prev = prev * dampedRate;
        const noise = Math.sin(i * 5.7 + 1.3) * prev * 0.04;
        return { date: d.date, value: prev + noise };
    });
}

// --- Normal distribution helpers ---
function erf(x) {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return sign * y;
}

function normalPDF(x, mu, sigma) {
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

function normalCDF(x, mu, sigma) {
    const z = (x - mu) / (sigma * Math.SQRT2);
    return 0.5 * (1 + erf(z));
}

function computeCoverageStats(forecastH0, obsByDate, piDef) {
    let covered = 0, total = 0;
    forecastH0.forEach(d => {
        const dateKey = d.date.toISOString().slice(0, 10);
        const obs = obsByDate[dateKey];
        if (obs !== undefined) {
            total++;
            if (obs >= d.allQ[piDef.lower] && obs <= d.allQ[piDef.upper]) covered++;
        }
    });
    return { covered, total, pct: total > 0 ? covered / total * 100 : 0 };
}
