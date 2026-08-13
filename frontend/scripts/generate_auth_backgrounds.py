from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

out = Path('src/assets/backgrounds')
out.mkdir(parents=True, exist_ok=True)

for name, base_color, overlay_color in [
    ('auth-light.webp', (243, 246, 255), (255, 255, 255, 140)),
    ('auth-dark.webp', (18, 24, 44), (0, 0, 0, 180)),
]:
    img = Image.new('RGB', (1920, 1200), base_color)
    overlay = Image.new('RGBA', img.size, overlay_color)
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

    draw = ImageDraw.Draw(img)
    for i in range(6):
        x0 = 180 + i * 160
        y0 = 120 + i * 80
        x1 = img.width - x0
        y1 = img.height - y0
        opacity = max(0, 120 - i * 18)
        fill = (255, 255, 255, opacity) if name == 'auth-light.webp' else (0, 0, 0, opacity)
        ellipse = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ellipse_draw = ImageDraw.Draw(ellipse)
        ellipse_draw.ellipse((x0, y0, x1, y1), fill=fill)
        img = Image.alpha_composite(img.convert('RGBA'), ellipse).convert('RGB')

    vignette = Image.new('L', img.size)
    for y in range(img.height):
        for x in range(img.width):
            dx = abs(x - img.width / 2) / (img.width / 2)
            dy = abs(y - img.height / 2) / (img.height / 2)
            value = int(min(255, (dx**2 + dy**2) * 125))
            vignette.putpixel((x, y), value)

    if name == 'auth-light.webp':
        mask = ImageOps.colorize(vignette, black='transparent', white='white').convert('RGBA')
    else:
        mask = ImageOps.colorize(vignette, black='transparent', white='black').convert('RGBA')

    img = Image.composite(img, Image.new('RGB', img.size, (255, 255, 255) if name == 'auth-light.webp' else (0, 0, 0)), mask.convert('L'))
    img = img.filter(ImageFilter.SMOOTH)
    img.save(out / name, 'WEBP', quality=85)
