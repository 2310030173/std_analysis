const chartRegistry = new Map();

export function compactLabel(value, maxLength = 18) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(3, maxLength - 1)).trim()}…`;
}

export function buildTopSeries(items, {
  labelField = "category",
  valueField = "units",
  maxItems = 6,
  otherLabel = "Others"
} = {}) {
  const rows = Array.isArray(items) ? [...items] : [];
  rows.sort((a, b) => Number(b?.[valueField] || 0) - Number(a?.[valueField] || 0));

  const topRows = rows.slice(0, maxItems);
  const otherTotal = rows
    .slice(maxItems)
    .reduce((sum, row) => sum + Number(row?.[valueField] || 0), 0);

  if (otherTotal > 0) {
    topRows.push({
      [labelField]: otherLabel,
      [valueField]: otherTotal
    });
  }

  const fullLabels = topRows.map((row) => String(row?.[labelField] || "Unknown"));
  const labels = fullLabels.map((label) => compactLabel(label));
  const values = topRows.map((row) => Number(row?.[valueField] || 0));

  return {
    labels,
    fullLabels,
    values
  };
}

export function professionalDonutOptions(fullLabels = []) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          title(items) {
            const index = items?.[0]?.dataIndex ?? -1;
            return fullLabels[index] || items?.[0]?.label || "";
          }
        }
      }
    },
    animation: {
      duration: 520,
      easing: "easeOutCubic"
    }
  };
}

export function drawChart(canvasId, config) {
  if (!globalThis.Chart) {
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }

  const prev = chartRegistry.get(canvasId);
  if (prev) {
    prev.destroy();
  }

  const ctx = canvas.getContext("2d");
  const chart = new globalThis.Chart(ctx, config);
  chartRegistry.set(canvasId, chart);
}

export function clearCharts() {
  chartRegistry.forEach((chart) => chart.destroy());
  chartRegistry.clear();
}
