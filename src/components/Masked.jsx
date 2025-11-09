// src/components/Masked.jsx
import { useState } from "react";
import "./masked.css";
import brachiosaurus from "../assets/brachiosaurus.gif";
import land from "../assets/land.mp4";

const MODES = {
  DEFAULT: "default",
  BACKGROUND: "background",
  DINO_MASK: "dinoMask",
  FEATHER_MASK: "featherMask",
};

export default function Masked() {
  const [mode, setMode] = useState(MODES.DEFAULT);

  return (
    <div className="masked-root">
      {/* 상태 전환 버튼들 */}
      <div className="masked-toolbar">
        <button
          type="button"
          className={
            "masked-toggle" + (mode === MODES.DEFAULT ? " is-active" : "")
          }
          onClick={() => setMode(MODES.DEFAULT)}
        >
          Default
        </button>
        <button
          type="button"
          className={
            "masked-toggle" + (mode === MODES.BACKGROUND ? " is-active" : "")
          }
          onClick={() => setMode(MODES.BACKGROUND)}
        >
          Background On
        </button>
        <button
          type="button"
          className={
            "masked-toggle" + (mode === MODES.DINO_MASK ? " is-active" : "")
          }
          onClick={() => setMode(MODES.DINO_MASK)}
        >
          Dino Mask
        </button>
        <button
          type="button"
          className={
            "masked-toggle" + (mode === MODES.FEATHER_MASK ? " is-active" : "")
          }
          onClick={() => setMode(MODES.FEATHER_MASK)}
        >
          Feather Mask
        </button>
      </div>

      {/* 메인 스테이지 */}
      <div className={`masked-stage mode-${mode}`}>
        {/* 2. 배경 On + 4. Feather 모드용 전체 배경 영상 */}
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

        {/* 3. Dino Mask 모드용 마스크된 영상 */}
        {mode === MODES.DINO_MASK && (
          <div className="masked-dino-wrapper">
            <video
              className="masked-video masked-video--dino"
              src={land}
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        )}

        {/* 1,2에서 보이는 원래 GIF */}
        {(mode === MODES.DEFAULT || mode === MODES.BACKGROUND) && (
          <img
            className="brachio-gif"
            src={brachiosaurus}
            alt="Brachiosaurus walking"
          />
        )}

        {/* 4. Feather 모드에서 흰색 실루엣으로 보이는 브라키오사우르스 */}
        {mode === MODES.FEATHER_MASK && (
          <div className="brachio-silhouette" aria-hidden="true" />
        )}
        {/* 캡션 */}
        <p className="masked-caption">
          Long neck, big heart, and <br />
          even bigger appetite!
        </p>
      </div>
    </div>
  );
}
