import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider
    clientId="30444366537-haoh1h3adhviq2f339bltvgjf7bu2lre.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
