import re
from pathlib import Path
root = Path('c:/xampp/htdocs/INTEGRATED DELIVERY PORTAL/frontend/src')
exts = ['.ts','.tsx','.js','.jsx','.d.ts']
import_re = re.compile(r"import\s+(?:[^'\"]+from\s+)?['\"](\..*?)['\"]")
missing = []
for p in root.rglob('*.*'):
    if p.suffix.lower() not in exts and p.suffix.lower() not in ['.css','.json','.svg']:
        continue
    text = p.read_text(encoding='utf-8')
    for m in import_re.finditer(text):
        rel = m.group(1)
        if rel.startswith('..') or rel.startswith('.'):
            target = (p.parent / rel)
            found = False
            # try direct file
            for e in exts:
                if (target.with_suffix(e)).exists():
                    found = True
                    break
            # try index files
            if not found:
                for e in exts:
                    if (target / ('index'+e)).exists():
                        found = True
                        break
            # try if target is a folder with index
            if not found and target.exists():
                # maybe exact file with same name and extension was referenced
                pass
            if not found:
                missing.append((str(p), rel))
print('Missing relative imports:')
for p, r in missing:
    print(p + ' -> ' + r)
print('Done')
