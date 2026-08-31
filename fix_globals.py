import re

with open('frontend/src/app/globals.css', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Restore Light mode variables
old_light_vars = '''  /* LIGHT MODE (Clean, Professional SaaS Dashboard) */
  --app-background: #F4F7FA;
  --foreground: #111827;

  --surface-primary: #FFFFFF;
  --surface-secondary: #F9FAFB;
  --surface-tertiary: #F3F4F6;
  --surface-hover: #F1F5F9;

  --border-primary: #E5E7EB;
  --border-secondary: #D1D5DB;
  
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;

  --accent-primary: #2563EB;
  --accent-secondary: #3B82F6;
  
  --danger: #EF4444;
  --warning: #F59E0B;
  --success: #10B981;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);'''

new_light_vars = '''  /* LIGHT MODE (Clean, Premium Intelligence Platform) */
  --app-background: #F7F8FC;
  --foreground: #0B1120;

  --surface-primary: #FFFFFF;
  --surface-secondary: #F0F2F9;
  --surface-tertiary: #E8EBF5;
  --surface-hover: #EDF0F7;

  --border-primary: #E0E3F0;
  --border-secondary: #D0D5E8;
  
  --text-primary: #121626;
  --text-secondary: #4A5168;
  --text-muted: #8B94B0;

  --accent-primary: #C8AFF0;
  --accent-secondary: #14C8EB;
  
  --danger: #EF4444;
  --warning: #D97706; /* Refined amber/gold */
  --success: #0F503C; /* Canopy green */

  --shadow-sm: 0 1px 2px 0 rgba(200, 175, 240, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(20, 200, 235, 0.05), 0 2px 4px -2px rgba(20, 200, 235, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(20, 200, 235, 0.1), 0 4px 6px -4px rgba(20, 200, 235, 0.05);'''

content = content.replace(old_light_vars, new_light_vars)

# 2. Add input focus light mode
content = content.replace('.input-field:focus {\n  outline: none;\n  border-color: var(--accent-primary);\n  box-shadow: 0 0 0 1px var(--accent-primary);\n}', '.input-field:focus {\n  outline: none;\n  border-color: var(--accent-primary);\n  box-shadow: 0 0 0 1px var(--accent-primary);\n}\n\n/* Light mode specific input focus override (Cyan glow) */\n.light .input-field:focus {\n  border-color: var(--accent-secondary);\n  box-shadow: 0 0 8px rgba(20, 200, 235, 0.3);\n}')

# 3. Add btn-primary light mode
content = content.replace('.btn-primary:hover {\n  background-color: var(--accent-secondary);\n}', '.btn-primary:hover {\n  background-color: var(--accent-secondary);\n}\n\n/* Light mode primary button gradient and hover */\n.light .btn-primary {\n  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));\n  color: #FFFFFF;\n  border: none;\n}\n.light .btn-primary:hover {\n  background: linear-gradient(135deg, #B59CE1, #10B4D4);\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(200, 175, 240, 0.4);\n}')

# 4. Add btn-secondary light mode
content = content.replace('.btn-secondary:hover {\n  background-color: var(--surface-hover);\n  border-color: var(--border-secondary);\n}', '.btn-secondary:hover {\n  background-color: var(--surface-hover);\n  border-color: var(--border-secondary);\n}\n\n/* Light mode secondary button */\n.light .btn-secondary {\n  background-color: #FFFFFF;\n  border-color: var(--border-primary);\n}\n.light .btn-secondary:hover {\n  background-color: rgba(20, 200, 235, 0.05);\n  border-color: var(--accent-secondary);\n  box-shadow: 0 2px 8px rgba(20, 200, 235, 0.15);\n}')

# 5. Append all semantic classes (including original + NEW AI classes)
semantic_classes = '''
/* --- NEXUS SEMANTIC CLASSES --- */

/* Sidebar Navigation Items */
.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: all 0.2s;
  border: 1px solid transparent;
  position: relative;
}
.sidebar-nav-item.active {
  background-color: var(--accent-primary);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.sidebar-nav-item.inactive {
  color: var(--text-secondary);
}
.sidebar-nav-item.inactive:hover {
  background-color: var(--surface-secondary);
  color: var(--text-primary);
}

.light .sidebar-nav-item.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  box-shadow: 0 4px 12px rgba(200, 175, 240, 0.3);
}
.light .sidebar-nav-item.inactive:hover {
  background-color: rgba(200, 175, 240, 0.05);
  color: var(--text-primary);
}

/* Filter Tabs */
.filter-tab {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}
.filter-tab.active {
  background-color: var(--accent-primary);
  color: white;
  border: 1px solid var(--accent-primary);
}
.filter-tab.inactive {
  background-color: var(--surface-primary);
  border: 1px solid var(--border-primary);
  color: var(--text-secondary);
}
.filter-tab.inactive:hover {
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

.light .filter-tab.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(200, 175, 240, 0.3);
}
.light .filter-tab.inactive:hover {
  background-color: rgba(20, 200, 235, 0.03);
}

/* Chatbot Floating Button */
.chat-floating-btn {
  height: 3.5rem;
  width: 3.5rem;
  border-radius: 9999px;
  background: linear-gradient(to top right, #2563eb, #4f46e5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.25);
  transition: all 0.2s;
  cursor: pointer;
}
.chat-floating-btn:hover {
  box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4);
  transform: scale(1.05);
}
.chat-floating-btn:active {
  transform: scale(0.95);
}
.chat-ping {
  position: absolute;
  display: inline-flex;
  height: 100%;
  width: 100%;
  border-radius: 9999px;
  background-color: #60a5fa;
  opacity: 0.2;
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.light .chat-floating-btn {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  box-shadow: 0 8px 24px rgba(200, 175, 240, 0.4);
}
.light .chat-floating-btn:hover {
  box-shadow: 0 12px 28px rgba(20, 200, 235, 0.5);
}
.light .chat-ping {
  background-color: var(--accent-primary);
}

/* Alert Cards */
.alert-card {
  padding: 1.25rem;
  background-color: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}
.alert-card:hover {
  border-color: var(--border-secondary);
  background-color: var(--surface-hover);
}
.alert-card.resolved {
  opacity: 0.6;
  filter: grayscale(100%);
}
.alert-card.resolved:hover {
  filter: grayscale(0%);
}

.light .alert-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(200, 175, 240, 0.15);
  border-color: rgba(20, 200, 235, 0.4);
}

/* Target Badges */
.target-badge {
  background-color: var(--surface-tertiary);
}
.light .target-badge {
  background-color: rgba(200, 175, 240, 0.1);
  color: var(--accent-secondary);
  border: 1px solid rgba(20, 200, 235, 0.2);
}

/* --- AI Investigator Light Mode Borders --- */
.light .ai-chat-panel,
.light .ai-prompts-panel {
  border: 1px solid rgba(15, 23, 42, 0.25);
}

.light .prompt-card {
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.22);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.light .prompt-card:hover {
  border-color: #14C8EB;
  box-shadow: 0 4px 12px rgba(20, 200, 235, 0.12);
  transform: translateY(-1px);
}

.light .chat-input-field {
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.35);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.light .chat-input-field:focus {
  border-color: #14C8EB;
  box-shadow: 0 0 0 3px rgba(20, 200, 235, 0.12);
}

.light .btn-neutral {
  border: 1px solid rgba(15, 23, 42, 0.3);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.light .btn-neutral:hover {
  border-color: #14C8EB;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}
'''
if "NEXUS SEMANTIC CLASSES" not in content:
    content += semantic_classes

with open('frontend/src/app/globals.css', 'w', encoding='utf-8') as f:
    f.write(content)

print('Globals CSS restored and updated successfully.')
