import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "./lib/cart";
import { CatalogProvider } from "./lib/catalog";
import { AuthProvider } from "./lib/auth";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><CatalogProvider><CartProvider><App /></CartProvider></CatalogProvider></AuthProvider></BrowserRouter></React.StrictMode>
);
