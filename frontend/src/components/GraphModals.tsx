import React, { useState, useEffect } from "react";

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="relative z-[9999] bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl p-6 w-[400px] shadow-2xl flex flex-col gap-4 m-auto">
        <h2 className="text-lg font-bold text-[var(--danger)] uppercase tracking-wider flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation"></i> {title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-white bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary-hover)] transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--danger)] hover:bg-red-600 transition-colors shadow-md shadow-[var(--danger)]/20 disabled:opacity-50 flex items-center gap-2">
            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-trash"></i>}
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EntityModal({
  isOpen,
  onClose,
  onSave,
  entity,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  entity?: any | null;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    type: "PERSON",
    risk_score: 0.0,
    description: "",
    notes: ""
  });
  
  useEffect(() => {
    if (entity && isOpen) {
      setFormData({
        name: entity.name || "",
        type: entity.type || "PERSON",
        risk_score: entity.risk_score || 0.0,
        description: entity.description || "",
        notes: entity.notes || ""
      });
    } else if (isOpen) {
      setFormData({ name: "", type: "PERSON", risk_score: 0.0, description: "", notes: "" });
    }
  }, [entity, isOpen]);

  if (!isOpen) return null;

  const isAiExtracted = entity?.source === "AI_EXTRACTED";

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md overflow-y-auto py-10">
      <div className="relative z-[9999] bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl p-6 w-[500px] shadow-2xl flex flex-col gap-4 m-auto">
        <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          {entity ? <i className="fa-solid fa-pen"></i> : <i className="fa-solid fa-plus"></i>}
          {entity ? "Edit Entity" : "Add Entity"}
        </h2>
        
        {isAiExtracted && (
          <div className="bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/30 rounded p-2 text-xs font-bold flex items-center gap-2">
            <i className="fa-solid fa-robot"></i> AI EXTRACTED
          </div>
        )}
        
        {!isAiExtracted && entity && (
           <div className="bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 rounded p-2 text-xs font-bold flex items-center gap-2">
           <i className="fa-solid fa-user"></i> USER CREATED
         </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Entity Name *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white" />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 w-1/2">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Entity Type *</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white">
                <option value="PERSON">PERSON</option>
                <option value="ORGANIZATION">ORGANIZATION</option>
                <option value="LOCATION">LOCATION</option>
                <option value="PHONE">PHONE</option>
                <option value="EMAIL">EMAIL</option>
                <option value="ACCOUNT">ACCOUNT</option>
                <option value="VEHICLE">VEHICLE</option>
                <option value="DOCUMENT">DOCUMENT</option>
                <option value="EVENT">EVENT</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 w-1/2">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Risk Level * (0-1)</label>
              <input type="number" step="0.1" min="0" max="1" required value={formData.risk_score} onChange={e => setFormData({...formData, risk_score: parseFloat(e.target.value)})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Description</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white h-20 resize-none"></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-white bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary-hover)] transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button 
            onClick={() => {
              if (!formData.name) return alert("Name is required");
              onSave(formData);
            }} 
            disabled={isLoading || !formData.name} 
            className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
            {entity ? "Save Changes" : "Create Entity"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RelationshipModal({
  isOpen,
  onClose,
  onSave,
  relationship,
  entities,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  relationship?: any | null;
  entities: any[];
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    source_entity_id: "",
    target_entity_id: "",
    type: "KNOWS",
    description: "",
    notes: "",
    confidence: 1.0
  });

  useEffect(() => {
    if (relationship && isOpen) {
      setFormData({
        source_entity_id: relationship.source_entity_id || "",
        target_entity_id: relationship.target_entity_id || "",
        type: relationship.type || "KNOWS",
        description: relationship.description || "",
        notes: relationship.notes || "",
        confidence: relationship.confidence ?? 1.0
      });
    } else if (isOpen) {
      setFormData({ source_entity_id: "", target_entity_id: "", type: "KNOWS", description: "", notes: "", confidence: 1.0 });
    }
  }, [relationship, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md overflow-y-auto py-10">
      <div className="relative z-[9999] bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl p-6 w-[500px] shadow-2xl flex flex-col gap-4 m-auto">
        <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
          {relationship ? <i className="fa-solid fa-pen"></i> : <i className="fa-solid fa-link"></i>}
          {relationship ? "Edit Relationship" : "Add Relationship"}
        </h2>
        
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Source Entity *</label>
            <select disabled={!!relationship} value={formData.source_entity_id} onChange={e => setFormData({...formData, source_entity_id: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white">
              <option value="">-- Select Source --</option>
              {entities.map(e => <option key={e._id} value={e._id} disabled={e._id === formData.target_entity_id}>{e.name} ({e.type})</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Target Entity *</label>
            <select disabled={!!relationship} value={formData.target_entity_id} onChange={e => setFormData({...formData, target_entity_id: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white">
              <option value="">-- Select Target --</option>
              {entities.map(e => <option key={e._id} value={e._id} disabled={e._id === formData.source_entity_id}>{e.name} ({e.type})</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 w-1/2">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Relationship Type *</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white">
                <option value="KNOWS">KNOWS</option>
                <option value="OWNS">OWNS</option>
                <option value="WORKS_FOR">WORKS_FOR</option>
                <option value="RELATED_TO">RELATED_TO</option>
                <option value="COMMUNICATED_WITH">COMMUNICATED_WITH</option>
                <option value="TRANSFERRED_MONEY_TO">TRANSFERRED_MONEY_TO</option>
                <option value="LOCATED_AT">LOCATED_AT</option>
                <option value="ASSOCIATED_WITH">ASSOCIATED_WITH</option>
                <option value="FAMILY_OF">FAMILY_OF</option>
                <option value="EMPLOYED_BY">EMPLOYED_BY</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 w-1/2">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Confidence (0-1)</label>
              <input type="number" step="0.1" min="0" max="1" value={formData.confidence} onChange={e => setFormData({...formData, confidence: parseFloat(e.target.value)})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Description</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm focus:outline-none focus:border-[var(--primary-accent)] text-white h-20 resize-none"></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-white bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary-hover)] transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button 
            onClick={() => {
              if (!formData.source_entity_id || !formData.target_entity_id) return alert("Source and Target required");
              onSave(formData);
            }} 
            disabled={isLoading || !formData.source_entity_id || !formData.target_entity_id} 
            className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
            {relationship ? "Save Changes" : "Create Relationship"}
          </button>
        </div>
      </div>
    </div>
  );
}
