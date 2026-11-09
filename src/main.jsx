import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { StoreProvider } from "./store.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <App />
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>
);
