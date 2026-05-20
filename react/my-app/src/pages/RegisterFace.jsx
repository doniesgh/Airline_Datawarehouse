import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import API from "../services/api";

export default function RegisterFace() {
  const webcamRef = useRef(null);
  const [name, setName] = useState("");

  const captureAndRegister = async () => {
    const image = webcamRef.current.getScreenshot();

    try {
      // 1. Extract descriptor
      const res1 = await API.post("/auth/extract-descriptor", { image });

      // 2. Save user
      await API.post("/auth/authorized-users", {
        name,
        role: "manager",
        photo: image,
        descriptor: res1.data.descriptor,
      });

      alert("User registered ✅");
    } catch (err) {
      console.error(err);
      alert("Error registering user");
    }
  };

  return (
    <div>
      <h2>Register Face</h2>
      <input
        placeholder="Enter name"
        onChange={(e) => setName(e.target.value)}
      />
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={captureAndRegister}>Register</button>
    </div>
  );
}