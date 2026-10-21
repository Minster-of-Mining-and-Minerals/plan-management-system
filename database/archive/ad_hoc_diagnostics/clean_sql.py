import sys
inside = False
with open('data_only.sql', 'r') as f:
  lines = f.readlines()
with open('data_only.sql', 'w') as f:
  for line in lines:
    if line.startswith('COPY public."SequelizeMeta"'):
      inside = True
      continue
    if inside and line.startswith('\\.'):
      inside = False
      continue
    if not inside:
      f.write(line)
