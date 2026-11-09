import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "./lib/cart";
import { CatalogProvider } from "./lib/catalog";
import { AuthProvider } from "./lib/auth";
import { I18nProvider } from "./lib/i18n";
import { SettingsProvider } from "./lib/settings";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><BrowserRouter><I18nProvider><SettingsProvider><AuthProvider><CatalogProvider><CartProvider><App /></CartProvider></CatalogProvider></AuthProvider></SettingsProvider></I18nProvider></BrowserRouter></React.StrictMode>
);
