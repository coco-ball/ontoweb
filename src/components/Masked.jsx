// src/components/Masked.jsx
import { useState } from "react";
import "./masked.css";
import brachiosaurus from "../assets/brachiosaurus.gif";
import land from "../assets/land.mp4";

const MODES = {
  BACKGROUND: "background",
  DEFAULT: "default",
  DINO_MASK: "dinoMask",
  FEATHER_MASK: "featherMask",
};

export default function Masked({ bgVideoSrc }) {
  const [mode, setMode] = useState(MODES.BACKGROUND);

  return (
    <div className="masked-root">
      <div className={`masked-stage mode-${mode}`}>
        {/* 2. Background & Feather 모드: land.mp4 전체 배경 */}
        {(mode === MODES.BACKGROUND || mode === MODES.FEATHER_MASK) && (
          <video
            className={
              "masked-video" +
              (mode === MODES.FEATHER_MASK ? " masked-video--feather" : "")
            }
            src={land}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* 3. Dino Mask 모드: 흰 배경 + 브라키오 안에 bgVideoSrc */}
        {mode === MODES.DINO_MASK && bgVideoSrc && (
          <video
            className="masked-video masked-video--dino"
            src={bgVideoSrc}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* Default & Background 모드에서 보이는 원래 GIF */}
        {(mode === MODES.DEFAULT || mode === MODES.BACKGROUND) && (
          <img
            className="brachio-gif"
            src={brachiosaurus}
            alt="Brachiosaurus walking"
          />
        )}

        {/* Feather 모드에서 흰 실루엣 */}
        {mode === MODES.FEATHER_MASK && (
          <div className="brachio-silhouette" aria-hidden="true" />
        )}

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
            {key.replace("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}
