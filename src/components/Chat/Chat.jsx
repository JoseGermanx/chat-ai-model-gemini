import { useState, useRef, useEffect } from "react";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import Markdown from "react-markdown";
import Loading from "../Loading/Loading";
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

const Chat = () => {
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState(JSON.parse(localStorage.getItem("chatHistory")) || []);
  const bottomRef = useRef(null);
  const [message, setMessage] = useState("");
  const loadingRef = useRef(null);
  const [showButton, setShowButton] = useState(false);
  const [imgProfile, setImgProfile] = useState(avatar);

  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    generationConfig,
    safetySettings,
  });

  const dia = new Date();
  const hora = dia.getHours();

  // alamcenar el chatHistory en localStorage

  useEffect(() => {
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory) || []);
  }, [chatHistory])

  useEffect(()=> {
    if (localStorage.getItem("profile")) {
      setImgProfile(JSON.parse(localStorage.getItem("profile")).picture);
    }
  }, [])


  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [
          {
            text:
              "Eres experto en desarrollo de software y programación, responderás sobre temas de programación pero con un enfoque principalmente en javascript y los estandares de ecmascript. Te proporciono herramientas para consultar referencias para que encuentres respuestas para las consultas que se te harán. Puedes utilizar tu conocimiento previo y también consultar las referencias para generar tus respuestas: https://tc39.es/, https://developer.mozilla.org/es/docs/Web/JavaScript, https://lenguajejs.com/javascript/, https://developer.mozilla.org/es/docs/Learn/Getting_started_with_the_web/JavaScript_basics, https://devdocs.io/javascript/, https://www.w3schools.com/js/js_es6.asp, https://stackoverflow.com/questions/tagged/javascript. Utiliza leguaje relajado y amable y puedes dar una bienvenida dependiendo de la hora del dia: Buenos días para horas de la mañana, Buenas tardes para horas de la tarde y Buenas noches para horas de la noche, realiza esto siempre en el inicio de una conversación pero no en cada mensaje. Puedes consultar la hora actual y fecha actual acá, día: " +
              dia +
              " y hora: " +
              hora +
              " para saber que tipo de saludo debes dar. No es necesario que indiques la fuente desde donde consultas la hora y el día. No es necesario que digas en las respuestas que eres un asistente de desarrollo de software experto en javascript y ecmascript, ya que esto ya lo sabemos. Se lo mas claro y preciso posible en tus respuestas. Utiliza un leguaje amigable, con ejemplos y explicaciones claras.",
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

  const handleShowButton = () => {
    setShowButton(true);
  }

  const handleDeleteHistory = () => {
    localStorage.removeItem("chatHistory");
    location.reload();
  }

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
    console.log(text);
    addMessageToHistory(
      "model",
      text
        // .replace(/\n/g, "<br />")
        // .replace(/```([^```]+)```/g, "<code>$1</code>")
        // .replace(/"/g, "")
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
     
      <div className="header">
      <h1>Asistente Personal</h1>
      <img src={ia} width="100" alt="avatar"/>
      <p>
        Hola, soy un asistente de desarrollo de software experto en JavaScript y
        ECMAScript. Estoy aquí para ayudarte con tus dudas y preguntas sobre
        JavaScript. Por favor, introduce tu pregunta en el cuadro de texto a
        continuación y te responderé lo mejor que pueda.
      </p>
      <button className="delete-history" onClick={handleDeleteHistory} disabled={chatHistory.length == 0 ? true: false}>Eliminar historial del chat</button>
      </div>
      <div className="chat-container">
        {chatHistory &&
          chatHistory?.map(({ parts, role }, index) => (
            <div key={index} className={`chat-response ${role}`}>
              <div className="role">
                <img
                  src={role === "model"  ? ia : imgProfile}
                  width="30"
                  alt="avatar"
                  style={{ borderRadius: "50%", backgroundColor:  "#f0f0f0"}}
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
            onFocus={handleShowButton}
            type="text"
          />{
            showButton && <button className="chat-form-button" type="submit">
            <img src={arrow} width="20" alt="arrow" />
          </button>
          }
          
        </form>
        <div>
          <div className="footer-text">
            {/* <p>
              Este chat es un proyecto de demostración y no debe ser utilizado
              para preguntas críticas o sensibles. Las respuestas generadas por
              este modelo no son 100% precisas y pueden contener errores.
            </p> */}
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
