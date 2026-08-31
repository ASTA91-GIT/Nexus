import json
import re

file_path = 'frontend/src/app/entities/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the raw JSON display in entities table
old_raw_json = '{JSON.stringify(ent.properties || {})}'

new_readable_display = '''{(() => {
                            const props = ent.properties || {};
                            if (typeof props === "object" && props !== null) {
                              const priorityKeys = ["description", "summary", "name", "type", "category"];
                              let displayVal = "";
                              for (const key of priorityKeys) {
                                if (props[key]) {
                                  displayVal = String(props[key]);
                                  break;
                                }
                              }
                              if (!displayVal && Object.keys(props).length > 0) {
                                displayVal = String(Object.values(props)[0]);
                              }
                              if (!displayVal) return "No attributes";
                              
                              const isLong = displayVal.length > 50;
                              const truncated = isLong ? displayVal.substring(0, 50) + "..." : displayVal;
                              
                              return (
                                <span title={displayVal} className="truncate max-w-xs inline-block">
                                  {truncated}
                                </span>
                              );
                            }
                            return <span className="truncate max-w-xs inline-block">{String(props)}</span>;
                          })()}'''

if old_raw_json in content:
    content = content.replace(old_raw_json, new_readable_display)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated entities/page.tsx attribute display')
else:
    print('Could not find raw json string in entities/page.tsx')
