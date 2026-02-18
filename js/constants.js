/* ============================================================
   Constants & Configuration
   ============================================================ */

const FORECAST_URL = 'data/forecast.csv';
const SURVEILLANCE_URL = 'data/target.csv';
const BASELINE_URL = 'data/forecast_baseline.csv';
const FORECAST_H0_URL = 'data/forecast_h0.csv';
const TARGET_H0_URL = 'data/target_h0.csv';

const COLORS = {
    observed: '#1C2442',
    forecast: '#1E9CC5',
    pi95: '#E8F6EF',
    pi80: '#B9E1D9',
    pi50: '#79CAC4',
    baseline: '#999999'
};

const Z_SCORES = {
    '0.01': -2.3263, '0.025': -1.9600, '0.05': -1.6449,
    '0.1': -1.2816, '0.15': -1.0364, '0.2': -0.8416,
    '0.25': -0.6745, '0.3': -0.5244, '0.35': -0.3853,
    '0.4': -0.2533, '0.45': -0.1257, '0.5': 0,
    '0.55': 0.1257, '0.6': 0.2533, '0.65': 0.3853,
    '0.7': 0.5244, '0.75': 0.6745, '0.8': 0.8416,
    '0.85': 1.0364, '0.9': 1.2816, '0.95': 1.6449,
    '0.975': 1.9600, '0.99': 2.3263
};

const WIS_PAIRS = [
    {alpha: 0.02, lower: '0.01',  upper: '0.99'},
    {alpha: 0.05, lower: '0.025', upper: '0.975'},
    {alpha: 0.10, lower: '0.05',  upper: '0.95'},
    {alpha: 0.20, lower: '0.1',   upper: '0.9'},
    {alpha: 0.30, lower: '0.15',  upper: '0.85'},
    {alpha: 0.40, lower: '0.2',   upper: '0.8'},
    {alpha: 0.50, lower: '0.25',  upper: '0.75'},
    {alpha: 0.60, lower: '0.3',   upper: '0.7'},
    {alpha: 0.70, lower: '0.35',  upper: '0.65'},
    {alpha: 0.80, lower: '0.4',   upper: '0.6'},
    {alpha: 0.90, lower: '0.45',  upper: '0.55'},
];

const PI_TO_PAIRS = {
    95: [
        {alpha: 0.02, lower: '0.01',  upper: '0.99'},
        {alpha: 0.05, lower: '0.025', upper: '0.975'},
        {alpha: 0.10, lower: '0.05',  upper: '0.95'},
    ],
    80: [
        {alpha: 0.20, lower: '0.1',   upper: '0.9'},
        {alpha: 0.30, lower: '0.15',  upper: '0.85'},
        {alpha: 0.40, lower: '0.2',   upper: '0.8'},
    ],
    50: [
        {alpha: 0.50, lower: '0.25',  upper: '0.75'},
        {alpha: 0.60, lower: '0.3',   upper: '0.7'},
        {alpha: 0.70, lower: '0.35',  upper: '0.65'},
        {alpha: 0.80, lower: '0.4',   upper: '0.6'},
        {alpha: 0.90, lower: '0.45',  upper: '0.55'},
    ],
};

// Synthetic data for boxplot section
const SYNTH_DATA = [
    { date: new Date('2025-11-08'), observed: 1774, modelMedian: 1650, baselineMedian: 1348 },
    { date: new Date('2025-11-15'), observed: 2417, modelMedian: 2500, baselineMedian: 1774 },
    { date: new Date('2025-11-22'), observed: 3528, modelMedian: 3200, baselineMedian: 2417 },
    { date: new Date('2025-11-29'), observed: 5133, modelMedian: 5400, baselineMedian: 3528 },
    { date: new Date('2025-12-06'), observed: 7397, modelMedian: 7100, baselineMedian: 5133 },
];
