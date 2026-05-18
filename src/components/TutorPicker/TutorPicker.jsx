import { useEffect, useCallback } from "react";
import { AGENTS_LIST } from "../../config/agents";
import { useApp } from "../../context/AppContext";
import "./TutorPicker.style.css";

const TutorPicker = () => {
  const { handleNewChat, setShowTutorPicker } = useApp();

  const handleSelect = async (agentId) => {
    setShowTutorPicker(false);
    await handleNewChat(agentId);
  };

  const handleClose = useCallback(() => setShowTutorPicker(false), [setShowTutorPicker]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  return (
    <div className="tutor-picker-overlay" onClick={handleClose}>
      <div className="tutor-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tutor-picker-header">
          <div>
            <h2 className="tutor-picker-title">Elige tu tutor</h2>
            <p className="tutor-picker-subtitle">
              Cada tutor está especializado en un área específica para darte respuestas más precisas.
            </p>
          </div>
          <button className="tutor-picker-close" onClick={handleClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="tutor-grid">
          {AGENTS_LIST.map((agent) => (
            <button
              key={agent.id}
              className="tutor-card"
              onClick={() => handleSelect(agent.id)}
              style={{ "--agent-color": agent.color, "--agent-color-text": agent.colorText }}
            >
              <div className="tutor-card-accent" />
              <div className="tutor-card-icon">{agent.icon}</div>
              <div className="tutor-card-name">{agent.name}</div>
              <div className="tutor-card-desc">{agent.description}</div>
              <div className="tutor-card-tags">
                {agent.specialty.map((tag) => (
                  <span key={tag} className="tutor-tag">{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="tutor-picker-footer">
          <button className="tutor-auto-btn" onClick={() => handleSelect("js-core")}>
            <span className="tutor-auto-icon">🎯</span>
            <div>
              <div className="tutor-auto-label">JavaScript General</div>
              <div className="tutor-auto-hint">Para dudas mixtas de JS, empieza con Alex</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorPicker;
