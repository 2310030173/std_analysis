function toDate(input) {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    .toISOString()
    .slice(0, 10);
}

function addDays(date, amount) {
  const out = new Date(date);
  out.setDate(out.getDate() + amount);
  return out;
}

export function parseDateRange(query = {}) {
  const now = new Date();
  const range = String(query.range || "month").toLowerCase();

  let from;
  let to = now;

  if (range === "day") {
    from = addDays(now, -1);
  } else if (range === "week") {
    from = addDays(now, -7);
  } else if (range === "month") {
    from = addDays(now, -30);
  } else if (range === "custom") {
    const fromInput = toDate(query.from);
    const toInput = toDate(query.to);
    from = fromInput || addDays(now, -30);
    to = toInput || now;
  } else {
    from = addDays(now, -30);
  }

  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  return {
    range,
    from,
    to,
    fromISO: toISODate(from),
    toISO: toISODate(to)
  };
}

export function isInRange(isoDate, rangeObj) {
  const date = toDate(isoDate);
  if (!date) {
    return false;
  }

  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const from = new Date(rangeObj.from.getFullYear(), rangeObj.from.getMonth(), rangeObj.from.getDate());
  const to = new Date(rangeObj.to.getFullYear(), rangeObj.to.getMonth(), rangeObj.to.getDate());

  return value >= from && value <= to;
}

export function previousWindow(rangeObj) {
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.max(1, Math.round((rangeObj.to - rangeObj.from) / dayMs));
  const prevTo = addDays(rangeObj.from, -1);
  const prevFrom = addDays(prevTo, -diffDays);

  return {
    from: prevFrom,
    to: prevTo,
    fromISO: toISODate(prevFrom),
    toISO: toISODate(prevTo)
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function percent(value) {
  return `${(value || 0).toFixed(2)}%`;
}
