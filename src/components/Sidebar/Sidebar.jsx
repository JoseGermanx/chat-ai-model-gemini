import { useState, useRef } from "react";
import { useApp } from "../../context/AppContext";
import TutorBadge from "../TutorBadge/TutorBadge";
import "./Sidebar.style.css";
import ia from "../../assets/star-1-svgrepo-com.svg";

const Sidebar = () => {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    handleDeleteChat,
    handleRenameChat,
    sidebarOpen,
    setSidebarOpen,
    setShowTutorPicker,
  } = useApp();

  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef(null);

  const openTutorPicker = () => setShowTutorPicker(true);

  const selectChat = (id) => {
    setActiveChatId(id);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  const startEditing = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
    // Focus happens via autoFocus on the input
  };

  const commitRename = async () => {
    if (!editingChatId) return;
    await handleRenameChat(editingChatId, editingTitle);
    setEditingChatId(null);
    setEditingTitle("");
  };

  const cancelRename = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img src={ia} alt="JS AI" width={18} />
          <span>JS Assistant</span>
        </div>
        <button className="new-chat-btn" onClick={openTutorPicker} title="Nuevo chat">
          +
        </button>
      </div>

      <nav className="sidebar-nav">
        {chats.length === 0 ? (
          <p className="sidebar-empty">Sin chats aún</p>
        ) : (
          <ul className="chat-list">
            {chats.map((chat) => (
              <li
                key={chat.id}
                className={`chat-item ${activeChatId === chat.id ? "active" : ""}`}
              >
                {editingChatId === chat.id ? (
                  <div className="chat-item-edit">
                    <input
                      ref={inputRef}
                      className="chat-title-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      maxLength={80}
                    />
                  </div>
                ) : (
                  <button
                    className="chat-item-btn"
                    onClick={() => selectChat(chat.id)}
                  >
                    <span className="chat-item-title-row">
                      <TutorBadge agentId={chat.agent_id} />
                      <span className="chat-item-title">{chat.title}</span>
                    </span>
                    <span className="chat-item-date">{formatDate(chat.updated_at)}</span>
                  </button>
                )}
                {editingChatId !== chat.id && (
                  <>
                    <button
                      className="chat-rename-btn"
                      onClick={(e) => startEditing(e, chat)}
                      title="Renombrar chat"
                      aria-label="Renombrar chat"
                    >
                      ✏
                    </button>
                    <button
                      className="chat-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      title="Eliminar chat"
                      aria-label="Eliminar chat"
                    >
                      ×
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
