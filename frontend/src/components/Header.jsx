"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiArrowLeftOnRectangle,
  HiArrowRightOnRectangle,
  HiBars3,
  HiXMark,
} from "react-icons/hi2";
import NavLink from "./NavLink";

const navLinks = [
  { id: 1, children: "Home", path: "/" },
  { id: 2, children: "Parking Map", path: "/map" },
  { id: 3, children: "My Reservations", path: "/reservations", protected: true },
  { id: 4, children: "Profile", path: "/profile", protected: true },
];

function Header({ handleLogout, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const visibleLinks = navLinks.filter((link) => !link.protected || user);


  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    function onClickOutside(e) {
      if (!panelRef.current) return;
      if (isOpen && !panelRef.current.contains(e.target)) setIsOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setIsOpen(false); 
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="z-10 shadow-md bg-inherit sticky top-0 transition-all duration-200 border-b border-b-secondary-300">
      <nav className="container xl:max-w-screen-xl px-4">
        <div className="flex items-center justify-between py-2 text-secondary-400">
          <ul className="hidden md:flex items-center gap-x-10">
            {visibleLinks.map((link) => (
              <li key={link.id}>
                <NavLink path={link.path}>{link.children}</NavLink>
              </li>
            ))}
          </ul>

          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-secondary-200 p-2"
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <HiXMark className="w-6 h-6 text-secondary-700" />
            ) : (
              <HiBars3 className="w-6 h-6 text-secondary-700" />
            )}
          </button>

          <div className="flex items-center">
            {user ? (
              <button onClick={handleLogout} title="Logout" aria-label="Logout">
                <HiArrowLeftOnRectangle className="w-8 h-8 text-error hover:border hover:border-error hover:rounded" />
              </button>
            ) : (
              <NavLink path="/login" aria-label="Login">
                <HiArrowRightOnRectangle className="w-8 h-8 text-success hover:border hover:border-success hover:rounded" />
              </NavLink>
            )}
          </div>
        </div>


        {isOpen && (
          <div ref={panelRef} className="md:hidden pb-3">
            <div className="rounded-2xl border border-secondary-200 bg-white shadow-sm p-3">
              <ul className="flex flex-col gap-2">
                {visibleLinks.map((link) => (
                  <li key={link.id} className="rounded-lg hover:bg-secondary-50">
             
                    <NavLink path={link.path} onClick={() => setIsOpen(false)}>
                      {link.children}
                    </NavLink>
                  </li>
                ))}

             
                <li className="pt-2 mt-2 border-t border-secondary-200">
                  {user ? (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left text-error"
                    >
                      Logout
                    </button>
                  ) : (
                    <NavLink path="/login" onClick={() => setIsOpen(false)}>
                      Login
                    </NavLink>
                  )}
                </li>
              </ul>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;
