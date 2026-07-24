from PIL import Image, ImageDraw, ImageFont

size = 400
radius = 80
bg_color = (20, 122, 77, 255)  # #147A4D
text_color = (255, 255, 255, 255)

img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

draw.rounded_rectangle([0, 0, size-1, size-1], radius=radius, fill=bg_color)

font = ImageFont.truetype('/Users/moaztalal/Downloads/33-B-Fantezy.ttf', 250)

text = 'ب'

bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]

x = (size - text_w) // 2 - bbox[0]
y = (size - text_h) // 2 - bbox[1]

# Bold effect
for dx, dy in [(0,0), (1,0), (-1,0), (0,1), (0,-1), (1,1), (-1,-1), (1,-1), (-1,1)]:
    draw.text((x+dx, y+dy), text, fill=text_color, font=font)

img.save('frontend/public/logo-icon.png')
print('Saved tiktok-profile.png:', img.size)
