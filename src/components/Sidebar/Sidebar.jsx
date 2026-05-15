import { useApp } from "../../context/AppContext";
import "./Sidebar.style.css";
import ia from "../../assets/star-1-svgrepo-com.svg";

const Sidebar = () => {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    handleNewChat,
    handleDeleteChat,
  } = useApp();

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img src={ia} alt="JS AI" width={18} />
          <span>JS Assistant</span>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat} title="Nuevo chat">
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
                <button
                  className="chat-item-btn"
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <span className="chat-item-title">{chat.title}</span>
                  <span className="chat-item-date">{formatDate(chat.updated_at)}</span>
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
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
