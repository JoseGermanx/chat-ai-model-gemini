import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useApp } from "../../context/AppContext";
import {
  getNotesByChatId,
  createNote,
  updateNote,
  deleteNote,
} from "../../services/notesService";
import "./NotesPanel.style.css";

function formatRelativeTime(isoString) {
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(isoString).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatDateLabel(isoString) {
  return new Date(isoString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByDate(notes) {
  const groups = [];
  let currentLabel = null;
  for (const note of notes) {
    const label = formatDateLabel(note.created_at);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, notes: [note] });
    } else {
      groups[groups.length - 1].notes.push(note);
    }
  }
  return groups;
}

const notePropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  created_at: PropTypes.string.isRequired,
  updated_at: PropTypes.string.isRequired,
});

function NoteCard({ note, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const wasEdited =
    new Date(note.updated_at) - new Date(note.created_at) > 1000;

  const handleSave = () => {
    if (editContent.trim() && editContent.trim() !== note.content) {
      onEdit(note.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setEditContent(note.content); setIsEditing(false); }
  };

  return (
    <div className="note-card">
      {isEditing ? (
        <textarea
          className="note-card-edit-textarea"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <p className="note-card-content" onClick={() => setIsEditing(true)}>
          {note.content}
        </p>
      )}
      <div className="note-card-footer">
        <span className="note-card-time">
          {formatRelativeTime(note.created_at)}
          {wasEdited && <span className="note-card-edited"> · editada</span>}
        </span>
        <div className="note-card-actions">
          <button
            className="note-action-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setEditContent(note.content); setIsEditing(true); }}
            title="Editar"
            aria-label="Editar nota"
          >
            ✎
          </button>
          <button
            className="note-action-btn danger"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onDelete(note.id)}
            title="Eliminar"
            aria-label="Eliminar nota"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

NoteCard.propTypes = {
  note: notePropType.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default function NotesPanel() {
  const {
    activeChatId,
    supabaseProfile,
    chats,
    setShowNotesPanel,
    setShowNotesHistory,
    updateNotesCount,
  } = useApp();

  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId);

  const loadNotes = useCallback(async () => {
    if (!activeChatId) return;
    try {
      const data = await getNotesByChatId(activeChatId);
      setNotes(data);
      updateNotesCount(activeChatId, data.length);
    } catch (err) {
      console.error("Error al cargar notas:", err);
    }
  }, [activeChatId, updateNotesCount]);

  useEffect(() => {
    setNotes([]);
    setDraft("");
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setShowNotesPanel(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setShowNotesPanel]);

  const handleCreate = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      const note = await createNote(activeChatId, supabaseProfile.id, draft.trim());
      const updated = [note, ...notes];
      setNotes(updated);
      updateNotesCount(activeChatId, updated.length);
      setDraft("");
    } catch (err) {
      console.error("Error al guardar nota:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDraftKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  const handleEdit = async (noteId, content) => {
    try {
      const updated = await updateNote(noteId, content);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    } catch (err) {
      console.error("Error al editar nota:", err);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await deleteNote(noteId);
      const updated = notes.filter((n) => n.id !== noteId);
      setNotes(updated);
      updateNotesCount(activeChatId, updated.length);
    } catch (err) {
      console.error("Error al eliminar nota:", err);
    }
  };

  const groups = groupByDate(notes);

  return (
    <aside className="notes-panel">
      <header className="notes-panel-header">
        <span className="notes-panel-icon">📓</span>
        <h2 className="notes-panel-title">Notas</h2>
        {activeChat && (
          <span className="notes-panel-chat-name">{activeChat.title}</span>
        )}
        <button
          className="notes-panel-close"
          onClick={() => setShowNotesPanel(false)}
          aria-label="Cerrar notas"
        >
          ×
        </button>
      </header>

      <div className="notes-panel-body">
        <div className="notes-draft-box">
          <textarea
            className="notes-draft-textarea"
            placeholder="Escribe una nota… (⌘+Enter para guardar)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleDraftKeyDown}
            rows={3}
          />
          <div className="notes-draft-actions">
            <button
              className="notes-save-btn"
              onClick={handleCreate}
              disabled={!draft.trim() || saving}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="notes-empty-state">
            <span className="notes-empty-icon">📝</span>
            <p className="notes-empty-text">Sin notas aún</p>
            <p className="notes-empty-hint">Captura ideas mientras aprendes</p>
          </div>
        ) : (
          <div className="notes-list">
            {groups.map((group) => (
              <div key={group.label} className="notes-date-group">
                <div className="notes-date-divider">{group.label}</div>
                {group.notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {notes.length > 0 && (
        <button
          className="notes-history-link"
          onClick={() => {
            setShowNotesHistory(true);
            setShowNotesPanel(false);
          }}
        >
          Ver historial completo →
        </button>
      )}
    </aside>
  );
}
