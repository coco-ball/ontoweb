// src/components/Masked.jsx
import { useState, useEffect } from "react";
import "./masked.css";
import brachiosaurus from "../assets/brachiosaurus.gif";
import land from "../assets/land.mp4";

const MODES = {
  BACKGROUND: "background",
  DEFAULT: "default",
  DINO_MASK: "dinoMask",
  TRANSPARENT: "transparent", // 👈 featherMask 대신 이 이름으로 변경
};

export default function Masked({ bgVideoSrc }) {
  const [mode, setMode] = useState(MODES.BACKGROUND);

  // 🔁 5초마다 자동으로 모드 순환
  useEffect(() => {
    // bgVideoSrc가 없으면 DINO_MASK는 건너뛰기
    const allModes = [
      MODES.BACKGROUND,
      MODES.DEFAULT,
      MODES.DINO_MASK,
      MODES.TRANSPARENT,
    ];
    const availableModes = bgVideoSrc
      ? allModes
      : allModes.filter((m) => m !== MODES.DINO_MASK);

    if (availableModes.length === 0) return;

    const intervalId = setInterval(() => {
      setMode((prev) => {
        const currentIdx = availableModes.indexOf(prev);
        const nextIdx =
          currentIdx === -1 ? 0 : (currentIdx + 1) % availableModes.length;
        return availableModes[nextIdx];
      });
    }, 5000); // 5초마다 변경

    return () => clearInterval(intervalId);
  }, [bgVideoSrc]);

  return (
    <div className="masked-root">
      <div className={`masked-stage mode-${mode}`}>
        {/* BACKGROUND: land.mp4 */}
        {mode === MODES.BACKGROUND && (
          <video
            className="masked-video"
            src={land}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* DINO_MASK: 브라키오 + 캡션 둘 다 bgVideoSrc로 마스킹 */}
        {mode === MODES.DINO_MASK && bgVideoSrc && (
          <>
            <video
              className="masked-video masked-video--dino"
              src={bgVideoSrc}
              autoPlay
              loop
              muted
              playsInline
            />
            <video
              className="masked-video masked-video--caption"
              src={bgVideoSrc}
              autoPlay
              loop
              muted
              playsInline
            />
          </>
        )}

        {/* 🦕 공룡 GIF: default + background + transparent 에서 다 보이게 */}
        {(mode === MODES.DEFAULT ||
          mode === MODES.BACKGROUND ||
          mode === MODES.TRANSPARENT) && (
          <img
            className="brachio-gif"
            src={brachiosaurus}
            alt="Brachiosaurus walking"
          />
        )}

        {/* 공통 캡션 */}
        <p className="masked-caption">
          Long neck, big heart, and <br />
          even bigger appetite!
        </p>
      </div>

      {/* 모드 전환 버튼 (수동 조작도 그대로 가능) */}
      <div className="masked-toolbar">
        {Object.entries(MODES).map(([key, value]) => (
          <button
            key={key}
            className={`masked-toggle ${mode === value ? "is-active" : ""}`}
            onClick={() => setMode(value)}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
