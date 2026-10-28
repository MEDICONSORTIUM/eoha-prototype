(async function () {
    const $ = id => document.getElementById(id);
    const status = $('report-status');
    let data, filtered = [], page = 0, sort = 'Period_Start', direction = 1;
    let riskFilter='all';
    const size = 25, keys = ['Period_Start','WardLabel','Municipali','Province','PM25_ug_m3','pollution','heat','cold'];
    const value = (row,key) => ['pollution','heat','cold'].includes(key) ? data.score(row)[key] : key === 'PM25_ug_m3' ? NcdData.number(row[key]) : row[key];
    function municipalities() {
        NcdAnalysis.options($('municipality'), [...new Set(data.rows.filter(r => !$('province').value || r.Province === $('province').value).map(r=>r.Municipali))].sort(), 'All municipalities');
    }
    function render() {
        const start = page * size;
        $('report-body').replaceChildren();
        filtered.slice(start, start+size).forEach(row => {
            const tr = document.createElement('tr');
            keys.forEach(key => {
                const td = document.createElement('td'), v = value(row,key);
                td.textContent = key === 'Period_Start' ? NcdAnalysis.monthLabel(v.slice(0,7)) : v === null ? 'Unavailable' : typeof v === 'number' ? v.toFixed(1) : v;
                tr.append(td);
            });
            $('report-body').append(tr);
        });
        if (!filtered.length) {
            const tr=document.createElement('tr'), td=document.createElement('td');td.colSpan=8;td.textContent='No records match these filters.';tr.append(td);$('report-body').append(tr);
        }
        status.textContent = filtered.length ? `Showing ${start+1}-${Math.min(start+size,filtered.length)} of ${filtered.length.toLocaleString()} synthetic ward-month records` : 'No matching records';
        $('previous-page').disabled = page === 0; $('next-page').disabled = start+size >= filtered.length;
        $('export-report').disabled = !filtered.length;
    }
    function update() {
        const search=$('ward-search').value.trim().toLowerCase();
        filtered=data.rows.filter(r=>(!$('month').value || r.Period_Start.startsWith($('month').value)) &&
            (!$('province').value || r.Province===$('province').value) && (!$('municipality').value || r.Municipali===$('municipality').value) &&
            (!search || (r.WardLabel+' '+r.WardID).toLowerCase().includes(search)) && (riskFilter==='all'||NcdDemo.scoreBand(data.score(r)[$('component').value]).label.toLowerCase()===riskFilter));
        filtered.sort((a,b)=>{
            const av=value(a,sort),bv=value(b,sort);
            if(av===null) return bv===null?0:1;if(bv===null)return -1;
            return direction*(typeof av==='number'?av-bv:String(av).localeCompare(String(bv)));
        });
        page=0;
        $('records-total').textContent=filtered.length.toLocaleString();
        $('wards-total').textContent=new Set(filtered.map(r=>r.WardID)).size.toLocaleString();
        for(const key of ['pollution','heat','cold']) {
            const avg=NcdAnalysis.mean(filtered.map(r=>data.score(r)[key]));
            $('mean-'+key).textContent=avg===null?'Unavailable':avg.toFixed(1)+' pts';
        }
        const values=filtered.map(r=>data.score(r)[$('component').value]);
        for(const [id,label] of [['stat-high','High'],['stat-mod','Moderate'],['stat-low','Low']]) $(id).textContent=values.filter(v=>NcdDemo.scoreBand(v).label===label).length.toLocaleString();
        const selectedMean=NcdAnalysis.mean(values);$('mean-selected').textContent=selectedMean===null?'Unavailable':selectedMean.toFixed(1)+' pts';
        $('report-month').textContent=$('month').selectedOptions[0]?.textContent||'All months';
        render();
    }
    $('previous-page').onclick=()=>{if(page>0){page--;render();}};
    $('next-page').onclick=()=>{if((page+1)*size<filtered.length){page++;render();}};
    $('export-report').onclick=()=>NcdAnalysis.download(filtered.map(r=>({
        Month:r.Month,WardID:r.WardID,Ward:r.WardLabel,Municipality:r.Municipali,Province:r.Province,
        PM25_ug_m3:r.PM25_ug_m3,Pollution_Points:data.score(r).pollution,Heat_Points:data.score(r).heat,Cold_Points:data.score(r).cold,
        Synthetic:'true',Temporal_Support:'monthly',Reference_Version:r.Reference_Version
    })), 'EOHA-NCD-synthetic-report.csv');
    document.querySelectorAll('[data-sort]').forEach(button=>button.onclick=()=>{
        const key=button.dataset.sort;direction=sort===key?-direction:1;sort=key;
        document.querySelectorAll('th').forEach(th=>th.removeAttribute('aria-sort'));
        button.parentElement.setAttribute('aria-sort',direction===1?'ascending':'descending');update();
    });
    async function init() {
        $('retry').hidden=true;status.textContent='Loading synthetic records...';
        try {
            data=await NcdAnalysis.load();
            const months=[...new Set(data.rows.map(r=>r.Period_Start.slice(0,7)))].sort();
            NcdAnalysis.options($('month'),months.map(m=>({value:m,label:NcdAnalysis.monthLabel(m)})),'All months');$('month').value=months[months.length-1];
            NcdAnalysis.options($('province'),[...new Set(data.rows.map(r=>r.Province))].sort(),'All provinces');municipalities();
            document.querySelectorAll('.filter-bar input,.filter-bar select,.filter-bar button,[data-sort]').forEach(el=>el.disabled=false);
            $('province').onchange=()=>{municipalities();update();};
            $('municipality').onchange=$('month').onchange=update;
            let timer;$('ward-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,200);};
            $('reset-filters').onclick=()=>{riskFilter='all';document.querySelectorAll('[data-risk]').forEach(b=>b.classList.toggle('active',b.dataset.risk==='all'));$('month').value=months[months.length-1];$('province').value='';$('municipality').value='';$('ward-search').value='';municipalities();update();};
            const params = new URLSearchParams(location.search);
            for (const id of ['province','municipality','component']) {
                const el=$(id), value=params.get(id);
                if(el && value && [...el.options].some(o=>o.value===value)) {el.value=value;if(id==='province')municipalities();}
            }
            const chosen=params.get('month'); const option=[...$('month').options].find(o=>o.textContent===chosen); if(option)$('month').value=option.value;
            update();
        }catch(error){status.textContent=error.message+' Please retry.';$('retry').hidden=false;}
    }
    $('component').onchange=update;
    $('export-btn').onclick=()=>$('export-report').click();
    document.querySelectorAll('[data-risk]').forEach(button=>button.onclick=()=>{
        riskFilter=button.dataset.risk;
        document.querySelectorAll('[data-risk]').forEach(b=>b.classList.toggle('active',b===button));update();
    });
    $('retry').onclick=init;init();
})();
