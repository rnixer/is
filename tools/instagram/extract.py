"""One-time public-post migration. No messages or account data are read."""
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta
import argparse, json, re, hashlib

ROOT = Path(__file__).resolve().parents[2]

def extract(export, since, until):
    source = export / 'your_instagram_activity/media/posts_1.html'
    soup = BeautifulSoup(source.read_text(encoding='utf-8'), 'html.parser')
    products, seen, skipped = [], set(), 0
    for block in soup.select('main > div'):
        heading, date = block.find('h2'), block.select_one('div._a6-o')
        if not heading or not date:
            continue
        # Instagram's exported display time has no offset. Preserve the original
        # text and date; do not invent an exact UTC publication timestamp.
        try:
            posted = datetime.strptime(date.get_text(strip=True), '%b %d, %Y %I:%M %p')
        except ValueError:
            skipped += 1
            continue
        if not since <= posted.date() <= until:
            continue
        caption = heading.get_text('\n', strip=True)
        paths = list(dict.fromkeys(a['href'] for a in block.select('a[href]') if re.match(r'^media/posts/(?:[0-9]{6}/)?[^/]+\.(?:jpg|jpeg|png)$', a['href'], re.I)))
        prices = re.findall(r'(?:ราคา|price)\s*[:：]?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:บาท|THB|Baht)', caption, re.I)
        # Only clear product evidence is included. Other campaign/announcement
        # posts stay out; no AI guessing, name grouping, or video placeholders.
        if not paths or not (prices or re.search(r'(?:อก|ไหล่|ความยาว)\s*[:：]',caption)):
            skipped += 1
            continue
        identity = hashlib.sha256('\n'.join(paths).encode()).hexdigest()[:16]
        if identity in seen:
            continue
        seen.add(identity)
        sold = bool(re.search(r'\bSOLD\b|ขายแล้ว', caption, re.I))
        name = next((line.strip() for line in caption.splitlines() if line.strip() and not re.search(r'\bSOLD\b|ขายแล้ว',line,re.I)),caption.splitlines()[0].strip())
        measurements = {}
        for label, key in [('อก','chest'),('ไหล่','shoulder'),('ความยาว','length'),('แขน','sleeve')]:
            match = re.search(label + r'\s*[:：]\s*([^\n]+)', caption)
            if match:
                measurements[key] = match.group(1).strip()
        material = re.search(r'เนื้อผ้า\s*[:：]\s*([^\n]+)', caption)
        unique_prices = set(prices)
        price = int(round(float(prices[0].replace(',','')) * 100)) if len(unique_prices) == 1 else None
        slugbase = re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')[:65] or 'garment'
        category = 'short-sleeve' if re.search(r'short[\s-]+sleeve',name,re.I) else 'long-sleeve' if re.search(r'long[\s-]+sleeve',name,re.I) else 'other'
        products.append({
            'id':identity, 'sku':'IG-'+identity.upper(), 'slug':slugbase+'-'+identity[:8],
            'name':name, 'description':'\n'.join(caption.splitlines()[:caption.splitlines().index(next((x for x in caption.splitlines() if '💳' in x),caption.splitlines()[-1]))]).strip(),
            'priceSatang':price, 'category':category, 'material':material.group(1).strip() if material else None,
            'measurements':measurements, 'sourceMedia':paths, 'images':[],
            'postedAt':posted.date().isoformat(), 'sourceDateText':date.get_text(strip=True),
            'sourceCaption':caption, 'sourceHash':hashlib.sha256(caption.encode()).hexdigest(),
            'reviewState':'NEEDS_REVIEW', 'reviewNotes':['Confirm item is still available','Confirm historical price is current'] + (['Price missing or conflicting'] if price is None else []),
            'available':False, 'published':False, 'sourceSold':sold,
        })
    products.sort(key=lambda p:(p['postedAt'],p['id']),reverse=True)
    return products, skipped

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--export', type=Path, default=ROOT.parent/'instagram-igh.ess-2026-10-05-LIWwNEpM')
    parser.add_argument('--since', default='2026-07-01')
    parser.add_argument('--until', default=datetime.now(timezone(timedelta(hours=7))).date().isoformat())
    args = parser.parse_args()
    products, skipped = extract(args.export,datetime.fromisoformat(args.since).date(),datetime.fromisoformat(args.until).date())
    target = ROOT/'data/catalog.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps({'range':{'since':args.since,'until':args.until},'products':products},ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(products)} product drafts; {skipped} unparseable/non-product records skipped. Run npm run migrate:images next.')
