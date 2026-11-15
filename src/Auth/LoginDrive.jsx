import usePost from "@/hooks/usePost";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthScreen from "./AuthScreen";

const LoginDrive = () => {
  const { postData, loading } = usePost();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await postData(
        {
          email,
          password,
        },
        "/api/drive/auth/login",
        "Login successfully!"
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", "drive");

      navigate("/drive");
    } catch (err) {
      console.error("Login failed. Invalid email or password.");
      setError(err?.message || "Invalid email or password.");
    }
  };

  return (
    <AuthScreen
      area="Drive"
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      onSubmit={handleLogin}
      loading={loading}
      error={error}
    />
  );
};

export default LoginDrive;
