// Seeded forecast data per region and range
const FORECAST_DATA = {
  limpopo: {
    7:  [42, 48, 55, 61, 58, 52, 47],
    30: [38, 42, 48, 55, 61, 58, 52, 47, 44, 50, 56, 62, 59, 54, 49, 45, 42, 48, 53, 57, 60, 55, 50, 46, 43, 49, 54, 58, 61, 57],
    90: Array.from({length: 90}, (_, i) => Math.round(40 + 20 * Math.sin(i / 14) + (Math.random() * 6 - 3)))
  },
  mpumalanga: {
    7:  [30, 35, 38, 42, 40, 36, 33],
    30: Array.from({length: 30}, (_, i) => Math.round(28 + 14 * Math.sin(i / 8) + (Math.random() * 4 - 2))),
    90: Array.from({length: 90}, (_, i) => Math.round(25 + 18 * Math.sin(i / 16) + (Math.random() * 5 - 2)))
  },
  'kwazulu-natal': {
    7:  [22, 25, 28, 26, 24, 22, 20],
    30: Array.from({length: 30}, (_, i) => Math.round(18 + 10 * Math.sin(i / 9) + (Math.random() * 4 - 2))),
    90: Array.from({length: 90}, (_, i) => Math.round(16 + 12 * Math.sin(i / 18) + (Math.random() * 5 - 2)))
  }
};

function makeLabels(days) {
  const labels = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    labels.push(d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }));
  }
  return labels;
}

function riskColor(v) {
  if (v >= 50) return '#d93025';
  if (v >= 25) return '#f9bb06';
  return '#34a853';
}

let chart = null;

function buildChart(days, region) {
  const data = FORECAST_DATA[region][days];
  const labels = makeLabels(days);
  const upper = data.map(v => Math.min(100, v + 12));
  const lower = data.map(v => Math.max(0, v - 12));

  const mean = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
  const peakIdx = data.indexOf(Math.max(...data));
  const peakVal = data[peakIdx];
  const trend = data[data.length - 1] > data[0] ? 'worsening' : 'improving';

  // Update sidebar
  document.getElementById('ci-upper').textContent = Math.min(100, mean + 12) + '%';
  document.getElementById('ci-mean').textContent = mean + '%';
  document.getElementById('ci-lower').textContent = Math.max(0, mean - 12) + '%';
  document.getElementById('ci-bar').style.width = mean + '%';
  document.getElementById('peak-day').textContent = labels[peakIdx];
  document.getElementById('peak-pct').textContent = peakVal + '% predicted risk';
  document.getElementById('trend-arrow').textContent = trend === 'worsening' ? '↗' : '↘';
  document.getElementById('trend-arrow').style.color = trend === 'worsening' ? '#d93025' : '#34a853';
  document.getElementById('trend-text').textContent = trend === 'worsening' ? 'Worsening' : 'Improving';
  document.getElementById('trend-detail').textContent = `Risk ${trend === 'worsening' ? 'increasing' : 'decreasing'} over forecast window`;

  document.getElementById('range-label').textContent = `Next ${days} Day${days > 1 ? 's' : ''}`;

  const pointColors = data.map(v => riskColor(v));
  const styles = getComputedStyle(document.documentElement);
  const token = name => styles.getPropertyValue(name).trim();

  if (chart) chart.destroy();

  const ctx = document.getElementById('forecastChart').getContext('2d');
  chart = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Upper bound',
          data: upper,
          borderColor: 'transparent',
          backgroundColor: token('--chart-band'),
          fill: '+1',
          pointRadius: 0,
          tension: 0.4,
          order: 3
        },
        {
          type: 'line',
          label: 'Predicted Risk',
          data,
          borderColor: token('--primary'),
          backgroundColor: 'transparent',
          pointBackgroundColor: pointColors,
          pointBorderColor: token('--panel-bg'),
          pointBorderWidth: 2,
          pointRadius: days <= 7 ? 6 : days <= 30 ? 4 : 2,
          tension: 0.4,
          fill: false,
          order: 1
        },
        {
          type: 'line',
          label: 'Lower bound',
          data: lower,
          borderColor: 'transparent',
          backgroundColor: token('--chart-band'),
          fill: '-1',
          pointRadius: 0,
          tension: 0.4,
          order: 3
        }
      ]
    },
    options: {
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 300 },
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: token('--surface-raised'),
          titleColor: token('--text-dark'),
          bodyColor: token('--text-dark'),
          borderColor: token('--border'),
          borderWidth: 1,
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 1) return ` Risk: ${ctx.raw}%`;
              return null;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: token('--border') },
          ticks: { color: token('--text-muted'), font: { size: 11 }, maxTicksLimit: days <= 7 ? 7 : 10 }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: token('--border') },
          border: { display: false },
          ticks: {
            color: token('--text-muted'),
            font: { size: 11 },
            callback: v => v + '%'
          }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  let currentDays = 7;
  let currentRegion = 'limpopo';

  buildChart(currentDays, currentRegion);

  // Update appearance without rebuilding random demo data or resetting controls.
  window.addEventListener('eoha:themechange', () => buildChart(currentDays, currentRegion));

  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentDays = parseInt(this.dataset.days);
      buildChart(currentDays, currentRegion);
    });
  });

  document.getElementById('region-select').addEventListener('change', function () {
    currentRegion = this.value;
    buildChart(currentDays, currentRegion);
  });
});
