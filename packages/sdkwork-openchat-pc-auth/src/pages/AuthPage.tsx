import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

export type AuthMode = "login" | "register" | "forgotPassword";

interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const auth = useAuth();

  useEffect(() => {
    setMode(initialMode);
    auth.clearError();
    // Only resync when the route-driven mode changes.
    // The auth object is recreated by the hook and would cause needless resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  const switchToLogin = () => {
    setMode("login");
    auth.clearError();
  };

  const switchToRegister = () => {
    setMode("register");
    auth.clearError();
  };

  const switchToForgotPassword = () => {
    setMode("forgotPassword");
    auth.clearError();
  };

  switch (mode) {
    case "register":
      return <RegisterPage auth={auth} onSwitchToLogin={switchToLogin} />;
    case "forgotPassword":
      return <ForgotPasswordPage auth={auth} onSwitchToLogin={switchToLogin} />;
    case "login":
    default:
      return (
        <LoginPage
          auth={auth}
          onSwitchToRegister={switchToRegister}
          onSwitchToForgotPassword={switchToForgotPassword}
        />
      );
  }
}

export default AuthPage;
