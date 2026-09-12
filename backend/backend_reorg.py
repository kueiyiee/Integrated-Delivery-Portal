from pathlib import Path

root = Path('app')
updated = []

folder_mappings = [
    ('Controllers', 'App\\Controllers', 'App\\Http\\Controllers'),
    ('Requests', 'App\\Requests', 'App\\Http\\Requests'),
    ('Middleware', 'App\\Middleware', 'App\\Http\\Middleware'),
]

for folder, new_ns, old_ns in folder_mappings:
    dir_path = root / folder
    if not dir_path.exists():
        continue
    for path in dir_path.rglob('*.php'):
        text = path.read_text(encoding='utf-8')
        new_text = text.replace(f'namespace {old_ns}', f'namespace {new_ns}')
        if folder == 'Controllers':
            new_text = new_text.replace('use App\\Http\\Controllers\\Controller;', 'use App\\Controllers\\Controller;')
        if new_text != text:
            path.write_text(new_text, encoding='utf-8')
            updated.append(f'updated namespace: {path}')

replacements = [
    ('App\\Http\\Controllers\\', 'App\\Controllers\\'),
    ('App\\Http\\Requests\\', 'App\\Requests\\'),
    ('App\\Http\\Middleware\\', 'App\\Middleware\\'),
]
for path in Path('.').rglob('*.php'):
    text = path.read_text(encoding='utf-8')
    new_text = text
    for old, new in replacements:
        new_text = new_text.replace(old, new)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        updated.append(f'updated references in: {path}')

for subdir in ['Controllers', 'Requests', 'Middleware']:
    path = root / 'Http' / subdir
    if path.exists() and path.is_dir() and not any(path.iterdir()):
        path.rmdir()
        updated.append(f'removed empty folder: {path}')

for line in updated:
    print(line)
