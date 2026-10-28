(async function () {
    const $=id=>document.getElementById(id);
    let data, chart, projection=[];
    function update() {
        const component=$('component').value,origin=$('origin').value;
        const rows=data.rows.filter(r=>(!$('province').value||r.Province===$('province').value)&&(!$('municipality').value||r.Municipali===$('municipality').value));
        const groups=new Map();
        rows.forEach(row=>{const key=row.Period_Start.slice(0,7);if(key>origin)return; if(!groups.has(key))groups.set(key,[]);groups.get(key).push(data.score(row)[component]);});
        const series=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([month,values])=>({month,value:NcdAnalysis.mean(values),count:values.filter(v=>v!==null).length}));
        const history=series.filter(p=>p.month>=NcdAnalysis.shiftMonth(origin,-11));
        projection=NcdAnalysis.project(series,origin,Number($('horizon').value));
        const points=[...history,...projection];
        const tokens=getComputedStyle(document.documentElement),primary=tokens.getPropertyValue('--primary').trim()||'#1565c0';
        if(chart)chart.destroy();
        if(typeof Chart!=='undefined') chart=new Chart($('forecastChart'),{type:'line',data:{labels:points.map(p=>NcdAnalysis.monthLabel(p.month)),datasets:[
            {label:'Synthetic input history',data:[...history.map(p=>p.value),...projection.map(()=>null)],borderColor:primary,backgroundColor:primary,tension:0,spanGaps:false},
            {label:'Seasonal demo projection',data:[...history.map((p,i)=>i===history.length-1?p.value:null),...projection.map(p=>p.value)],borderColor:primary,backgroundColor:primary,borderDash:[6,5],tension:0,spanGaps:false}
        ]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{labels:{color:tokens.getPropertyValue('--text-primary').trim()}}},scales:{y:{min:0,max:100,title:{display:true,text:'Exposure points / 100'},ticks:{color:tokens.getPropertyValue('--text-primary').trim()}},x:{ticks:{color:tokens.getPropertyValue('--text-primary').trim()}}}}});
        $('forecast-body').replaceChildren();
        projection.forEach(p=>{const tr=document.createElement('tr');[NcdAnalysis.monthLabel(p.month),p.value===null?'Unavailable':p.value.toFixed(1),NcdAnalysis.monthLabel(p.source),p.count.toLocaleString()].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});$('forecast-body').append(tr);});
        const avg=NcdAnalysis.mean(projection.map(p=>p.value));
        $('forecast-mean').textContent=avg===null?'Unavailable':avg.toFixed(1)+' points';
        $('forecast-status').textContent=`${$('component').selectedOptions[0].textContent} | ${$('municipality').value||$('province').value||'All South African wards'} | As of ${NcdAnalysis.monthLabel(origin)}. Synthetic seasonal demonstration.`+(typeof Chart==='undefined'?' Chart unavailable; use the table below.':'');
        const valid=projection.filter(p=>p.value!==null), peak=valid.reduce((a,b)=>!a||b.value>a.value?b:a,null);
        $('range-label').textContent='Next '+$('horizon').value+' Months';
        $('ci-upper').textContent=valid.length?Math.max(...valid.map(p=>p.value)).toFixed(1):'Unavailable';
        $('ci-lower').textContent=valid.length?Math.min(...valid.map(p=>p.value)).toFixed(1):'Unavailable';
        $('ci-mean').textContent=avg===null?'Unavailable':avg.toFixed(1);
        $('ci-bar').style.width=(avg||0)+'%';
        $('peak-day').textContent=peak?NcdAnalysis.monthLabel(peak.month):'Unavailable';
        $('peak-pct').textContent=peak?peak.value.toFixed(1)+' points / 100':'No available projection';
        const change=valid.length>1?valid.at(-1).value-valid[0].value:0;
        $('trend-arrow').textContent=change>0?'↗':change<0?'↘':'→';
        $('trend-text').textContent=change>0?'Increasing':change<0?'Decreasing':'Stable';
        $('trend-detail').textContent='Synthetic exposure over the selected window';
        $('export-forecast').disabled=!projection.some(p=>p.value!==null);
    }
    function municipalities() {
        NcdAnalysis.options($('municipality'),[...new Set(data.rows.filter(r=>!$('province').value||r.Province===$('province').value).map(r=>r.Municipali))].sort(),'All municipalities');
    }
    $('export-forecast').onclick=()=>NcdAnalysis.download(projection.map(p=>({
        Month:NcdAnalysis.monthLabel(p.month),Component:$('component').value,Province:$('province').value||'All',Municipality:$('municipality').value||'All',
        Projection_Points:p.value,Source_Month:p.source,Valid_Wards:p.count,As_Of:$('origin').value,Synthetic:'true',Method:'Seasonal naive demonstration; not validated'
    })),'EOHA-NCD-synthetic-projection.csv');
    async function init(){
        $('retry').hidden=true;$('forecast-status').textContent='Loading synthetic data...';
        try{
            data=await NcdAnalysis.load();
            const months=[...new Set(data.rows.map(r=>r.Period_Start.slice(0,7)))].sort();
            const origins=months.filter(m=>months.includes(NcdAnalysis.shiftMonth(m,-11)));
            NcdAnalysis.options($('origin'),origins.map(m=>({value:m,label:NcdAnalysis.monthLabel(m)})));$('origin').value=origins[origins.length-1];
            NcdAnalysis.options($('province'),[...new Set(data.rows.map(r=>r.Province))].sort(),'All provinces');municipalities();
            document.querySelectorAll('select').forEach(el=>el.disabled=false);
            $('province').onchange=()=>{municipalities();update();};
            for(const id of ['municipality','origin','horizon','component'])$(id).onchange=update;
            const params = new URLSearchParams(location.search);
            for (const id of ['province','municipality','component']) {
                const el=$(id), value=params.get(id);
                if(el && value && [...el.options].some(o=>o.value===value)) {el.value=value;if(id==='province')municipalities();}
            }
            update();
        }catch(error){$('forecast-status').textContent=error.message+' Please retry.';$('retry').hidden=false;}
    }
    document.querySelectorAll('[data-months]').forEach(button=>button.onclick=()=>{
        $('horizon').value=button.dataset.months;
        document.querySelectorAll('[data-months]').forEach(b=>b.classList.toggle('active',b===button));
        if(data)update();
    });
    $('retry').onclick=init;window.addEventListener('eoha:themechange',()=>{if(data)update();});init();
})();
