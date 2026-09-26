import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
DATA.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "F1-Pulse/1.0 (+https://github.com/prathmesh-pm7/F1-)"}
FEEDS = {
    "fia_news": "https://www.fia.com/rss/news",
    "fia_press": "https://www.fia.com/rss/press-release",
    "f1": "https://www.formula1.com/en/latest/all.xml",
}

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read()

def text(node):
    return re.sub(r"\\s+", " ", re.sub(r"<[^>]+>", " ", node or "")).strip()

def rss_items(raw):
    root = ET.fromstring(raw)
    return [{
        "title": (item.findtext("title") or "").strip(),
        "link": (item.findtext("link") or "").strip(),
        "description": text(item.findtext("description") or ""),
        "publishedAt": (item.findtext("pubDate") or datetime.now(timezone.utc).isoformat()).strip(),
    } for item in root.findall(".//item")]

now = datetime.now(timezone.utc).isoformat()
fia_items = rss_items(fetch(FEEDS["fia_news"])) + rss_items(fetch(FEEDS["fia_press"]))
fia_items = [x for x in fia_items if re.search(r"formula one|formula 1|f1|grand prix|single-seater|world motor sport council|regulation", x["title"] + " " + x["description"], re.I)]
fia_items.sort(key=lambda x: x["publishedAt"], reverse=True)
fia = []
for i, item in enumerate(fia_items[:30]):
    fia.append({
        "id": f"fia-{i}-{item['publishedAt']}",
        "title": item["title"],
        "summary": item["description"] or "Official FIA publication.",
        "source": "FIA",
        "sourceUrl": item["link"],
        "publishedAt": item["publishedAt"],
        "category": "REGULATIONS" if re.search(r"regulation|council|amendment", item["title"], re.I) else "FIA",
        "verified": True,
        "provenance": {"provider": "FIA Official", "sourceUrl": item["link"], "retrievedAt": now, "isLive": False, "isFixture": False, "notes": "Official FIA RSS feed."},
    })

f1 = rss_items(fetch(FEEDS["f1"]))
pattern = re.compile(r"upgrade|technical|floor|diffuser|sidepod|front wing|rear wing|suspension|engine cover|cooling|chassis|power unit|brake duct|aero|car update|new specification", re.I)
teams = [("McLaren","mclaren","#FF8000"),("Mercedes","mercedes","#27F4D2"),("Red Bull","red_bull","#3671C6"),("Ferrari","ferrari","#E8002D"),("Williams","williams","#64C4FF"),("Racing Bulls","rb","#6692FF"),("Aston Martin","aston_martin","#229971"),("Haas","haas","#B6BABD"),("Audi","audi","#BB0A30"),("Alpine","alpine","#0093CC"),("Cadillac","cadillac","#C7C8CA")]
def team_for(s):
    for name, key, color in teams:
        if name.lower() in s.lower():
            return name, color
    return "F1", "#8b929b"

technical = []
for i, item in enumerate([x for x in f1 if pattern.search(x["title"] + " " + x["description"])][:40]):
    combined = (item["title"] + " " + item["description"]).lower()
    team, color = team_for(combined)
    component = "Front Wing" if "front wing" in combined else "Floor & Venturi" if ("floor" in combined or "diffuser" in combined) else "Sidepods" if ("sidepod" in combined or "engine cover" in combined or "cooling" in combined) else "Rear Wing / Beam" if ("rear wing" in combined or "beam" in combined) else "Brake Ducts" if "brake duct" in combined else "Suspension" if "suspension" in combined else "Power Unit" if ("power unit" in combined or "engine" in combined) else "Chassis & Weight"
    update_type = "Weight Saving" if ("weight" in combined or "lighter" in combined or "chassis" in combined) else "Cooling" if "cooling" in combined else "Reliability" if ("reliability" in combined or "failure" in combined or "problem" in combined) else "Aerodynamic"
    technical.append({
        "id": f"technical-{i}-{item['publishedAt']}",
        "team": team, "teamColor": color, "component": component, "updateType": update_type,
        "weekend": "RECENT", "submissionDate": item["publishedAt"][:10], "summary": item["title"],
        "technicalDescription": item["description"] or "See the original Formula 1 publication.",
        "source": "Formula 1", "sourceUrl": item["link"], "status": "REPORTED",
        "provenance": {"provider": "Curated Technical", "sourceUrl": item["link"], "retrievedAt": now, "isLive": False, "isFixture": False, "notes": "Official Formula 1 technical/news publication; not an FIA filing."},
    })

(DATA / "fia-news.json").write_text(json.dumps(fia, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
(DATA / "technical-updates.json").write_text(json.dumps(technical, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"refreshed {len(fia)} FIA items and {len(technical)} technical items")
