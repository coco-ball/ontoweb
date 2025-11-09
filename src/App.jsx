// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import Folded from "./components/Folded.jsx";
import Organism from "./components/Organism.jsx";
import Masked from "./components/Masked.jsx";
import Texture from "./components/Texture.jsx";
import Header from "./components/Header.jsx";

const CARDS = [
  { id: "folded", label: "Folded", component: <Folded /> },
  { id: "masked", label: "Masked", component: <Masked /> },
  { id: "organism", label: "Organism", component: <Organism /> },
  { id: "texture", label: "Texture", component: <Texture /> },
];

export default function App() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [selectedId, setSelectedId] = useState(CARDS[0].id);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 카메라 on/off
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.display = "block";
        }
        streamRef.current = stream;
      } catch (err) {
        console.error("카메라 접근 실패:", err);
        alert("카메라에 접근할 수 없어요. 브라우저 권한을 다시 확인해주세요.");
        setIsCameraOn(false);
      }
    }

    function stopCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.style.display = "none";
      }
    }

    if (isCameraOn) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCameraOn]);

  const selectedCard = CARDS.find((c) => c.id === selectedId);

  return (
    <div className={`app-root ${isCameraOn ? "camera-on" : ""}`}>
      {/* 카메라 배경 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`bg-video ${isCameraOn ? "show" : ""}`}
      />

      <Header />

      {/* 가운데 선택된 컴포넌트 */}
      <div className="center-stage">{selectedCard?.component}</div>

      {/* 하단 메뉴 (토글 + 캐러셀) */}
      <div className="bottom-menu">
        {/* 카메라 토글 */}
        <div className="panel">
          <span className="label">Camera</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={isCameraOn}
              onChange={() => setIsCameraOn((v) => !v)}
            />
            <span className="slider" />
          </label>
          <span className="status">{isCameraOn ? "ON" : "OFF"}</span>
        </div>

        {/* 캐러셀 */}
        <div className="bottom-carousel">
          <div className="carousel-track">
            {CARDS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`carousel-item ${
                  item.id === selectedId ? "active" : ""
                }`}
              >
                <div className="thumb-icon">{item.label.charAt(0)}</div>
                <div className="thumb-text">
                  <span className="thumb-title">{item.label}</span>
                  {/* <span className="thumb-sub">Tap to view</span> */}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
