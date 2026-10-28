/* Shared-CSV measurements only: these helpers do not compute NCD scores. */
(function (root) {
    const fields = ['Air_Temp_C', 'LST_Surface_C', 'Population_Density_Per_KM2'];
    function number(value) {
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const result = Number(value);
        return Number.isFinite(result) ? result : null;
    }
    function filter(rows, selection) {
        if (selection.country !== 'South Africa') return [];
        return rows.filter(row => row.Month === selection.month &&
            (!selection.province || row.Province === selection.province) &&
            (!selection.municipality || row.Municipali === selection.municipality) &&
            (!selection.ward || String(row.WardID) === selection.ward));
    }
    function summarize(rows) {
        return Object.fromEntries(fields.map(field => {
            const values = rows.map(row => number(row[field])).filter(value => value !== null && (field !== 'Population_Density_Per_KM2' || value >= 0));
            return [field, {value: values.length ? values.reduce((a,b) => a+b, 0) / values.length : null, count: values.length}];
        }));
    }
    const api = {number, filter, summarize};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NcdData = api;
})(typeof window === 'undefined' ? this : window);
