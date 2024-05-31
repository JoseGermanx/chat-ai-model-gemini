import { useState, useRef, useEffect } from "react";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import Markdown from "react-markdown";
import Loading from "../Loading/Loading";
import "./Chat.style.css";
import avatar from "./../../assets/avatar.svg";
import arrow from "./../../assets/arrow.svg";
import ia from "./../../assets/ia.svg";

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

const Chat = () => {
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const bottomRef = useRef(null);
  const [message, setMessage] = useState("");
  const loadingRef = useRef(null);

  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    generationConfig,
    safetySettings,
  });

  const dia = new Date();
  const hora = dia.getHours();

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [
          {
            text:
              "Hola, soy desarrollador full stack y tu seras mi asistente personal. Eres experto en desarrollo de software y programación, me ayudaras en temas sobre programación pero sobre todo enfocado en javascript y ecmascript 6. Puedes consultar referencias para que encuentres respuestas para las consultas que te haré. Puedes utilizar tu conocimiento previo y también consultar estas referencias para generar tus respuestas: https://developer.mozilla.org/es/docs/Web/JavaScript, https://lenguajejs.com/javascript/, https://developer.mozilla.org/es/docs/Learn/Getting_started_with_the_web/JavaScript_basics, https://devdocs.io/javascript/, https://www.w3schools.com/js/js_es6.asp. Ten siempre en cuenta la hora en la que se te hace una consulta para que le puedes dar una bienvenida acorde a la hora del dia, considera hacer esto en el inicio de una conversación pero no en cada mensaje, puedes volver a dar el saludo dependiendo de la situación y del cambio de hora. Para que seas mas presiso en este sentido puedes consultar la hora actual y fecha actual en estas varibles, día: " +
              dia +
              " y hora: " +
              hora +
              ". No es necesario que indiques la fuente desde donde consultas la hora y el día. No es necesario que digas en las respuestas que eres un asistente de desarrollo de software experto en javascript y ecmascript 6, ya que esto ya lo sabemos. Siempre que puedas, trata de ser lo mas claro y preciso posible en tus respuestas.",
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
      ...chatHistory,
    ],
  });

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToLoading = () => {
    loadingRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [loading]);

  useEffect(() => {
    if (loading) {
      scrollToLoading();
    }
  }, [loading]);

  const addMessageToHistory = (role, message) => {
    setChatHistory((prevHistory) => [...prevHistory, { role, parts: message }]);
  };

  const fetchData = async () => {
    setLoading(true);
    addMessageToHistory("user", message);
    const result = await chat.sendMessage(message);
    const response = await result.response;

    const text = response.text();
    addMessageToHistory(
      "model",
      text
        // .replace(/\n/g, "<br />")
        .replace(/"/g, "")
      // .replace(/\*([^*]+)\*/g, "<h3>$1</h3>")
    );
    setMessage("");
    setLoading(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message) {
      return;
    }
    fetchData();
    setMessage("");
  };

  const handleSetMessage = (event) => {
    setMessage(event.target.value);
  };

  return (
    <div className="container">
      <h1>Gemini AI Chat JS</h1>
      <img src={avatar} width="100" alt="avatar" />
      <p>
        Hola, soy un asistente de desarrollo de software experto en JavaScript y
        ECMAScript 6. Estoy aquí para ayudarte con tus dudas y preguntas sobre
        JavaScript. Por favor, introduce tu pregunta en el cuadro de texto a
        continuación y te responderé lo mejor que pueda.
      </p>

      <div className="chat-container">
        {chatHistory &&
          chatHistory?.map(({ parts, role }, index) => (
            console.log(parts),
            <div key={index} className={`chat-response ${role}`}>
              <div className="role">
                <img
                  src={role === "model" ? ia : avatar}
                  width="50"
                  alt="avatar"
                />
              </div>
              <div className="chat-message">
                <Markdown>{parts}</Markdown>
              </div>
              <div ref={loadingRef} />
            </div>
          ))}
      </div>
      {loading && <Loading />}
      <div ref={bottomRef} />
      <div className="footer">
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            className="chat-form-text "
            value={message}
            onChange={handleSetMessage}
            placeholder="Ingresa tu instrucción aquí..."
          />
          <button className="chat-form-button" type="submit">
            <img src={arrow} width="20" alt="arrow" />
          </button>
        </form>
        <div>
          <div className="footer-text">
            <p>
              A web application made with{" "}
              <img
                src="https://simpleicons.org/icons/react.svg"
                alt="Next.js"
                width={15}
                height={15}
                className=""
              />{" "}
              by{" "}
              <a
                href="https://jgxdev.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                José Germán Martínez
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
