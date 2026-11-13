import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Categories from "./pages/Categories";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Info from "./pages/Info";
import NotFound from "./pages/NotFound";
import { Login, Register, Forgot, ResetPassword } from "./pages/AuthPages";
import { AccountLayout, Overview, Orders, OrderDetail, Profile, Notifications, Support } from "./pages/Account";
import { AdminLayout, AdminOrders, AdminInventory, AdminCoupons, AdminSupport, AdminPayments, AdminAudit } from "./pages/Admin";
import { AdminProducts, AdminProductForm, AdminCategories } from "./pages/AdminCatalog";
import { Dashboard, AdminCustomers, AdminOrderDetail, AdminReviews, AdminUsers, AdminSettings, AdminNotifications } from "./pages/AdminMore";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          {["/about", "/contact", "/faq", "/privacy-policy", "/terms-and-conditions", "/refund-policy", "/shipping-and-delivery"].map((p) => <Route key={p} path={p} element={<Info />} />)}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<Overview />} /><Route path="orders" element={<Orders />} /><Route path="orders/:id" element={<OrderDetail />} />
            <Route path="profile" element={<Profile />} /><Route path="notifications" element={<Notifications />} /><Route path="support" element={<Support />} />
            <Route path="password" element={<ResetPassword />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} /><Route path="products" element={<AdminProducts />} /><Route path="products/:id" element={<AdminProductForm />} /><Route path="categories" element={<AdminCategories />} /><Route path="orders" element={<AdminOrders />} /><Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="customers" element={<AdminCustomers />} /><Route path="inventory" element={<AdminInventory />} /><Route path="payments" element={<AdminPayments />} />
            <Route path="coupons" element={<AdminCoupons />} /><Route path="support" element={<AdminSupport />} /><Route path="reviews" element={<AdminReviews />} /><Route path="notifications" element={<AdminNotifications />} /><Route path="settings" element={<AdminSettings />} /><Route path="users" element={<AdminUsers />} /><Route path="audit-logs" element={<AdminAudit />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
