"""Deterministic synthetic monthly demo inputs; never observational health data."""
import calendar
import csv
import hashlib
import json
import math
import random
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'synthetic-monthly-2026-v2'


def main():
    with (ROOT / 'data/Limpopo_Risk_Jan25_Jan26_Safe.csv').open(newline='', encoding='utf-8-sig') as stream:
        wards = {r['WardID']: r for r in csv.DictReader(stream) if r['Month'] == 'Jan 2026'}
    def finite(value):
        try:
            number=float(value)
            return number if math.isfinite(number) else None
        except (ValueError,TypeError): return None
    anchors={}
    for province in {w['Province'] for w in wards.values()}:
        group=[w for w in wards.values() if w['Province']==province]
        anchors[province]={field:statistics.median([finite(w[field]) for w in group if finite(w[field]) is not None]) for field in ['Air_Temp_C','Population_Density_Per_KM2']}
    def anchored(ward,field):
        value=finite(ward[field])
        return anchors[ward['Province']][field] if value is None else value

    def rng_for(key):
        return random.Random(int(hashlib.sha256(f'{VERSION}|{key}'.encode()).hexdigest()[:16],16))

    def baseline(ward, month):
        # Local January measurement anchors the scenario, not a calibrated climatology.
        anchor = anchored(ward,'Air_Temp_C')
        amplitude = 4.5 + 2 * min(1, abs(float(ward['longitude']) - 30) / 12)
        mean = anchor - amplitude * (1 - math.cos((month-1)*math.pi/6))
        density = max(0, anchored(ward,'Population_Density_Per_KM2'))
        urban = min(1, math.log1p(density)/math.log(10001))
        winter = (1-math.cos((month-1)*math.pi/6))/2
        spread = 4 + 2*(1-urban)
        pollution = (5 + 14*urban) * (1 + .5*winter)
        return mean, spread, pollution, density, winter

    provinces = sorted({r['Province'] for r in wards.values()})
    references = {}
    for province in provinces:
        pool = [w for w in wards.values() if w['Province']==province]
        for month in range(1,13):
            rng=rng_for(f'reference|{province}|{month}')
            samples={k:[] for k in ['PM25_ug_m3','Max_Air_Temp_C','Min_Air_Temp_C']}
            for _ in range(3000):
                mean,spread,pm,_,_=baseline(rng.choice(pool),month)
                anomaly=rng.gauss(0,1.7)
                samples['Max_Air_Temp_C'].append(mean+spread+anomaly)
                samples['Min_Air_Temp_C'].append(mean-spread+anomaly)
                samples['PM25_ug_m3'].append(pm*math.exp(rng.gauss(-.08,.4)))
            references[f'{province}|{month:02}']={'Province':province,'month_number':month,
                **{k:[round(ordered[int(i*len(ordered)/100)],2) for i in range(100)] for k,values in samples.items() for ordered in [sorted(values)]}}
    manifest={'version':VERSION,'synthetic':True,'temporal_support':'monthly',
        'description':'Fixed model-generated province/month references; scenario distributions, not calibrated observations.',
        'references':references}
    (ROOT/'data/ncd-mock-reference-2026.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    fields = ['Month', 'Period_Start', 'Period_End', 'WardID', 'WardLabel', 'Municipali', 'Province', 'latitude', 'longitude',
              'Air_Temp_C', 'LST_Surface_C', 'Population_Density_Per_KM2', 'PM25_ug_m3', 'Max_Air_Temp_C',
              'Min_Air_Temp_C', 'Relative_Humidity_Pct', 'Valid_Days', 'Expected_Days', 'Spatial_Coverage',
              'Synthetic', 'Temporal_Support', 'Reference_Version', 'Reference_Key', 'Source']
    with (ROOT / 'data/ncd-mock-monthly-2025-2026.csv').open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for year, month in ((year, month) for year in (2025, 2026) for month in range(1, 13)):
            for ward_id, ward in sorted(wards.items()):
                rng=rng_for(f'{ward_id}|{year}|{month}')
                key=f"{ward['Province']}|{month:02}"
                mean,spread,pm,density,winter=baseline(ward,month)
                regional=rng_for(f"regional|{ward['Province']}|{year}|{month}").gauss(0,1)
                local=rng_for(f"ward|{ward_id}").gauss(0,.6)
                anomaly=regional+local+rng.gauss(0,.5)
                mean+=anomaly
                high=round(mean+spread+rng.gauss(0,.3),2)
                low=round(mean-spread+rng.gauss(0,.3),2)
                row = {k: ward[k] for k in ['WardID', 'WardLabel', 'Municipali', 'Province', 'latitude', 'longitude']}
                days = calendar.monthrange(year, month)[1]
                row.update(Month=f'{calendar.month_abbr[month]} {year}', Period_Start=f'{year}-{month:02}-01',
                    Period_End=f'{year}-{month+1:02}-01' if month < 12 else f'{year+1}-01-01',
                    Air_Temp_C=round((high+low)/2, 2), LST_Surface_C=round(mean+3+2*winter+rng.gauss(0,.5), 2),
                    Population_Density_Per_KM2=round(density, 2), PM25_ug_m3=round(max(.5,pm*math.exp(local*.3+rng.gauss(-.04,.2))), 2),
                    Max_Air_Temp_C=high, Min_Air_Temp_C=low, Relative_Humidity_Pct=round(max(20,min(90,65-12*winter-2*anomaly+rng.gauss(0,3))), 2),
                    Valid_Days=days-rng.randint(1,5) if rng.random()<.025 else days, Expected_Days=days, Spatial_Coverage=1, Synthetic='true', Temporal_Support='monthly',
                    Reference_Version=VERSION, Reference_Key=key, Source='EOHA synthetic scenario generator v2; January temperature and density anchors from shared CSV')
                writer.writerow(row)
    print(f'Created {len(wards)*24:,} synthetic monthly rows for {len(wards):,} wards and {len(provinces)} provinces.')


if __name__ == '__main__':
    main()
