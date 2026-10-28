/* Monthly synthetic demonstration only. Production daily scoring stays disabled. */
(function (root) {
    const fields = {pollution: 'PM25_ug_m3', heat: 'Max_Air_Temp_C', cold: 'Min_Air_Temp_C'};
    function number(value) {
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    function percentile(value, reference) {
        const n = number(value);
        if (n === null || !Array.isArray(reference) || !reference.length || reference.some(v => number(v) === null)) return null;
        return reference.filter(v => Number(v) <= n).length / reference.length;
    }
    function scores(row, manifest) {
        const empty = {pollution: null, heat: null, cold: null};
        if (!manifest || manifest.synthetic !== true || manifest.temporal_support !== 'monthly' ||
            row.Synthetic !== 'true' || row.Temporal_Support !== 'monthly' || row.Reference_Version !== manifest.version ||
            number(row.Spatial_Coverage) !== 1 || number(row.Valid_Days) === null ||
            number(row.Valid_Days) !== number(row.Expected_Days) || number(row.Valid_Days) < 28) return empty;
        const ref = manifest.references && manifest.references[row.Reference_Key];
        const period = /^(2025|2026)-(0[1-9]|1[0-2])-01$/.exec(row.Period_Start || '');
        if (!ref || ref.Province !== row.Province || !period || Number(period[2]) !== ref.month_number) return empty;
        const result = {};
        for (const [component, field] of Object.entries(fields)) {
            const n = number(row[field]);
            const p = percentile(n, ref[field]);
            result[component] = p === null || (component === 'pollution' && n < 0) ? null :
                100 * (component === 'pollution' ? p : Math.max(0, Math.min(1,
                    component === 'heat' ? 10 * p - 9 : 1 - 10 * p)));
        }
        return result;
    }
    function average(rows, component, manifest) {
        const values = rows.map(row => scores(row, manifest)[component]).filter(v => typeof v === 'number' && Number.isFinite(v));
        return {value: values.length ? values.reduce((a,b) => a+b, 0)/values.length : null, count: values.length};
    }
    // Match malaria's display bands; these are prototype exposure bands, not clinical thresholds.
    function scoreBand(value) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
            return {label: 'Unavailable', color: '#94a3b8'};
        if (value >= 50) return {label: 'High', color: '#d93025'};
        if (value >= 25) return {label: 'Moderate', color: '#f9bb06'};
        return {label: 'Low', color: '#34a853'};
    }
    const api = {percentile, scores, average, scoreBand};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NcdDemo = api;
})(typeof window === 'undefined' ? this : window);
