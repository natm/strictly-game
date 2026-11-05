#!/usr/bin/env python3
"""Refresh data/series2026.js from Wikipedia: scores, dances, week themes and eliminations.

Keeps the hand-made parts of the data file (cartoon looks, photos, facts) untouched.
Usage:  python3 scripts/update_series_data.py [--page "Strictly_Come_Dancing_series_24"] [--dry-run]
Prints a short summary and exits 0. Prints "NO CHANGE" when Wikipedia has nothing new.
"""
import argparse, json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'series2026.js')
UA = 'strictly-game/1.0 (https://github.com/natm/strictly-game)'
JUDGES = ['craig', 'motsi', 'shirley', 'anton']   # game order

def fetch(page):
    url = f'https://en.wikipedia.org/w/index.php?title={page}&action=raw'
    for attempt in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read().decode('utf8')
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(10 * (attempt + 1)); continue
            raise
    sys.exit('Wikipedia kept rate-limiting (HTTP 429); try again later')

def load_data():
    src = open(DATA, encoding='utf8').read()
    head, body = src.split('window.SERIES_2026=', 1)
    return head, json.loads(body.strip().rstrip(';'))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--page', default='Strictly_Come_Dancing_series_24')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    head, data = load_data()
    with tempfile.TemporaryDirectory() as tmp:
        wt, hj = os.path.join(tmp, 'page.txt'), os.path.join(tmp, 'history.json')
        open(wt, 'w', encoding='utf8').write(fetch(a.page))
        subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'scripts', 'parse_series.py'), wt, hj], check=True, stdout=subprocess.DEVNULL)
        h = json.load(open(hj, encoding='utf8'))
    dances = [[d['week'], d['celebrity'], d['pro'], d['dance'], [d['scores'][k] for k in JUDGES]] for d in h['dances']]
    bad = [d for d in h['dances'] if sum(d['scores'].values()) != d['total']]
    if bad: sys.exit(f'Refusing to update: {len(bad)} dances whose judge scores do not add up to the total')
    new = dict(data)
    new['afterWeek'] = h['lastCompletedWeek']
    new['weekThemes'] = {str(w['week']): w.get('theme', '') for w in h['weeks']}
    new['dances'] = dances
    new['eliminated'] = [[e['week'], e['celebrity'], e['pro']] for e in h['eliminations']]
    # dances announced for the coming week (Wikipedia lists them after the results show), so the game can pre-fill them
    new['upcoming'] = [[u['week'], u['celebrity'], u['pro'], u.get('dance', ''), u.get('music', '')] for u in h.get('upcoming', [])]
    old_keys = {(d[0], d[1]) for d in data['dances']}
    added = [d for d in dances if (d[0], d[1]) not in old_keys]
    out_now = {e[1] for e in new['eliminated']} - {e[1] for e in data.get('eliminated', [])}
    print(f"afterWeek {data['afterWeek']} -> {new['afterWeek']}; {len(added)} new scored dances; newly eliminated: {', '.join(sorted(out_now)) or 'none'}; {len(new['upcoming'])} announced dances for next week")
    for d in added: print(f"  W{d[0]} {d[1]} & {d[2]}: {d[3]} {d[4]} = {sum(d[4])}")
    if json.dumps(new, sort_keys=True) == json.dumps(data, sort_keys=True):
        print('NO CHANGE'); return
    for w in h.get('parseWarnings', []): print('  warning:', w)
    if a.dry_run: print('(dry run, nothing written)'); return
    open(DATA, 'w', encoding='utf8').write(head + 'window.SERIES_2026=' + json.dumps(new, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('wrote', os.path.relpath(DATA, ROOT))

if __name__ == '__main__':
    main()
