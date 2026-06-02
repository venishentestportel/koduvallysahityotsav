with open('c:/Users/MI/OneDrive/Desktop/koduvellisahitholsv/registration.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'pending' in line or 'queue' in line or 'list' in line:
        if 'function' in line or 'push' in line or 'localStorage' in line:
            print(f"{i+1}: {line.strip()}")
