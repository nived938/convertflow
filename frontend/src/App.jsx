import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./pages/Home";
import Pricing from "./pages/Donate";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ConversionPage from "./pages/ConversionPage";
import About from "./pages/About";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/about"
        element={<About />}
      />

      <Route
        path="/donate"
        element={<Pricing />}
      />

      <Route
        path="/convert"
        element={<ConversionPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

      </Route>

      <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}
