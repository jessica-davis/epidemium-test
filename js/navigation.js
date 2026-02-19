/* ============================================================
   Navigation & Section Switching
   ============================================================ */

function setupNavigation() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    // Sidebar toggle button
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        toggle.classList.toggle('closed');
        // Redraw current charts after layout shift
        setTimeout(redrawActiveSection, 250);
    });

    // Mobile hamburger
    mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Section switching — handle clicks on any element with data-section
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-section]');
        if (!target || target.classList.contains('disabled')) return;

        const sectionId = target.dataset.section;
        const sectionEl = document.getElementById(sectionId);
        if (!sectionEl) return;

        // Switch content panels
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        sectionEl.classList.add('active');

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll(`.nav-item[data-section="${sectionId}"]`).forEach(n => n.classList.add('active'));

        // Close sidebar on mobile after selection
        if (window.innerWidth <= 600) {
            sidebar.classList.remove('open');
        }

        // Redraw charts for the activated section
        setTimeout(() => redrawActiveSection(sectionId), 50);
    });

    // Debounced resize handler — redraw charts on window resize / orientation change
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => redrawActiveSection(), 200);
    });
}

function redrawActiveSection(sectionId) {
    if (!sectionId) {
        const active = document.querySelector('.content-section.active');
        sectionId = active ? active.id : null;
    }
    if (sectionId === 'section-pi') {
        const piEnabled = Array.from(document.querySelectorAll('.toggle-btn.active[data-interval]'))
            .map(b => parseInt(b.dataset.interval));
        drawChart(piEnabled);
    } else if (sectionId === 'section-trends') {
        drawTrendGauge();
        drawActivityGauge();
        drawTrendChart();
        drawActivityChart();
    } else if (sectionId === 'section-wis') {
        const wisEnabled = Array.from(document.querySelectorAll('.toggle-btn.active[data-wis-box-interval]'))
            .map(b => parseInt(b.dataset.wisBoxInterval));
        drawBoxChart(wisEnabled);
        redrawBoxplot();
        drawRWISChart();
    } else if (sectionId === 'section-coverage') {
        drawCoverageChart(activeCovPI, coverageRevealed);
        drawCoverageCurve();
    } else if (sectionId === 'section-brier') {
        drawBrierExplorer();
        drawSeasonBrierChart();
    } else if (sectionId === 'section-binned') {
        drawBinnedExplorer();
        drawBinnedComparison();
    } else if (sectionId === 'section-log-score') {
        drawLogScoreExplorer();
        drawBinWidthEffect();
        drawSeasonLogScoreChart();
    }
}
