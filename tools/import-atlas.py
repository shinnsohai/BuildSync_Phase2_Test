#!/usr/bin/env python3
"""Turn the Course Atlas data files into the slim snapshot BuildSync loads (data/atlas.js).

Course Atlas (https://course-atlas-sg-shinn.shinnsohai.chatgpt.site/) publishes crawled training intakes as static JSON:
  data/courses.json    ~18 MB, one record per intake (provider, title, session dates, venue, language, fee, reported seats, registration link)
  data/locations.json  venues with coordinates (OpenStreetMap, ODbL) and the text patterns that match them to a course record's venue
  data/providers.json  provider register entries
  data/metadata.json   when the snapshot was taken, and its limits

Usage:
  python tools/import-atlas.py --fetch                      # download the four files from Course Atlas, then convert
  python tools/import-atlas.py --from path/to/folder        # convert files you already downloaded
Options:
  --base URL   Course Atlas base address (default: the site above)
  --out FILE   output (default: data/atlas.js, next to this tool's parent folder)

What is kept (the file stays under ~1 MB): intakes that Course Atlas tags construction or PCM, plus intakes whose title matches a construction-site course
(CSOC, work at height, rigger and signalman, welding, forklift, confined space, scaffold, lifting, boom and scissor lift, excavator, safety coordinator, hot work).
Nothing is invented: a fee that Course Atlas could not read stays empty, a venue it could not place on the map stays unmapped, and the seat numbers are the provider's
reports on the day it was crawled, not a reservation.
"""
import argparse, json, os, re, sys, urllib.request
from collections import Counter, defaultdict

BASE = 'https://course-atlas-sg-shinn.shinnsohai.chatgpt.site'
FILES = ['courses', 'locations', 'providers', 'metadata']
RELEVANT = re.compile(r'CSOC|Construction Safety|Work.?at.?Height|\bWAH\b|Rigger|Signalman|Weld|Forklift|Confined Space|Scaffold|Lifting|Boom Lift|Scissor Lift|Excavator|Safety Coordinator|Hot Work|Mobile Crane|Lorry Crane|Aerial Work', re.I)
# which certificate type in BuildSync a course renews
CERTS = [('CSOC', re.compile(r'CSOC|Construction Safety Orientation|Apply (?:WSH|Workplace Safety and Health) in Construction', re.I)),
         ('WORK-HEIGHT', re.compile(r'Work.?at.?Height|\bWAH\b', re.I)),
         ('CRANE', re.compile(r'Rigger|Signalman', re.I)),
         ('WELDER', re.compile(r'Weld', re.I))]
NOT_CERT = re.compile(r'Manage|Supervis|Refresher|Instructor|Trainer', re.I)   # a manager's or supervisor's course does not renew the worker certificate
LANG_TOKENS = r'ENG(?:LISH)?|TAM(?:IL)?|BEN(?:GALI)?|MAN(?:DARIN)?|BUR(?:MESE)?|MAL(?:AY)?|CHI(?:NESE)?|HINDI'


def fetch(base, folder):
    os.makedirs(folder, exist_ok=True)
    for n in FILES:
        url = f'{base}/data/{n}.json'; dest = os.path.join(folder, n + '.json'); print('downloading', url)
        with urllib.request.urlopen(url, timeout=120) as r, open(dest, 'wb') as f: f.write(r.read())


def group_key(r):
    """one course = same title once language and variant suffixes are taken off"""
    return clean_title((r.get('short_title') or r['title'] or '').strip()).lower()


def clean_title(t):
    """drop the language (and the course-code-plus-language) suffix from a provider's title"""
    t = re.sub(r'\(\s*(?:%s)\s*\)' % LANG_TOKENS, '', t, flags=re.I)
    t = re.sub(r'\s*[-–]\s*(?:[A-Z]{2,6}\s*[-–]\s*)?(?:%s)(?![A-Za-z]).*$' % LANG_TOKENS, '', t, flags=re.I)
    return re.sub(r'\s+', ' ', t).strip(' -–')


def cert_of(title):
    if NOT_CERT.search(title): return ''
    for c, rx in CERTS:
        if rx.search(title): return c
    return ''


