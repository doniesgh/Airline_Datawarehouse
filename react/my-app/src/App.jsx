import { BrowserRouter, Routes, Route } from "react-router-dom";
import RegisterFace from "./pages/RegisterFace";
import LoginFace from "./pages/LoginFace";
import LiveDetect from "./pages/LiveDetect";
import DetectFace from "./pages/detectFace";
import Home from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detect" element={<DetectFace />} />
        <Route path="/login" element={<LoginFace />} />
        <Route path="/register" element={<RegisterFace />} />
        <Route path="/live" element={<LiveDetect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;