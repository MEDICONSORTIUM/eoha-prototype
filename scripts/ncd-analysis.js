/* Shared synthetic NCD reporting and seasonal demonstration helpers. */
(function (root) {
    function monthLabel(key) {
        const [year, month] = key.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-ZA', {month:'short', year:'numeric', timeZone:'UTC'});
    }
    function shiftMonth(key, offset) {
        const [year, month] = key.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1 + offset, 1));
        return date.toISOString().slice(0,7);
    }
    function project(series, origin, horizon) {
        // Same month one year earlier, using only information available at origin.
        return Array.from({length:horizon}, (_,i) => {
            const month = shiftMonth(origin, i+1), source = shiftMonth(month, -12);
            const point = source <= origin ? series.find(p => p.month === source) : null;
            return {month, source, value: point?.value ?? null, count: point?.count ?? 0};
        });
    }
    function mean(values) {
        const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v));
        return valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : null;
    }
    async function load() {
        const responses = await Promise.all([fetch('../data/ncd-mock-monthly-2025-2026.csv'), fetch('../data/ncd-mock-reference-2026.json')]);
        if (responses.some(r => !r.ok)) throw new Error('The synthetic data or reference could not load.');
        const parsed = Papa.parse(await responses[0].text(), {header:true, skipEmptyLines:true});
        if (parsed.errors.length) throw new Error('The synthetic CSV could not be parsed.');
        const reference = await responses[1].json();
        const rows = parsed.data.filter(r => r.Synthetic === 'true' && r.Period_Start);
        if (!rows.length) throw new Error('No synthetic records available.');
        const cache = new WeakMap();
        return {rows, score(row) {
            if (!cache.has(row)) cache.set(row, NcdDemo.scores(row, reference));
            return cache.get(row);
        }};
    }
    function options(select, values, allLabel) {
        const previous = select.value;
        select.replaceChildren();
        if (allLabel) select.add(new Option(allLabel, ''));
        values.forEach(v => select.add(new Option(v.label ?? v, v.value ?? v)));
        if ([...select.options].some(o => o.value === previous)) select.value = previous;
    }
    function download(rows, filename) {
        const csv = Papa.unparse(rows, {escapeFormulae:true});
        const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type:'text/csv;charset=utf-8;'}));
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 1000);
    }
    const api = {monthLabel, shiftMonth, project, mean, load, options, download};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NcdAnalysis = api;
})(typeof window === 'undefined' ? this : window);
