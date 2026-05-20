import React, { useRef } from "react";
import Webcam from "react-webcam";
import API from "../services/api";

export default function LoginFace() {
  const webcamRef = useRef(null);

  const login = async () => {
    const image = webcamRef.current.getScreenshot();

    try {
      // 1. Get descriptor
      const res1 = await API.post("/auth/extract-descriptor", { image });

      // 2. Verify face
      const res2 = await API.post("/auth/verify-face", {
        descriptor: res1.data.descriptor,
      });

      if (res2.data.authenticated) {
        alert("Welcome " + res2.data.user.name);
        window.location.href = "/dashboard";
      } else {
        alert("Face not recognized ❌");
      }
    } catch (err) {
      console.error(err);
      alert("Login error");
    }
  };

  return (
    <div>
      <h2>Face Login</h2>
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={login}>Login</button>
    </div>
  );
}