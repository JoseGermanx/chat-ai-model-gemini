import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useApp } from "../../context/AppContext";
import {
  getNotesByChatId,
  updateNote,
  deleteNote,
} from "../../services/notesService";
import "./NotesPanel.style.css";

function formatDateLabel(isoString) {
  return new Date(isoString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRelativeTime(isoString) {
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(isoString).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function groupByDate(notes) {
  const groups = [];
  let currentLabel = null;
  for (const note of [...notes].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )) {
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

function HistoryNoteCard({ note, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const wasEdited = new Date(note.updated_at) - new Date(note.created_at) > 1000;

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
    <div className="notes-history-card">
      {isEditing ? (
        <textarea
          className="note-card-edit-textarea"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{ width: "100%", marginBottom: 8 }}
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

HistoryNoteCard.propTypes = {
  note: notePropType.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default function NotesHistory() {
  const { activeChatId, chats, setShowNotesHistory, updateNotesCount } = useApp();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeChat = chats.find((c) => c.id === activeChatId);

  const loadNotes = useCallback(async () => {
    if (!activeChatId) return;
    setLoading(true);
    try {
      const data = await getNotesByChatId(activeChatId);
      setNotes(data);
    } catch (err) {
      console.error("Error al cargar historial de notas:", err);
    } finally {
      setLoading(false);
    }
  }, [activeChatId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

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
    <div className="notes-history-page">
      <div className="notes-history-topbar">
        <button
          className="notes-history-back-btn"
          onClick={() => setShowNotesHistory(false)}
        >
          ← Volver al chat
        </button>
        <div className="notes-history-heading">
          <span className="notes-history-label">Historial de notas</span>
          <span className="notes-history-chat-title">
            {activeChat?.title ?? "Chat"}
          </span>
        </div>
      </div>

      <div className="notes-history-body">
        {loading ? (
          <div className="notes-history-empty">
            <span className="notes-history-empty-icon">⏳</span>
            <p className="notes-history-empty-text">Cargando notas…</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="notes-history-empty">
            <span className="notes-history-empty-icon">📝</span>
            <p className="notes-history-empty-text">Sin notas en este chat</p>
            <p className="notes-history-empty-hint">
              Abre el panel de notas y captura tus aprendizajes
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="notes-history-date-group">
              <div className="notes-history-date-label">{group.label}</div>
              {group.notes.map((note) => (
                <HistoryNoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
