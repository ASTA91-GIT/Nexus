import json

file_path = 'frontend/src/app/profile/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add isEditingProfile state
content = content.replace(
    'const [loadingCases, setLoadingCases] = useState(false);',
    'const [loadingCases, setLoadingCases] = useState(false);\n  const [isEditingProfile, setIsEditingProfile] = useState(false);'
)

# 2. Fix Avatar Layout
old_avatar = '''<div className="relative group shrink-0 block">
            <label className="w-24 h-24 rounded-2xl bg-[var(--surface-primary)] p-1.5 shadow-xl cursor-pointer overflow-hidden block">
              <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleAvatarSelect} />
              
              {(previewAvatar || avatarDataUrl) && (previewAvatar !== "null" && avatarDataUrl !== "null") ? (
                <img src={(previewAvatar || avatarDataUrl) as string} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 flex items-center justify-center text-white font-black text-3xl uppercase">
                  {userProfile?.email ? userProfile.email.substring(0, 2) : "AD"}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                <i className="fa-solid fa-camera text-white"></i>
              </div>
            </label>
            
            {/* Avatar Actions Overlay */}
            {previewAvatar && (
              <div className="absolute top-28 left-0 right-0 flex justify-center gap-2 z-20">
                <button onClick={handleSaveAvatar} className="px-3 py-1 bg-[var(--success)] text-white text-[10px] font-bold rounded shadow uppercase tracking-wider hover:brightness-110">Save</button>
                <button onClick={() => { setPreviewAvatar(null); setFileToUpload(null); }} className="px-3 py-1 bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] text-[10px] font-bold rounded shadow uppercase tracking-wider hover:bg-[var(--surface-tertiary)]">Cancel</button>
              </div>
            )}
            {!previewAvatar && avatarDataUrl && (
              <div className="absolute top-28 left-0 right-0 flex justify-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleRemoveAvatar} className="px-3 py-1 bg-[var(--danger)]/90 text-white text-[10px] font-bold rounded shadow uppercase tracking-wider hover:brightness-110 flex items-center gap-1"><i className="fa-solid fa-trash text-[8px]"></i> Remove</button>
              </div>
            )}
          </div>'''

new_avatar = '''<div className="flex flex-col items-center gap-3 shrink-0 relative z-20">
            <div className="relative group block">
              <label className="w-24 h-24 rounded-2xl bg-[var(--surface-primary)] p-1.5 shadow-xl cursor-pointer overflow-hidden block">
                <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleAvatarSelect} />
                
                {(previewAvatar || avatarDataUrl) && (previewAvatar !== "null" && avatarDataUrl !== "null") ? (
                  <img src={(previewAvatar || avatarDataUrl) as string} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 flex items-center justify-center text-white font-black text-3xl uppercase">
                    {userProfile?.email ? userProfile.email.substring(0, 2) : "AD"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                  <i className="fa-solid fa-camera text-white"></i>
                </div>
              </label>
              {!previewAvatar && avatarDataUrl && (
                <div className="absolute -top-2 -right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={handleRemoveAvatar} className="w-6 h-6 bg-[var(--danger)]/90 text-white rounded-full shadow-lg hover:bg-[var(--danger)] flex items-center justify-center transition-colors">
                    <i className="fa-solid fa-xmark text-[10px]"></i>
                  </button>
                </div>
              )}
            </div>
            
            {/* Avatar Actions (Normal flow, no overflow clipping) */}
            {previewAvatar && (
              <div className="flex justify-center gap-2">
                <button onClick={handleSaveAvatar} className="px-3 py-1 bg-[var(--success)] text-white text-[10px] font-bold rounded shadow uppercase tracking-wider hover:brightness-110 transition-all">Save</button>
                <button onClick={() => { setPreviewAvatar(null); setFileToUpload(null); }} className="px-3 py-1 bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] text-[10px] font-bold rounded shadow uppercase tracking-wider hover:bg-[var(--surface-tertiary)] transition-colors">Cancel</button>
              </div>
            )}
          </div>'''

content = content.replace(old_avatar, new_avatar)

# 3. Add onClick to Edit Profile button
content = content.replace(
    '<button className="px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-xs font-bold rounded-lg border border-[var(--border-primary)] transition-colors">\n              Edit Profile\n            </button>',
    '<button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-xs font-bold rounded-lg border border-[var(--border-primary)] transition-colors">\n              Edit Profile\n            </button>'
)

# 4. Add the modal at the bottom of the return block
modal_code = '''
      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Edit Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Email</label>
                <input type="email" defaultValue={userProfile?.email} disabled className="w-full mt-1 bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm rounded-lg p-2.5 opacity-70 cursor-not-allowed" />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Email cannot be changed directly.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Department</label>
                <input type="text" defaultValue="DIGITAL INVESTIGATIONS" className="w-full mt-1 bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm rounded-lg p-2.5 focus:outline-none focus:border-[var(--accent-primary)]" />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Clearance Level</label>
                <select defaultValue="Level 3" className="w-full mt-1 bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm rounded-lg p-2.5 focus:outline-none focus:border-[var(--accent-primary)]">
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                  <option value="Level 3">Level 3</option>
                  <option value="Level 4">Level 4</option>
                  <option value="Level 5">Level 5</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--text-primary)] text-xs font-bold rounded-lg border border-[var(--border-primary)] transition-colors">Cancel</button>
              <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white text-xs font-bold rounded-lg transition-colors shadow">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}'''

content = content.replace('    </div>\n  );\n}', modal_code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated Edit Profile functionality successfully')
