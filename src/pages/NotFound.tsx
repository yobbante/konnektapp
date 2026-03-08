import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.warn("404 Redirect: route not found:", location.pathname);
    navigate("/", { replace: true });
  }, [navigate, location.pathname]);

  return null;
};

export default NotFound;
