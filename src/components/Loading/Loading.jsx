import "./Loading.style.css";

const Loading = () => {
  return (
    <div className="typing-row">
      <div className="typing-avatar">
        <span className="typing-avatar-dot" />
      </div>
      <div className="typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
};

export default Loading;
