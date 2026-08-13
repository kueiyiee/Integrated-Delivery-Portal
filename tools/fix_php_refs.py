import re
from pathlib import Path
root = Path('c:/xampp/htdocs/INTEGRATED DELIVERY PORTAL/backend')
php_files = list(root.rglob('*.php'))
string_re = re.compile(r"('(?:\\.|[^'])*'|\"(?:\\.|[^\"])*\")", re.DOTALL)
patterns = [
    (re.compile(r"App\\\\Controllers\\\\"), r"App\\Controllers\\"),
    (re.compile(r"\\\\App\\\\Controllers\\\\"), r"\\App\\Controllers\\"),
    (re.compile(r"App\\\\Requests\\\\"), r"App\\Requests\\"),
    (re.compile(r"App\\\\Middleware\\\\"), r"App\\Middleware\\"),
    (re.compile(r"\\\\App\\\\Requests\\\\"), r"\\App\\Requests\\"),
]
changed_files = []
for p in php_files:
    text = p.read_text(encoding='utf-8')
    strings = []
    def mask(m):
        strings.append(m.group(0))
        return f'__STR_{len(strings)-1}__'
    masked = string_re.sub(mask, text)
    new = masked
    for pat, repl in patterns:
        new = pat.sub(repl, new)
    # restore
    def restore(m):
        idx = int(m.group(1))
        return strings[idx]
    new = re.sub(r'__STR_(\d+)__', restore, new)
    if new != text:
        p.write_text(new, encoding='utf-8')
        changed_files.append(str(p))
print('Modified files:')
for f in changed_files:
    print(f)
print('Done')
