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
  const [isBgOn, setIsBgOn] = useState(false);
  const [selectedId, setSelectedId] = useState(CARDS[0].id);
  const [bgVideoSrc, setBgVideoSrc] = useState(null); // 🔹 추가
  const videoRef = useRef(null);

  useEffect(() => {
    if (isBgOn && videoRef.current) {
      const randomIndex = Math.floor(Math.random() * 14) + 1;

      // 🔸 비디오 파일을 public/background/에 두고 이런 식으로 쓰는 걸 추천
      const src = `/background/${randomIndex}.mp4`;
      setBgVideoSrc(src);

      videoRef.current.src = src;
      videoRef.current.loop = true;
      videoRef.current.muted = true;
      videoRef.current.play();
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
      setBgVideoSrc(null);
    }
  }, [isBgOn]);

  const selectedCard = CARDS.find((c) => c.id === selectedId);

  return (
    <div className={`app-root ${isBgOn ? "bg-on" : ""}`}>
      {/* 페이지 전체 배경 비디오 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`bg-video ${isBgOn ? "show" : ""}`}
      />

      <Header />

      {/* 가운데 선택된 컴포넌트 */}
      <div className="center-stage">
        {selectedId === "masked" ? (
          // 🔹 Masked 에 background 비디오 src 전달
          <Masked bgVideoSrc={bgVideoSrc} />
        ) : (
          selectedCard?.component
        )}
      </div>

      {/* 하단 메뉴 (토글 + 캐러셀) */}
      <div className="bottom-menu">
        <div className="panel">
          <span className="label">Background</span>
          <label className="toggle">
            <input
              type="checkbox"
              checked={isBgOn}
              onChange={() => setIsBgOn((v) => !v)}
            />
            <span className="slider" />
          </label>
          <span className="status">{isBgOn ? "ON" : "OFF"}</span>
        </div>

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
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
