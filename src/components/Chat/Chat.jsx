import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import Markdown from "react-markdown";
import Loading from "../Loading/Loading";
import { useApp } from "../../context/AppContext";
import { getChatById, updateChatHistory, updateChatTitle } from "../../services/chatService";
import "./Chat.style.css";
import avatar from "./../../assets/person-svgrepo-com.svg";
import arrow from "./../../assets/arrow.svg";
import ia from "./../../assets/star-1-svgrepo-com.svg";

const apiKey = import.meta.env.VITE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

const generationConfig = {
  stopSequences: ["red"],
  maxOutputTokens: 200,
  temperature: 0.4,
  topP: 0.1,
  topK: 16,
};

const PROMPT_CHIPS = [
  "¿Qué son las Promises en JS?",
  "¿Cómo funciona el event loop?",
  "Explícame arrow functions",
  "¿Qué es async/await?",
];

const Chat = () => {
  const {
    googleProfile,
    activeChatId,
    handleNewChat,
    updateChatTitleInList,
    refreshChatTimestamp,
  } = useApp();

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

  // Load chat history when activeChatId changes
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

  // Inject copy buttons into code blocks
  useEffect(() => {
    const pres = document.querySelectorAll("pre");
    pres.forEach((pre) => {
      if (pre.querySelector(".copy-button")) return;
      const code = pre.querySelector("code");
      if (!code) return;
      const button = document.createElement("button");
      button.textContent = "Copiar";
      button.classList.add("copy-button");
      button.addEventListener("click", () => {
        navigator.clipboard.writeText(code.innerText);
        button.textContent = "¡Copiado!";
        setTimeout(() => { button.textContent = "Copiar"; }, 1500);
      });
      pre.appendChild(button);
    });
  }, [chatHistory]);

  const dia = useMemo(() => new Date(), []);
  const hora = useMemo(() => dia.getHours(), [dia]);

  const buildChat = useCallback((history) => {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig,
      safetySettings,
    });
    return model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text:
                "Eres experto en desarrollo de software y programación, responderás sobre temas de programación pero con un enfoque principalmente en javascript,los estandares de ecmascript y typescript. Te proporciono herramientas para consultar referencias para que encuentres respuestas para las consultas que se te harán. Puedes utilizar tu conocimiento previo y también consultar las referencias para generar tus respuestas: https://tc39.es/, https://developer.mozilla.org/es/docs/Web/JavaScript, https://lenguajejs.com/javascript/, https://developer.mozilla.org/es/docs/Learn/Getting_started_with_the_web/JavaScript_basics, https://devdocs.io/javascript/, https://www.w3schools.com/js/js_es6.asp, https://stackoverflow.com/questions/tagged/javascript, https://www.typescriptlang.org/docs/. Utiliza leguaje relajado y amable y puedes dar una bienvenida dependiendo de la hora del dia: Buenos días para horas de la mañana, Buenas tardes para horas de la tarde y Buenas noches para horas de la noche, realiza esto siempre en el inicio de una conversación pero no en cada mensaje. Puedes consultar la hora actual y fecha actual acá, día: " +
                dia +
                " y hora: " +
                hora +
                " para saber que tipo de saludo debes dar. No es necesario que indiques la fuente desde donde consultas la hora y el día. No es necesario que digas en las respuestas que eres un asistente de desarrollo de software experto en javascript y ecmascript, ya que esto ya lo sabemos. Se lo mas claro y preciso posible en tus respuestas. Utiliza un leguaje amigable, con ejemplos y explicaciones claras. No respondas preguntas que no tengan que ver con desarrollo de software o programación, si te preguntan algo que no tenga que ver con esto, simplemente responde que no puedes ayudar con eso. No respondas preguntas que no tengan sentido o sean incoherentes. Si te preguntan algo que no entiendes, simplemente responde que no entiendes la pregunta y pide que la reformulen. No respondas preguntas que sean demasiado amplias o generales, en su lugar pide que se especifique más la pregunta.",
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "Ok cuenta con mi ayuda como desarrollador de software experto para aclarar tus dudas, entregarte información y ayudarte. ¿En qué puedo ayudarte hoy?",
            },
          ],
        },
        ...history,
      ],
    });
  }, [dia, hora]);

  const generateTitle = useCallback(async (firstUserMessage) => {
    try {
      const titleModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await titleModel.generateContent(
        `Resume en máximo 5 palabras el tema de esta pregunta, solo el título sin comillas ni signos de puntuación al final: "${firstUserMessage}"`
      );
      return result.response.text().trim();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading]);

  useEffect(() => {
    if (loading) loadingRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading]);

  const fetchData = async (text, chatId) => {
    setLoading(true);
    const userEntry = { role: "user", parts: text };
    const newHistory = [...chatHistory, userEntry];
    setChatHistory(newHistory);

    const chat = buildChat(chatHistory);
    const result = await chat.sendMessage(text);
    const responseText = result.response.text();
    const modelEntry = { role: "model", parts: responseText };
    const finalHistory = [...newHistory, modelEntry];
    setChatHistory(finalHistory);

    await updateChatHistory(chatId, finalHistory);
    refreshChatTimestamp(chatId);

    if (!titleGeneratedRef.current) {
      titleGeneratedRef.current = true;
      const title = await generateTitle(text);
      if (title) {
        await updateChatTitle(chatId, title);
        updateChatTitleInList(chatId, title);
      }
    }

    setLoading(false);
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
    <div className="chat-page">

      {/* ── No login state ── */}
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

      {/* ── Welcome state (logged in, no active chat) ── */}
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

      {/* ── Messages ── */}
      {isLoggedIn && activeChatId && (
        <div className="messages-list">
          {chatHistory.map(({ parts, role }, index) => (
            <div key={index} className={`message-row ${role}`}>
              {role === "model" && (
                <div className="msg-avatar ai-avatar">
                  <img src={ia} alt="AI" />
                </div>
              )}
              <div className={role === "user" ? "user-bubble" : "ai-content"}>
                <Markdown>{parts}</Markdown>
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

      {/* ── Input area ── */}
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
  );
};

export default Chat;
