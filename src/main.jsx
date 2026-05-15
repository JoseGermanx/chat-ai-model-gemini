import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
    <Analytics />
  </ErrorBoundary>
);
