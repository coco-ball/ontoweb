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

const TOTAL_BG_VIDEOS = 14;

// 현재 번호 제외한 랜덤 번호를 뽑는 유틸 함수
function pickNextRandom(exclude, total) {
  const pool = [];
  for (let i = 1; i <= total; i++) {
    if (i !== exclude) pool.push(i);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function App() {
  const [isBgOn, setIsBgOn] = useState(false);
  const [selectedId, setSelectedId] = useState(CARDS[0].id);

  // index + src 분리 관리
  const [bgIndex, setBgIndex] = useState(null);
  const [bgVideoSrc, setBgVideoSrc] = useState(null);

  const videoRef = useRef(null);

  // ===========================================================
  // 1) 영상이 끝났을 때 next random 선택
  // ===========================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setBgIndex((prev) => {
        const now = prev ?? 1;
        return pickNextRandom(now, TOTAL_BG_VIDEOS);
      });
    };

    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  // ===========================================================
  // 2) bgIndex / isBgOn 변화 시 실제로 영상 재생
  // ===========================================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isBgOn) {
      let index = bgIndex;

      // 처음 ON 시 처음 랜덤 배정
      if (index == null) {
        index = Math.floor(Math.random() * TOTAL_BG_VIDEOS) + 1;
        setBgIndex(index);
      }

      const src = `/background/${index}.mp4`;
      setBgVideoSrc(src);

      video.src = src;
      video.loop = false;
      video.muted = true;
      video.playsInline = true;

      video.play().catch((err) => console.warn("Video autoplay blocked:", err));
    } else {
      // background off
      video.pause();
      video.src = "";
      setBgVideoSrc(null);
      setBgIndex(null);
    }
  }, [isBgOn, bgIndex]);

  // ===========================================================
  // 3) 카드 선택
  // ===========================================================
  const selectedCard = CARDS.find((c) => c.id === selectedId);

  return (
    <div className={`app-root ${isBgOn ? "bg-on" : ""}`}>
      {/* 배경 비디오 */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`bg-video ${isBgOn ? "show" : ""}`}
      />

      <Header />

      {/* 가운데 카드 */}
      <div className="center-stage">
        {selectedId === "masked" ? (
          <Masked bgVideoSrc={bgVideoSrc} />
        ) : (
          selectedCard?.component
        )}
      </div>

      {/* 하단 토글 + 캐러셀 */}
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
