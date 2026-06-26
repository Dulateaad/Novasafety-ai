import zipfile
import xml.etree.ElementTree as ET
from collections import Counter

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
path = r'c:\Users\dulat\Downloads\Risk Assessment NEBOSH GRE U12 SS (3).docx'
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}


def text_of(el):
    parts = []
    for t in el.iter(f'{W}t'):
        if t.text:
            parts.append(t.text)
        if t.tail:
            parts.append(t.tail)
    return ''.join(parts).strip()


with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read('word/document.xml'))

colors = []
tables = []
paras = []

for tbl in root.iter(f'{W}tbl'):
    rows = []
    for tr in tbl.findall('.//w:tr', ns):
        row = []
        for tc in tr.findall('w:tc', ns):
            cell_text = text_of(tc)
            shd = tc.find('.//w:shd', ns)
            fill = shd.get(f'{W}fill') if shd is not None else None
            if fill:
                colors.append(fill)
            row.append((cell_text, fill))
        rows.append(row)
    tables.append(rows)

for p in root.findall('.//w:body/w:p', ns):
    t = text_of(p)
    if t:
        paras.append(t)

lines = []
lines.append('=== PARAGRAPHS (first 50) ===')
for i, p in enumerate(paras[:50]):
    lines.append(f'{i + 1}. {p[:150]}')

lines.append('\n=== COLOR COUNTS ===')
for c, n in Counter(colors).most_common(30):
    lines.append(f'{c} {n}')

lines.append(f'\n=== TABLES: {len(tables)} ===')
for ti, tbl in enumerate(tables):
    cols = len(tbl[0]) if tbl else 0
    lines.append(f'\n--- Table {ti + 1} ({len(tbl)} rows x {cols} cols) ---')
    for ri, row in enumerate(tbl[:20]):
        cells = []
        for txt, fill in row:
            fill_s = fill or '-'
            cells.append(f'[{fill_s}] {txt[:60]}')
        lines.append(f'  R{ri + 1}: ' + ' | '.join(cells))
    if len(tbl) > 20:
        lines.append(f'  ... +{len(tbl) - 20} rows')

out_path = r'D:\gp_2026_cad26\e-ptw\tmp-nebosh-parse.txt'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('written', out_path)
