#!/usr/bin/env python3
"""Parse the Wikipedia wikitext of a Strictly Come Dancing series page into history JSON.

Usage: python3 scripts/parse_series.py <wikitext.txt> <history.json>
Used by scripts/update_series_data.py (see routines/update-series-data.md)."""
import json, re, sys, datetime

SRC = sys.argv[1]
OUT = sys.argv[2]
text = open(SRC, encoding="utf-8").read()
warnings = []

def strip_wiki(s):
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"\{\{efn[^}]*\}\}", "", s)
    s = re.sub(r"\{\{nowrap\|(.*?)\}\}", r"\1", s)
    s = re.sub(r"\{\{fontcolor\|[^|]*\|(.*?)\}\}", r"\1", s)
    s = re.sub(r"\{\{(double-)?dagger[^}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"<small>|</small>|<br\s*/?>", " ", s)
    s = s.replace("'''", "").replace("''", "")
    return re.sub(r"\s+", " ", s).strip()

def cell_value(line):
    """Strip leading '|' or '!' and any attribute prefix 'attr | value'."""
    v = line[1:]
    # attribute part: contains '=' before a single '|' not part of [[..|..]] / {{..|..}}
    depth = 0
    for i, ch in enumerate(v):
        if ch in "[{": depth += 1
        elif ch in "]}": depth -= 1
        elif ch == "|" and depth == 0:
            if "=" in v[:i] and "[[" not in v[:i]:
                return v[:i].strip(), v[i+1:]
            break
    return "", v

def section(title_regex, nxt=r"\n==?=?[^=]"):
    m = re.search(title_regex, text)
    if not m: return None, None
    start = m.end()
    m2 = re.search(r"\n=+[^=\n]+=+\s*\n", text[start:])
    return m, text[start: start + m2.start() if m2 else len(text)]

def table_rows(block):
    """Return list of rows; each row = (header_cell, [cells]) using '|-' separators."""
    tm = re.search(r"\{\|.*?\n\|\}", block, re.S)
    if not tm: return []
    rows, cur = [], None
    for line in tm.group(0).split("\n")[1:-1]:
        if line.startswith("|-"):
            if cur: rows.append(cur)
            cur = {"head": None, "cells": []}
            continue
        if cur is None: cur = {"head": None, "cells": []}
        if line.startswith("|+"): continue
        if line.startswith("!"):
            attr, v = cell_value(line)
            if 'scope="row"' in line:
                cur["head"] = strip_wiki(v)
            else:
                cur.setdefault("colheads", []).append(strip_wiki(v))
        elif line.startswith("|"):
            attr, v = cell_value(line)
            cur["cells"].append((attr, v.strip()))
    if cur: rows.append(cur)
    return rows

# ---- Couples ----
_, cblock = section(r"==Couples==")
couples = {}  # short -> dict
for r in table_rows(cblock):
    if not r["head"]: continue
    celeb = r["head"]
    cells = [strip_wiki(v) for a, v in r["cells"]]
    pro = cells[1]
    status = cells[2]
    couples[celeb] = {"celebrity": celeb, "pro": pro, "status": status}

def first(n): return n.split()[0]
short_map = {f"{first(c)} & {first(v['pro'])}": v for c, v in couples.items()}

def resolve(short):
    short = short.strip()
    if short in short_map: return short_map[short]
    warnings.append(f"Could not resolve couple short name '{short}'")
    return {"celebrity": short, "pro": ""}

# ---- Scoring chart ----
_, sblock = section(r"==Scoring chart==")
rows = table_rows(sblock)
colheads = []
for r in rows:
    if r.get("colheads"): colheads += r["colheads"]
week_cols = [h for h in colheads if re.fullmatch(r"\d+(\+\d+)?", h)]
chart = {}  # short -> {weeklabel: (value, attr)}
for r in rows:
    if not r["head"]: continue
    cells = r["cells"]
    # first cell is Place
    data = cells[1:]
    vals, idx = {}, 0
    for attr, v in data:
        span = 1
        m = re.search(r'colspan="(\d+)"', attr)
        if m: span = int(m.group(1))
        for _ in range(span):
            if idx < len(week_cols):
                vals[week_cols[idx]] = (strip_wiki(v), attr)
            idx += 1
    chart[r["head"]] = vals

# ---- Weekly sections ----
order_note = re.search(r"listed in this order from left to right: (.*?)''", text)
judge_order = ["craig", "motsi", "shirley", "anton"]
if order_note:
    names = [strip_wiki(x) for x in order_note.group(1).split(",")]
    keymap = {"Craig": "craig", "Motsi": "motsi", "Shirley": "shirley", "Anton": "anton"}
    judge_order = [keymap[n.split()[0]] for n in names]
else:
    warnings.append("Judge order note not found; assumed Craig, Motsi, Shirley, Anton")

weeks, dances, upcoming, eliminations = [], [], [], []
week_heads = list(re.finditer(r"\n=+\s*Week (\d+)(?::\s*([^=]+?))?\s*=+\s*\n", text))
first_show = datetime.date(2026, 9, 26)
for i, wm in enumerate(week_heads):
    wk = int(wm.group(1)); theme = (wm.group(2) or "").strip()
    end = week_heads[i+1].start() if i + 1 < len(week_heads) else text.index("\n==Dance chart==")
    block = text[wm.end():end]
    if "unless indicated otherwise" in block.lower() or re.search(r"order from left to right", block):
        warnings.append(f"Week {wk}: has its own judge-order note; check")
    # date from score ref (Guardian URL /2026/oct/03/ or cite date)
    date = ""
    m = re.search(r"Week%dScores\">.*?url=\S*?/(\d{4})/(\d{2})/(\d{2})/" % wk, block, re.S)
    m2 = re.search(r"Week%dScores\">.*?url=\S*?/(\d{4})/([a-z]{3})/(\d{2})/" % wk, block, re.S)
    if m2:  # month-name URLs (Guardian) first; numeric ones may be archive.org timestamps
        mon = datetime.datetime.strptime(m2.group(2), "%b").month
        date = f"{m2.group(1)}-{mon:02d}-{m2.group(3)}"
    elif m:
        date = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    inferred = (first_show + datetime.timedelta(days=7 * (wk - 1))).isoformat()
    if not date:
        date = inferred
        warnings.append(f"Week {wk}: show date not in a source URL; inferred {date} (weekly Saturdays from 2026-09-26)")
    elif date != inferred:
        warnings.append(f"Week {wk}: source date {date} differs from Saturday pattern {inferred}")
    weeks.append({"week": wk, "theme": theme, "date": date})

    # casting vote / judges' votes / bye info
    cast = re.search(r"\[\[([^\]]+)\]\] had the casting vote", block)
    votes_m = re.search(r"Judges' votes to (save|eliminate)'*\s*(?:<ref[^>]*/?>)?\s*\n((?:\*.*\n?)+)", block)
    votes_txt = ""
    if votes_m:
        votes_txt = f"Judges' votes to {votes_m.group(1)}: " + "; ".join(
            strip_wiki(l.lstrip("* ").strip()) for l in votes_m.group(2).strip().split("\n"))

    rows = table_rows(block)
    colheads = []
    for r in rows:
        if r.get("colheads"): colheads += r["colheads"]
    colheads = colheads[1:]  # drop 'Couple'
    performed = set()
    for r in rows:
        if not r["head"]: continue
        short = r["head"]; c = resolve(short); performed.add(short)
        rec = {}
        for h, (attr, v) in zip(colheads, r["cells"]):
            rec[h] = strip_wiki(v)
        sc = rec.get("Scores", "")
        music = rec.get("Music", "").replace(" — ", " – ")
        extra = []
        for k in ("Film", "Icon"):
            if rec.get(k): extra.append(f"{k}: {rec[k]}")
        if not sc:
            upcoming.append({"week": wk, "celebrity": c["celebrity"], "pro": c["pro"],
                             "dance": rec.get("Dance", ""), "music": music,
                             "notes": "; ".join(extra)})
            continue
        sm = re.fullmatch(r"(\d+)\s*\(([\d,\s]+)\)", sc)
        if not sm:
            warnings.append(f"Week {wk} {short}: unparseable score '{sc}'"); continue
        total = int(sm.group(1)); indiv = [int(x) for x in sm.group(2).split(",")]
        if len(indiv) != 4:
            warnings.append(f"Week {wk} {short}: expected 4 judge scores, got {indiv}")
        scores = dict(zip(judge_order, indiv))
        if sum(indiv) != total:
            warnings.append(f"Week {wk} {short}: judges sum {sum(indiv)} != stated total {total}")
        # compare with scoring chart
        cv = chart.get(short, {}).get(str(wk))
        if cv is None or not re.search(r"\d+", cv[0] or ""):
            warnings.append(f"Week {wk} {short}: no total in scoring chart")
        elif int(re.search(r"\d+", cv[0]).group()) != total:
            warnings.append(f"Week {wk} {short}: scoring chart {cv[0]} != week table {total}")
        notes = list(extra)
        res = rec.get("Result", "")
        if res and res != "Safe":
            notes.append(res)
            if res.startswith("Bottom") and votes_txt:
                notes.append("dance-off")
        if res == "Eliminated":
            notes.append("dance-off" if "dance-off" not in notes else "")
            eliminations.append({"week": wk, "celebrity": c["celebrity"], "pro": c["pro"]})
        if res.startswith(("Bottom", "Eliminated")) and votes_txt:
            notes.append(votes_txt)
        dances.append({"week": wk, "celebrity": c["celebrity"], "pro": c["pro"],
                       "dance": rec.get("Dance", ""), "music": music,
                       "scores": scores, "total": total,
                       "notes": "; ".join(n for n in notes if n)})
    # excused couples (bye) from chart cells with fff383
    for short, vals in chart.items():
        cv = vals.get(str(wk))
        if cv and "fff383" in cv[1]:
            c = resolve(short)
            warnings.append(f"Week {wk}: {c['celebrity']} & {c['pro']} excused (bye) – no dance scored")
            weeks[-1].setdefault("excused", []).append(f"{c['celebrity']} & {c['pro']}")
    if cast:
        weeks[-1]["castingVote"] = strip_wiki(cast.group(1))
    # chart couples with a numeric total this week but missing from the week table
    for short, vals in chart.items():
        cv = vals.get(str(wk))
        if cv and re.fullmatch(r"\d+", cv[0]) and short not in performed:
            warnings.append(f"Week {wk}: {short} has chart total {cv[0]} but no row in week table")

# elimination dates from Couples table
for e in eliminations:
    st = couples[e["celebrity"]]["status"]
    dm = re.search(r"on (\d{1,2} \w+ \d{4})", st)
    e["date"] = datetime.datetime.strptime(dm.group(1), "%d %B %Y").date().isoformat() if dm else ""
for c in couples.values():
    if c["status"].startswith("Eliminated") and c["celebrity"] not in {e["celebrity"] for e in eliminations}:
        warnings.append(f"Couples table says {c['celebrity']} eliminated but no week table marks it")

# 1+2 combined column check
for short, vals in chart.items():
    try:
        a, b, ab = (int(re.search(r"\d+", vals[k][0]).group()) for k in ("1", "2", "1+2"))
        if a + b != ab: warnings.append(f"{short}: week1+week2 {a}+{b} != combined {ab}")
    except (KeyError, AttributeError):
        pass

scored_weeks = sorted({d["week"] for d in dances})
last_completed = max(scored_weeks)
if upcoming:
    warnings.append(f"Week {upcoming[0]['week']}: {len(upcoming)} dances announced but not yet scored; "
                    "excluded from 'dances', listed under 'upcoming'")
warnings.append("No dance-off songs/dances are listed on the page; dance-off notes give judges' votes only")
warnings.append("Week 1 had no elimination; week 2 elimination was decided on combined weeks 1+2")

out = {"series": 24, "lastCompletedWeek": last_completed, "weeks": weeks, "dances": dances,
       "eliminations": eliminations, "upcoming": upcoming, "parseWarnings": warnings}
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# summary
print("lastCompletedWeek", last_completed, "dances", len(dances), "upcoming", len(upcoming))
for w in weeks:
    n = sum(1 for d in dances if d["week"] == w["week"])
    print(f"  week {w['week']}: {w['theme']!r} {w['date']} dances={n} {w.get('excused','')} cast={w.get('castingVote','')}")
for e in eliminations: print("  elim", e)
print("WARNINGS:"); [print("  -", x) for x in warnings]
