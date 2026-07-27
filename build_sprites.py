import json, base64, os

src = r'c:\Users\Anto\Desktop\APPCHEQUEATE\newsgamings\assets'
out = r'c:\Users\Anto\Desktop\APPCHEQUEATE\newsgamings\sprites.js'

files = [
  'map_bg','beaver_idle','beaver_walk','beaver_cut','beaver_carry',
  'beaver_build','beaver_celebrate','tree_healthy','tree_stump',
  'tree_dead','tree_flooded','dam','cabin','rocks'
]

lines = ['/* sprites.js — Sprites embebidos como base64 data URIs */', 'var SPRITES_DATA = {']
for i, name in enumerate(files):
  path = os.path.join(src, name + '.png')
  if not os.path.exists(path):
    print(f'MISSING: {name}')
    continue
  with open(path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('ascii')
  uri = 'data:image/png;base64,' + b64
  comma = ',' if i < len(files)-1 else ''
  lines.append(f'  "{name}": "{uri}"{comma}')
  print(f'{name}: {len(uri)//1024}KB')

lines.append('};')
content = '\n'.join(lines)
with open(out, 'w', encoding='utf-8') as f:
  f.write(content)
print(f'Done. File size: {os.path.getsize(out)//1024//1024}MB ({os.path.getsize(out)//1024}KB)')
