import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Reset scroll to the top whenever the route path changes (not on query/filter changes).
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
