import { useState } from "react";

import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

export default function Header() {
  const navigate =
    useNavigate();

  const {
    user,
    isAuthenticated,
    logout,
  } = useAuth();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  async function handleLogout() {
    try {
      await logout();

      setMobileOpen(false);

      navigate("/");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <header className="site-header">

      <div className="header-inner">

        <Link
          to="/"
          className="header-logo"
          onClick={closeMobileMenu}
        >
          ConvertFlow
        </Link>

        <nav
          className={`header-nav ${
            mobileOpen
              ? "mobile-open"
              : ""
          }`}
        >

          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "nav-link active"
                : "nav-link"
            }
            onClick={closeMobileMenu}
          >
            Home
          </NavLink>

          <NavLink
            to="/convert"
            className={({ isActive }) =>
              isActive
                ? "nav-link active"
                : "nav-link"
            }
            onClick={closeMobileMenu}
          >
            Convert
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={closeMobileMenu}
            >
              Dashboard
            </NavLink>
          )}

          <NavLink
            to="/donate"
            className={({ isActive }) =>
              isActive
                ? "nav-link active"
                : "nav-link"
            }
            onClick={closeMobileMenu}
          >
            Donate
          </NavLink>

          {!isAuthenticated && (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  isActive
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={
                  closeMobileMenu
                }
              >
                Login
              </NavLink>

              <Link
                to="/register"
                className="header-signup"
                onClick={
                  closeMobileMenu
                }
              >
                Sign up
              </Link>
            </>
          )}

          {isAuthenticated && (
            <div className="header-account">

              <button
                className="account-button"
                type="button"
              >
                <span className="account-avatar">
                  {user?.email
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "U"}
                </span>

                <span className="account-email">
                  {user?.email}
                </span>
              </button>

              <div className="account-menu">

                <Link
                  to="/dashboard"
                  onClick={
                    closeMobileMenu
                  }
                >
                  Dashboard
                </Link>

                <Link
                  to="/donate"
                  onClick={
                    closeMobileMenu
                  }
                >
                  Donate
                </Link>

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                >
                  Log out
                </button>

              </div>

            </div>
          )}

        </nav>

        <button
          className={`mobile-menu-button ${
            mobileOpen
              ? "open"
              : ""
          }`}
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() =>
            setMobileOpen(
              (value) => !value
            )
          }
        >
          <span />
          <span />
          <span />
        </button>

      </div>

    </header>
  );
}
