import React from "react";

interface GraphEditorControlsProps {
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  unsavedChanges: boolean;
  onSaveLayout: () => void;
  onAddEntity: () => void;
  onAddRelationship: () => void;
  onEditSelected: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedEntity: any | null;
  selectedRelationship: any | null;
  isSaving: boolean;
}

export default function GraphEditorControls({
  isEditMode,
  setIsEditMode,
  unsavedChanges,
  onSaveLayout,
  onAddEntity,
  onAddRelationship,
  onEditSelected,
  onDeleteSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedEntity,
  selectedRelationship,
  isSaving
}: GraphEditorControlsProps) {
  const hasSelection = !!selectedEntity || !!selectedRelationship;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap justify-center items-center gap-2 md:gap-4 p-3 bg-[var(--surface-primary)]/90 border border-[var(--border-primary)] rounded-2xl backdrop-blur-md shadow-2xl w-[96%] max-w-3xl overflow-visible">
      <div className="flex bg-[var(--surface-secondary)] rounded-full p-1 border border-[var(--border-primary)]/50">
        <button
          onClick={() => setIsEditMode(false)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${!isEditMode ? "bg-[var(--primary-accent)] text-white shadow-md" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
        >
          <i className="fa-solid fa-eye mr-2"></i> View
        </button>
        <button
          onClick={() => setIsEditMode(true)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isEditMode ? "bg-[var(--warning)] text-black shadow-md" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
        >
          <i className="fa-solid fa-pen-ruler mr-2"></i> Edit
        </button>
      </div>

      {isEditMode && (
        <div className="flex flex-wrap justify-center gap-2 items-center md:pl-2 md:border-l border-[var(--border-primary)] w-full sm:w-auto mt-2 sm:mt-0">
          <button onClick={onAddEntity} title="Add Entity" className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-all shadow border border-[var(--border-primary)]">
            <i className="fa-solid fa-plus"></i>
          </button>
          
          <button onClick={onAddRelationship} title="Add Relationship" className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--info)] hover:bg-[var(--info)] hover:text-white transition-all shadow border border-[var(--border-primary)]">
            <i className="fa-solid fa-link"></i>
          </button>

          <button disabled={!hasSelection} onClick={onEditSelected} title="Edit Selected" className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--warning)] hover:bg-[var(--warning)] hover:text-white disabled:opacity-30 transition-all shadow border border-[var(--border-primary)]">
            <i className="fa-solid fa-pen"></i>
          </button>

          <button disabled={!hasSelection} onClick={onDeleteSelected} title="Delete Selected" className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white disabled:opacity-30 transition-all shadow border border-[var(--border-primary)]">
            <i className="fa-solid fa-trash"></i>
          </button>
          
          <div className="w-px h-6 bg-[var(--border-primary)] mx-1"></div>

          <button disabled={!canUndo} onClick={onUndo} title="Undo Layout Change" className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-white disabled:opacity-30 transition-all shadow border border-[var(--border-primary)]">
            <i className="fa-solid fa-undo"></i>
          </button>
          <button disabled={!canRedo} onClick={onRedo} title="Redo Layout Change" className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-white disabled:opacity-30 transition-all shadow border border-[var(--border-primary)]">
            <i className="fa-solid fa-redo"></i>
          </button>

          <div className="w-px h-6 bg-[var(--border-primary)] mx-1"></div>

          <button 
            disabled={!unsavedChanges || isSaving} 
            onClick={onSaveLayout} 
            title="Save Layout" 
            className={`flex items-center gap-2 px-4 h-8 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow border border-[var(--border-primary)] ${unsavedChanges ? "bg-[var(--primary-accent)] text-white hover:bg-[var(--primary-hover)]" : "bg-[var(--surface-secondary)] text-[var(--text-tertiary)] opacity-50"}`}
          >
            {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
            Save Layout
          </button>
          
          {unsavedChanges && (
            <span className="text-[9px] text-[var(--warning)] font-bold uppercase tracking-widest animate-pulse ml-2 whitespace-nowrap">
              Unsaved Changes
            </span>
          )}
        </div>
      )}
    </div>
  );
}
