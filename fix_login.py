import re

with open('frontend/src/app/login/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the gradient overlay
content = content.replace('from-black to-transparent', 'dark:from-black from-transparent to-transparent')

# Fix text colors for light mode (falling back to theme variables)
content = content.replace('text-slate-100', 'dark:text-slate-100 text-[var(--text-primary)]')
content = content.replace('text-slate-200', 'dark:text-slate-200 text-[var(--text-primary)]')
content = content.replace('text-slate-300', 'dark:text-slate-300 text-[var(--text-secondary)]')
content = content.replace('text-slate-400', 'dark:text-slate-400 text-[var(--text-muted)]')
content = content.replace('text-slate-500', 'dark:text-slate-500 text-[var(--text-muted)]')

# Fix undefined card backgrounds
content = content.replace('bg-[var(--card-bg)]', 'bg-[var(--surface-primary)]')
content = content.replace('bg-[var(--secondary-bg)]', 'bg-[var(--surface-secondary)]')

with open('frontend/src/app/login/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Replacements applied successfully.')
