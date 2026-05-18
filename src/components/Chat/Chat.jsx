import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import Markdown from "react-markdown";
import Loading from "../Loading/Loading";
import TutorBadge from "../TutorBadge/TutorBadge";
import NotesPanel from "../Notes/NotesPanel";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";
import { getChatById, updateChatHistory, updateChatTitle } from "../../services/chatService";
import { getAgent } from "../../config/agents";
import "./Chat.style.css";
import avatar from "./../../assets/person-svgrepo-com.svg";
import arrow from "./../../assets/arrow.svg";
import ia from "./../../assets/star-1-svgrepo-com.svg";

const PROMPT_CHIPS = [
  "¿Qué son las Promises en JS?",
  "¿Cómo funciona el event loop?",
  "Explícame arrow functions",
  "¿Qué es async/await?",
];

// React component for code blocks — avoids DOM mutation and memory leaks
const PreWithCopy = ({ children = null }) => {
  const [copied, setCopied] = useState(false);
  const preRef = useRef(null);

  const handleCopy = () => {
    const code = preRef.current?.querySelector("code");
    if (code) {
      navigator.clipboard.writeText(code.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <pre ref={preRef} style={{ position: "relative" }}>
      {children}
      <button className="copy-button" onClick={handleCopy}>
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </pre>
  );
};

PreWithCopy.propTypes = { children: PropTypes.node };

const markdownComponents = { pre: PreWithCopy };

const Chat = () => {
  const {
    googleProfile,
    chats,
    activeChatId,
    handleNewChat,
    updateChatTitleInList,
    refreshChatTimestamp,
    showNotesPanel,
    setShowNotesPanel,
    notesCountByChat,
  } = useApp();

  const notesCount = notesCountByChat[activeChatId] ?? 0;

  const activeChat = chats.find((c) => c.id === activeChatId);
  const agentId = activeChat?.agent_id ?? "js-core";
  const agent = getAgent(agentId);

  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [imgProfile, setImgProfile] = useState(avatar);
  const titleGeneratedRef = useRef(false);
  const bottomRef = useRef(null);
  const loadingRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (googleProfile?.picture) setImgProfile(googleProfile.picture);
  }, [googleProfile]);

  useEffect(() => {
    if (!activeChatId) {
      setChatHistory([]);
      titleGeneratedRef.current = false;
      return;
    }
    let cancelled = false;
    getChatById(activeChatId).then((chat) => {
      if (!cancelled) {
        setChatHistory(chat.history || []);
        titleGeneratedRef.current = chat.title !== "Nuevo chat";
      }
    });
    return () => { cancelled = true; };
  }, [activeChatId]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading]);

  useEffect(() => {
    if (loading) loadingRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading]);

  const fetchData = async (text, chatId) => {
    setLoading(true);
    const historySnapshot = chatHistory;
    const userEntry = { id: crypto.randomUUID(), role: "user", parts: text };
    const newHistory = [...historySnapshot, userEntry];
    setChatHistory(newHistory);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No auth session");

      const generateTitle = !titleGeneratedRef.current;
      const res = await fetch(`${import.meta.env.VITE_ADK_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history: historySnapshot,
          agentId,
          generateTitle,
        }),
      });
      if (!res.ok) throw new Error(`ADK error ${res.status}`);
      const data = await res.json();

      const modelEntry = { id: crypto.randomUUID(), role: "model", parts: data.response };
      const finalHistory = [...newHistory, modelEntry];
      setChatHistory(finalHistory);
      await updateChatHistory(chatId, finalHistory);
      refreshChatTimestamp(chatId);

      if (generateTitle && data.title) {
        titleGeneratedRef.current = true;
        await updateChatTitle(chatId, data.title);
        updateChatTitleInList(chatId, data.title);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      setChatHistory(historySnapshot);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    let chatId = activeChatId;
    if (!chatId) {
      const newChat = await handleNewChat();
      if (!newChat) return;
      chatId = newChat.id;
    }

    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    fetchData(trimmed, chatId);
  };

  const handleSetMessage = (event) => {
    setMessage(event.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChipClick = (text) => {
    setMessage(text);
    textareaRef.current?.focus();
  };

  const isLoggedIn = !!googleProfile;

  return (
    <div className="chat-page-wrapper">
    <div className="chat-page">

      {!isLoggedIn && (
        <div className="welcome-state">
          <div className="welcome-icon-wrap">
            <img src={ia} className="welcome-icon" alt="JS AI" />
          </div>
          <h1 className="welcome-title">Asistente IA de JavaScript</h1>
          <p className="welcome-subtitle">
            Inicia sesión con Google para guardar tus chats y acceder a tu
            historial desde cualquier dispositivo.
          </p>
        </div>
      )}

      {isLoggedIn && !activeChatId && (
        <div className="welcome-state">
          <div className="welcome-icon-wrap">
            <img src={ia} className="welcome-icon" alt="JS AI" />
          </div>
          <h1 className="welcome-title">
            ¡Hola, {googleProfile.given_name || googleProfile.name}!
          </h1>
          <p className="welcome-subtitle">
            Especializado en JavaScript y ECMAScript 6. Pregúntame sobre código,
            patrones, o cualquier concepto.
          </p>
          <div className="prompt-chips">
            {PROMPT_CHIPS.map((chip) => (
              <button key={chip} className="chip" onClick={() => handleChipClick(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoggedIn && activeChatId && (
        <div className="tutor-header">
          <TutorBadge agentId={agentId} showName />
          <span className="tutor-header-specialty">
            {agent.specialty.slice(0, 2).join(" · ")}
          </span>
          <button
            className={`notes-toggle-btn${showNotesPanel ? " active" : ""}`}
            onClick={() => setShowNotesPanel((p) => !p)}
            aria-label={showNotesPanel ? "Cerrar notas" : "Abrir notas"}
            title="Notas del chat"
          >
            📓
            {notesCount > 0 && (
              <span className="notes-count-badge">{notesCount}</span>
            )}
          </button>
        </div>
      )}

      {isLoggedIn && activeChatId && (
        <div className="messages-list">
          {chatHistory.map(({ id, parts, role }, index) => (
            <div key={id || index} className={`message-row ${role}`}>
              {role === "model" && (
                <div className="msg-avatar ai-avatar">
                  <img src={ia} alt="AI" />
                </div>
              )}
              <div className={role === "user" ? "user-bubble" : "ai-content"}>
                <Markdown components={markdownComponents}>{parts}</Markdown>
              </div>
              {role === "user" && (
                <div className="msg-avatar user-avatar-icon">
                  <img src={imgProfile} alt="usuario" />
                </div>
              )}
            </div>
          ))}
          <div ref={loadingRef} />
        </div>
      )}

      {loading && <Loading />}
      <div ref={bottomRef} />

      {isLoggedIn && (
        <div className="input-area">
          <form className="input-form" onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="msg-input"
                value={message}
                onChange={handleSetMessage}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta algo sobre JavaScript…"
                rows={1}
                disabled={loading}
              />
              <button
                className="send-btn"
                type="submit"
                disabled={!message.trim() || loading}
                aria-label="Enviar"
              >
                <img src={arrow} width={16} alt="enviar" />
              </button>
            </div>
            <p className="input-hint">
              Enter para enviar&nbsp;&nbsp;·&nbsp;&nbsp;Shift+Enter para nueva línea
            </p>
          </form>
          <div className="footer-attribution">
            <p>
              Hecho con{" "}
              <img
                src="https://simpleicons.org/icons/react.svg"
                alt="React"
                width={13}
                height={13}
                style={{ verticalAlign: "middle", opacity: 0.6 }}
              />{" "}
              por{" "}
              <a href="https://jgxdev.com" target="_blank" rel="noopener noreferrer">
                José Germán Martínez
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
    {showNotesPanel && activeChatId && <NotesPanel />}
    </div>
  );
};

export default Chat;
