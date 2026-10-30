(function (global) {
  const MIN_WEIGHT_SHARE = 0.6;

  function percentileRanks(values) {
    const n = values.length;
    const order = values.map((value, index) => [value, index]).sort((a, b) => a[0] - b[0]);
    const ranks = new Array(n);
    let start = 0;
    while (start < n) {
      let end = start;
      while (end + 1 < n && order[end + 1][0] === order[start][0]) end += 1;
      const rank = n > 1 ? (start + end) / 2 / (n - 1) : 0.5;
      for (let k = start; k <= end; k += 1) ranks[order[k][1]] = rank;
      start = end + 1;
    }
    return ranks;
  }

  function periodMeans(wards, months, variables) {
    return wards.map(ward => {
      const sums = {};
      const counts = {};
      months.forEach(month => {
        const record = ward.series[month];
        if (!record) return;
        variables.forEach(variable => {
          const value = record[variable];
          if (value === undefined || value === null) return;
          sums[variable] = (sums[variable] || 0) + value;
          counts[variable] = (counts[variable] || 0) + 1;
        });
      });
      const means = {};
      variables.forEach(variable => {
        means[variable] = counts[variable] ? sums[variable] / counts[variable] : null;
      });
      return means;
    });
  }

  function scoreWards(wards, months, disease) {
    const factors = disease.factors;
    const variables = [...new Set(factors.map(f => f.variable))];
    const means = periodMeans(wards, months, variables);
    const levels = {};
    variables.forEach(variable => {
      const positions = [];
      const values = [];
      means.forEach((mean, index) => {
        if (mean[variable] !== null) {
          positions.push(index);
          values.push(mean[variable]);
        }
      });
      const ranks = percentileRanks(values);
      const column = new Array(wards.length).fill(null);
      positions.forEach((position, k) => { column[position] = ranks[k]; });
      levels[variable] = column;
    });
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    return wards.map((ward, index) => {
      let total = 0;
      let weights = 0;
      const parts = factors.map(factor => {
        const rank = levels[factor.variable][index];
        const raw = means[index][factor.variable];
        if (rank === null) {
          return { key: factor.key, label: factor.label, weight: factor.weight, unit: factor.unit, raw: null, level: null };
        }
        const level = factor.direction === 'low' ? 1 - rank : rank;
        total += factor.weight * level;
        weights += factor.weight;
        return { key: factor.key, label: factor.label, weight: factor.weight, unit: factor.unit, raw, level };
      });
      return { ...ward, score: weights >= MIN_WEIGHT_SHARE * totalWeight ? (total / weights) * 100 : null, parts };
    });
  }

  global.BiosecScoring = { percentileRanks, scoreWards };
})(typeof window !== 'undefined' ? window : globalThis);
