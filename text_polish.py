import os

directory = 'frontend/src/app'

# Replace common text
replacements = {
    'Failed loading data': 'Failed to load data.',
    'Something went wrong try again': 'Something went wrong. Please try again.',
    'Which entities currently present the highest cumulative investigation risk': 'Which entities currently present the highest cumulative investigation risk?',
    'Identify the shortest known relationship path between two entities in the active case': 'Identify the shortest known relationship path between two entities in the active case.',
    'Highlight entities with unusually high relationship density': 'Highlight entities with unusually high relationship density.',
    'Identify missing evidence required to strengthen the current investigation': 'Identify missing evidence required to strengthen the current investigation.',
    'No data found': 'No data is available for this investigation.',
    'Failed loading entities': 'Failed to load entities.',
    'Upload failed try again': 'Upload failed. Please try again.'
}

changed_files = []

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original = content
            for old, new in replacements.items():
                content = content.replace(old, new)
                
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                changed_files.append(filepath)

print('Updated files:')
for f in changed_files:
    print(f)