FAMILY = {'CSOC': 'Construction Safety Orientation Course (CSOC / AWSHCS)', 'WORK-HEIGHT': 'Work at Height (WAH)', 'CRANE': 'Rigger and Signalman', 'WELDER': 'Welding'}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from', dest='src'); ap.add_argument('--fetch', action='store_true'); ap.add_argument('--base', default=BASE)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'atlas.js'))
    a = ap.parse_args()
    folder = a.src or os.path.join(os.path.dirname(os.path.abspath(__file__)), '_atlas')
    if a.fetch or not a.src: fetch(a.base, folder)
    def ld(n):
        with open(os.path.join(folder, n + '.json'), encoding='utf-8') as f: return json.load(f)
    courses, locs, provs, meta = ld('courses'), ld('locations'), ld('providers'), ld('metadata')

    patterns = [(l['id'], re.compile(p, re.I)) for l in locs['locations'] for p in l.get('venue_patterns', [])]
    def place(v):
        for lid, rx in patterns:
            if rx.search(v or ''): return lid
        return ''
    prov_names = sorted({r['provider'] for r in courses}); pidx = {n: i for i, n in enumerate(prov_names)}
    pinfo = {p['name']: p for p in provs}

    keep = []
    for r in courses:
        scopes = r.get('industry_scopes') or []
        if not (set(scopes) & {'construction', 'pcm'} or RELEVANT.search(r['title'] or '')): continue
        if not r.get('sessions'): continue
        keep.append(r)

    groups, g_title, g_count = {}, defaultdict(Counter), Counter()
    out = []
    for r in keep:
        title0 = (r.get('short_title') or r['title']).strip(); c0 = cert_of(title0); key = ('cert:' + c0) if c0 else group_key(r)
        g_title[key][clean_title(title0)] += 1; g_count[key] += 1
        fee = None; gst = ''
        for f in r.get('fees') or []:
            if isinstance(f.get('amount'), (int, float)): fee = f['amount']; gst = f.get('gst') or ''; break
        dates = sorted({s['date'] for s in r['sessions'] if s.get('date')})
        both = next((s for s in r['sessions'] if s.get('start_time') and s.get('end_time')), None); t0, t1 = (both['start_time'], both['end_time']) if both and both['end_time'] > both['start_time'] else ('', '')   # a time range only when one session has both ends and they make sense (a few provider records end before they start)
        out.append({'id': r['id'], 'p': pidx[r['provider']], 'g': key, 't': (r.get('short_title') or r['title']).strip(), 'd': dates, 'tm': (t0 + '–' + t1) if t0 and t1 else '', 'v': r.get('venue') or '', 'loc': place(r.get('venue')),
                    'l': r.get('teaching_language') or '', 'f': fee, 'gst': gst, 's': r.get('seats_reported'), 'a': r.get('availability') or 'unknown', 'u': r.get('booking_url') or r.get('course_url') or '',
                    'ck': (r.get('checked_at') or '')[:10], 'ty': r.get('course_type') or '', 'dur': r.get('duration_raw') or '', 'sc': ','.join(r.get('industry_scopes') or []), 'mo': r.get('mode') or ''})
    for key in list(g_title):
        title = g_title[key].most_common(1)[0][0]; cert = key[5:] if key.startswith('cert:') else ''
        if cert: title = FAMILY[cert]
        alias = next((x for r in keep if (('cert:' + cert_of((r.get('short_title') or r['title']).strip())) if cert_of((r.get('short_title') or r['title']).strip()) else group_key(r)) == key for x in (r.get('aliases') or [])), '')
        groups[key] = {'id': key, 'title': title, 'alias': alias, 'cert': cert, 'n': g_count[key]}

    used_prov = sorted({o['p'] for o in out})
    snapshot = {
        'source': a.base + '/', 'generated': (meta.get('crawl_finished_at') or '')[:19], 'checked': meta.get('snapshot_checked_on') or '', 'targetMonth': meta.get('target_month') or '',
        'records': len(out), 'recordsInAtlas': len(courses), 'last': max((d for o in out for d in o['d']), default=''), 'first': min((d for o in out for d in o['d']), default=''),
        'note': meta.get('coverage_note') or '', 'limits': meta.get('limitations') or [], 'attribution': locs.get('coordinate_attribution') or '', 'license': locs.get('coordinate_license_url') or '',
        'providers': [{'name': prov_names[i], 'frameworks': (pinfo.get(prov_names[i]) or {}).get('frameworks') or [], 'site': (pinfo.get(prov_names[i]) or {}).get('website_url') or ''} for i in range(len(prov_names))],
        'locations': [{'id': l['id'], 'provider': l.get('provider'), 'name': l['name'], 'address': l.get('address'), 'lat': l['lat'], 'lng': l['lng'], 'basis': l.get('basis')} for l in locs['locations']],
        'groups': sorted(groups.values(), key=lambda g: -g['n']), 'intakes': out,
    }
    js = '/* Generated by tools/import-atlas.py from Course Atlas; do not edit. Crawled data: seat figures are reports, not reservations. */\nwindow.BS_ATLAS = ' + json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + ';\n'
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as f: f.write(js)
    print(f'kept {len(out)} of {len(courses)} intakes, {len(groups)} courses, {len(used_prov)} providers; {len(js) / 1024:.0f} KB -> {a.out}')
    print('with fee:', sum(1 for o in out if o['f'] is not None), '| on the map:', sum(1 for o in out if o['loc']), '| cert-tagged courses:', Counter(g['cert'] for g in groups.values() if g['cert']))


if __name__ == '__main__':
    sys.exit(main())
