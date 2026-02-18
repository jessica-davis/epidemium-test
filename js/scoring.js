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
