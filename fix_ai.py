import re

with open('frontend/src/app/ai-investigator/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Main AI chat panel
content = content.replace('className="flex-1 border border-[var(--border-primary)] bg-[var(--surface-primary)] rounded-2xl flex flex-col min-h-0 backdrop-blur-md shadow-2xl overflow-hidden"', 'className="flex-1 border border-[var(--border-primary)] bg-[var(--surface-primary)] rounded-2xl flex flex-col min-h-0 backdrop-blur-md shadow-2xl overflow-hidden ai-chat-panel"')

# 2. Suggested prompt cards
content = content.replace('className="w-full text-left p-3.5 rounded-xl border border-[var(--border-primary)] hover:border-[var(--primary-accent)]/50 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-semibold leading-relaxed cursor-pointer"', 'className="w-full text-left p-3.5 rounded-xl border border-[var(--border-primary)] hover:border-[var(--primary-accent)]/50 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-semibold leading-relaxed cursor-pointer prompt-card"')

# 3. Chat input field
content = content.replace('className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-[var(--text-primary)] transition-colors shadow-inner"', 'className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-[var(--text-primary)] transition-colors shadow-inner chat-input-field"')

# 4. Buttons (Action buttons in chat)
content = content.replace('className="px-3 py-1.5 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all"', 'className="px-3 py-1.5 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all btn-neutral"')

# 5. Suggested prompts panel
content = content.replace('className="w-80 bg-[var(--surface-primary)] border border-[var(--border-primary)] p-5 rounded-2xl flex flex-col gap-5 backdrop-blur-md shrink-0 shadow-2xl"', 'className="w-80 bg-[var(--surface-primary)] border border-[var(--border-primary)] p-5 rounded-2xl flex flex-col gap-5 backdrop-blur-md shrink-0 shadow-2xl ai-prompts-panel"')

with open('frontend/src/app/ai-investigator/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Component replacements applied successfully.')
