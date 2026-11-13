import { Navigate } from "react-router-dom";

// Payment now starts directly from the cart page; keep old /checkout links working.
export default function Checkout() { return <Navigate to="/cart" replace />; }
