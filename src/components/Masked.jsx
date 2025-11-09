// src/components/Masked.jsx
import { useState } from "react";
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

      {/* 모드 전환 버튼 */}
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
