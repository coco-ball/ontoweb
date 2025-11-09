// src/components/Folded.jsx
import { useEffect, useRef } from "react";
import "./folded.css";

export default function Folded() {
  const stageRef = useRef(null);
  const linesRef = useRef(null);
  const vizRef = useRef(null);
  const toolbarRef = useRef(null);

  useEffect(() => {
    // ===== 초기 DOM 레퍼런스 =====
    const stage = stageRef.current;
    const linesEl = linesRef.current;
    const viz = vizRef.current;
    const toolbar = toolbarRef.current;
    const ctxViz = viz.getContext("2d");
    const measure = document.createElement("canvas").getContext("2d");

    // 클릭 레이어 우선순위
    if (linesEl) linesEl.style.pointerEvents = "none";
    viz.style.pointerEvents = "auto";

    // ===== 상태 =====
    const START_IN_PATH = true;
    let mode = START_IN_PATH ? "path" : "ellipse"; // 'ellipse' | 'path'
    let P; // 실제로 그리는 Path
    let PLayout; // 텍스트 배치용 안쪽 Path

    // path 편집 상태
    let pts = []; // [{x,y}, ...]
    let dragging = -1;
    let hoverIdx = -1;
    const handleR = 4;
    const hitR = 12;

    // 🔗 리스너 해제용
    const listeners = [];

    // ===== 유틸 =====
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const paddingFor = (w, h) => Math.round(Math.min(w, h) * 0.07);

    const INNER_PAD_X = 0; // 좌우 패딩
    const INNER_PAD_Y = 0; // 위아래 패딩
    const LAYOUT_INSET = 20; // 패딩값

    function stageRect() {
      return stage.getBoundingClientRect();
    }

    // 정규화 원형 프리셋
    function makeCirclePreset(n = 48, r = 0.42, cx = 0.5, cy = 0.5) {
      const arr = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        arr.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
      return arr;
    }

    // 프리셋 (0..1)
    const presets = [
      // 직사각형
      [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
      ],
      makeCirclePreset(24, 0.42),
      //삼각형
      [
        { x: 0.06, y: 0.12 },
        { x: 0.92, y: 0.07 },
        { x: 0.95, y: 0.55 },
        { x: 0.08, y: 0.9 },
      ],
      //육각형
      (() => {
        const arr = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + i * ((Math.PI * 2) / 6);
          arr.push({ x: 0.5 + 0.4 * Math.cos(a), y: 0.5 + 0.4 * Math.sin(a) });
        }
        return arr;
      })(),
      // 불규칙 다각형
      [
        { x: 0.1, y: 0.3 },
        { x: 0.3, y: 0.15 },
        { x: 0.55, y: 0.25 },
        { x: 0.8, y: 0.1 },
        { x: 0.85, y: 0.65 },
        { x: 0.55, y: 0.8 },
        { x: 0.25, y: 0.7 },
      ],
    ];
    let presetIdx = 0;

    // 본문 텍스트
    const text = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sollicitudin diam aliquam, cursus mi ornare, commodo augue. Fusce facilisis orci ligula. Cras at ornare lorem. Donec ac iaculis sapien, id feugiat nisi. Quisque hendrerit metus lacinia, blandit velit at, euismod justo. Aliquam semper augue eget purus ornare sodales. Nunc accumsan consequat nunc, aliquam semper metus ornare vitae. Nullam rhoncus pharetra laoreet.

Aliquam in mollis leo. Sed felis dolor, ultrices vel mollis eu, rutrum vel nibh. Nam ultricies vehicula faucibus. Duis lectus magna, egestas ut elit in, aliquet convallis eros. In sollicitudin gravida enim, eget sodales tortor vulputate a. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Proin maximus vitae mi quis lobortis. Suspendisse rutrum orci a purus sodales euismod. Morbi suscipit ullamcorper condimentum. Nam dignissim mollis tellus, quis porta sapien. Quisque ante arcu, ornare eu euismod vitae, tristique eu ligula. Nulla egestas nulla quis diam pulvinar, in malesuada magna blandit. Sed ullamcorper porta tellus, et auctor lorem vehicula ac. Praesent tristique nulla non volutpat convallis. Phasellus sagittis tristique ligula. Fusce nunc tortor, luctus sed efficitur et, ornare tempus mauris.

Nulla et elit nec magna feugiat auctor. Vivamus fermentum aliquet mi at vestibulum. Vivamus odio leo, interdum vitae maximus id, dapibus pharetra urna. Nulla vel enim et urna porta consequat vel sed libero. Quisque blandit, risus a venenatis gravida, sem elit sodales nunc, eget viverra urna ipsum quis enim. Nullam eget risus tincidunt, aliquet erat mollis, convallis quam. Maecenas enim erat, iaculis fringilla libero eget, vulputate porta nibh. Etiam pharetra elit eu ligula rhoncus dictum. In luctus nisi tortor. Praesent odio risus, volutpat sit amet feugiat at, eleifend id risus. Maecenas facilisis viverra semper. Morbi in quam mi. Etiam blandit turpis dolor, ut eleifend urna laoreet quis. Integer non interdum nisi. Ut accumsan, libero vel luctus viverra, nunc eros hendrerit ante, in tempus urna purus non erat.`;

    // ===== 프리셋에서 점 초기화 =====
    function initPtsFromPreset(force = false) {
      if (!force && pts.length) return;
      const rect = stageRect();
      const W = rect.width,
        H = rect.height;
      const pad = paddingFor(W, H);
      const x0 = pad,
        y0 = pad,
        x1 = W - pad,
        y1 = H - pad;
      const src = presets[presetIdx % presets.length];
      pts = src.map((p) => ({
        x: x0 + p.x * (x1 - x0),
        y: y0 + p.y * (y1 - y0),
      }));
    }

    function pathFromPts(radius = 12, points = pts) {
      const p = new Path2D();
      if (!points.length) return p;

      for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const curr = points[i];
        const next = points[(i + 1) % points.length];

        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;

        const len1 = Math.hypot(dx1, dy1);
        const len2 = Math.hypot(dx2, dy2);

        const ux1 = dx1 / len1;
        const uy1 = dy1 / len1;
        const ux2 = dx2 / len2;
        const uy2 = dy2 / len2;

        const r = Math.min(radius, len1 / 2, len2 / 2);

        const startX = curr.x - ux1 * r;
        const startY = curr.y - uy1 * r;
        const endX = curr.x + ux2 * r;
        const endY = curr.y + uy2 * r;

        if (i === 0) {
          p.moveTo(startX, startY);
        } else {
          p.lineTo(startX, startY);
        }

        p.arcTo(curr.x, curr.y, endX, endY, r);
      }

      p.closePath();
      return p;
    }

    // 중심 기준으로 각 점을 안쪽으로 inset 만큼 당겨서
    // 레이아웃 전용 점 배열을 만든다
    function insetPoints(srcPoints, insetPx) {
      if (!srcPoints.length || insetPx <= 0) return srcPoints.slice();

      // 간단히: 폴리곤의 중심 = 평균값
      let cx = 0,
        cy = 0;
      srcPoints.forEach((p) => {
        cx += p.x;
        cy += p.y;
      });
      cx /= srcPoints.length;
      cy /= srcPoints.length;

      return srcPoints.map((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;

        const newDist = Math.max(0, dist - insetPx);
        const s = newDist / dist;

        return {
          x: cx + dx * s,
          y: cy + dy * s,
        };
      });
    }

    // ===== 렌더링 =====
    function drawViz(w, h) {
      ctxViz.clearRect(0, 0, w, h);

      // 채움
      ctxViz.save();
      ctxViz.fillStyle = "#ffffffff";
      // ctxViz.globalAlpha = 0.18;
      ctxViz.fill(P);
      ctxViz.restore();

      // 편집 핸들
      if (mode === "path" && pts.length) {
        // 외곽선
        ctxViz.save();
        ctxViz.strokeStyle = "#ffffffff";
        ctxViz.lineWidth = 2;
        ctxViz.stroke(P);
        ctxViz.restore();

        // 포인트 + 인덱스
        for (let i = 0; i < pts.length; i++) {
          const { x, y } = pts[i];
          ctxViz.beginPath();
          ctxViz.arc(x, y, handleR, 0, Math.PI * 2);
          const active = i === hoverIdx || i === dragging;
          ctxViz.fillStyle = active ? "#0ca678" : "#15aabf";
          ctxViz.fill();
          ctxViz.lineWidth = active ? 2 : 1.5;
          ctxViz.strokeStyle = "white";
          ctxViz.stroke();

          ctxViz.save();
          ctxViz.font =
            "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
          ctxViz.fillStyle = "rgba(0,0,0,0.6)";
          const label = `#${i}`;
          const tw = ctxViz.measureText(label).width;
          ctxViz.fillRect(x + 10, y - 18, tw + 8, 16);
          ctxViz.fillStyle = "#fff";
          ctxViz.fillText(label, x + 14, y - 6);
          ctxViz.restore();
        }
      }
    }

    function isInsidePath(x, y) {
      // 레이아웃용 Path가 있으면 그걸 우선 사용
      const path = PLayout || P;
      return ctxViz.isPointInPath(path, x, y);
    }

    function spanAtY(centerY, w, lineHeight, padX = 0) {
      let bestLeft = w,
        bestRight = 0,
        bestWidth = 0;
      const startY = Math.floor(centerY - lineHeight / 2);
      const endY = Math.ceil(centerY + lineHeight / 2);

      for (let y = startY; y <= endY; y++) {
        let left = w,
          right = 0;
        for (let x = 0; x < w; x++) {
          if (isInsidePath(x + 0.5, y + 0.5)) {
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
        let width = left <= right ? right - left + 1 : 0;

        if (width > 0) {
          left += padX;
          right -= padX;
          if (left <= right) {
            width = right - left + 1;
          } else {
            width = 0;
          }
        }

        if (width > bestWidth) {
          bestWidth = width;
          bestLeft = left;
          bestRight = right;
        }
      }

      if (bestWidth <= 0) return { left: 0, right: 0, width: 0 };
      return { left: bestLeft, right: bestRight, width: bestWidth };
    }

    // ===== 메인 레이아웃 =====
    function layout() {
      const rect = stageRect();
      const W = (viz.width = Math.round(rect.width));
      const H = (viz.height = Math.round(rect.height));

      if (!pts.length) initPtsFromPreset(true);
      P = pathFromPts();

      // 텍스트 배치용으로 한 번 더 안쪽으로 inset한 Path
      const layoutPts = insetPoints(pts, LAYOUT_INSET);
      PLayout = pathFromPts(12, layoutPts);

      drawViz(W, H);

      // 텍스트 초기화
      linesEl.innerHTML = "";
      linesEl.style.paddingTop = INNER_PAD_Y + "px";
      linesEl.style.paddingBottom = INNER_PAD_Y + "px";

      const fontSize = Math.max(12, Math.round(W * 0.02));
      const lineH = Math.round(fontSize * 1.25);
      linesEl.style.setProperty("--lh", lineH + "px");
      measure.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;

      const words = text.replace(/\s+/g, " ").trim().split(" ");
      let iWord = 0;

      const minSpan = fontSize * 0.8; // 한 글자 정도 폭이면 사용
      const usedCenters = []; // 실제 텍스트가 들어간 줄들의 y
      let shapeTop = null; // 도형이 텍스트를 허용하는 첫 y
      let shapeBottom = null; // 도형이 텍스트를 허용하는 마지막 y

      for (
        let y = lineH / 2 + INNER_PAD_Y;
        y <= H - lineH / 2 - INNER_PAD_Y;
        y += lineH
      ) {
        const { left, width: maxW } = spanAtY(y, W, lineH, INNER_PAD_X);

        // 이 y에서 도형이 어느 정도 폭을 허용하는지만 먼저 기록
        if (maxW >= minSpan) {
          if (shapeTop === null) shapeTop = y;
          shapeBottom = y;
        } else {
          continue;
        }

        // 실제 텍스트 배치
        let lineText = "";
        while (iWord < words.length) {
          const next = (lineText ? lineText + " " : "") + words[iWord];
          if (measure.measureText(next).width <= maxW) {
            lineText = next;
            iWord++;
          } else break;
        }

        if (lineText && iWord < words.length) {
          const currentWord = words[iWord];
          let partialWord = "";
          for (let k = 0; k < currentWord.length; k++) {
            const testText = lineText + " " + partialWord + currentWord[k];
            if (measure.measureText(testText).width <= maxW) {
              partialWord += currentWord[k];
            } else break;
          }
          if (partialWord) {
            lineText += " " + partialWord;
            words[iWord] = currentWord.slice(partialWord.length);
          }
        }

        if (!lineText && iWord < words.length) {
          const word = words[iWord];
          for (let k = 0; k < word.length; k++) {
            const testText = lineText + word[k];
            if (measure.measureText(testText).width <= maxW) {
              lineText = testText;
            } else break;
          }
          if (lineText) words[iWord] = word.slice(lineText.length);
        }

        if (!lineText) continue;

        // 이 줄에는 실제 텍스트가 있음 → 중앙 정렬용으로 y 기록
        usedCenters.push(y);

        const chars = Array.from(lineText);
        const widths = chars.map((ch) => measure.measureText(ch).width);
        const natural = widths.reduce((a, b) => a + b, 0);
        const gaps = Math.max(0, chars.length - 1);
        const extra = Math.max(0, maxW - natural);

        const perGapMax = fontSize * 0.35;
        const perGap = gaps ? Math.min(extra / gaps, perGapMax) : 0;
        const usedByGaps = perGap * gaps;
        let scale = 1.0;
        if (extra - usedByGaps > fontSize * 0.6)
          scale = Math.min(1.06, (natural + usedByGaps + fontSize) / natural);

        const lineEl = document.createElement("div");
        lineEl.className = "line";
        const padLeft = left + (maxW - (natural * scale + usedByGaps)) / 2;
        lineEl.style.transform = `translateX(${padLeft}px)`;
        lineEl.style.top = y - lineH / 2 + "px";
        lineEl.style.height = lineH + "px";

        chars.forEach((ch, idx) => {
          const span = document.createElement("span");
          span.className = "ch";
          span.textContent = ch;
          span.style.fontSize = fontSize * scale + "px";
          if (ch === " ") {
            span.style.display = "inline";
            span.innerHTML = "&nbsp;";
          }
          if (idx < chars.length - 1) span.style.marginRight = perGap + "px";
          lineEl.appendChild(span);
        });
        linesEl.appendChild(lineEl);

        if (iWord >= words.length) break;
      }

      // ===== 세로 중앙 정렬: 패딩으로 전체 텍스트 블록을 아래로 살짝 이동 =====
      if (shapeTop != null && usedCenters.length) {
        const shapeMid = (shapeTop + shapeBottom) / 2;
        const textTop = usedCenters[0];
        const textBottom = usedCenters[usedCenters.length - 1];
        const textMid = (textTop + textBottom) / 2;

        let delta = shapeMid - textMid; // >0 이면 아래로 내려야 함
        if (delta < 0) delta = 0; // 위로 올리는 건 일단 막자

        linesEl.style.paddingTop = INNER_PAD_Y + delta + "px";
      } else {
        linesEl.style.paddingTop = INNER_PAD_Y + "px";
      }
    }

    // ===== 인터랙션 (path 전용) =====
    function screenToLocal(e) {
      const r = viz.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function findHoverIdx(mx, my) {
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i].x - mx,
          dy = pts[i].y - my;
        if (dx * dx + dy * dy <= hitR * hitR) return i;
      }
      return -1;
    }

    function updateCursor() {
      viz.style.cursor =
        hoverIdx !== -1 || dragging !== -1 ? "grab" : "default";
      if (dragging !== -1) viz.style.cursor = "grabbing";
    }

    const onMove = (e) => {
      if (mode !== "path") return;
      const { x, y } = screenToLocal(e);

      if (dragging !== -1) {
        const rect = stageRect();
        const W = rect.width,
          H = rect.height;
        const pad = paddingFor(W, H);
        const x0 = pad,
          y0 = pad,
          x1 = W - pad,
          y1 = H - pad;

        pts[dragging].x = clamp(x, x0, x1);
        pts[dragging].y = clamp(y, y0, y1);
        P = pathFromPts();
        layout();
      } else {
        const prev = hoverIdx;
        hoverIdx = findHoverIdx(x, y);
        if (hoverIdx !== prev) {
          // console.log hover enter/leave 생략
        }
        updateCursor();
        drawViz(viz.width, viz.height);

        viz.title =
          hoverIdx !== -1
            ? `#${hoverIdx}  x:${pts[hoverIdx].x.toFixed(1)}  y:${pts[
                hoverIdx
              ].y.toFixed(1)}`
            : "";
      }
    };

    const onDown = (e) => {
      if (mode !== "path") return;
      viz.setPointerCapture(e.pointerId);
      const { x, y } = screenToLocal(e);
      hoverIdx = findHoverIdx(x, y);
      if (hoverIdx !== -1) {
        dragging = hoverIdx;
        updateCursor();
      }
    };

    const onUp = (e) => {
      if (mode !== "path") return;
      viz.releasePointerCapture(e.pointerId);
      dragging = -1;
      updateCursor();
    };

    viz.addEventListener("pointermove", onMove);
    viz.addEventListener("pointerdown", onDown);
    viz.addEventListener("pointerup", onUp);

    listeners.push(() => {
      viz.removeEventListener("pointermove", onMove);
      viz.removeEventListener("pointerdown", onDown);
      viz.removeEventListener("pointerup", onUp);
    });

    // ===== 프리셋 모핑 =====
    function morphToPresetIndex(idx) {
      if (mode !== "path") {
        mode = "path";
        initPtsFromPreset(true);
      }

      const rect = stageRect();
      const W = rect.width,
        H = rect.height;
      const pad = paddingFor(W, H);
      const x0 = pad,
        y0 = pad,
        x1 = W - pad,
        y1 = H - pad;

      const targetNorm = presets[idx % presets.length];
      const target = targetNorm.map((p) => ({
        x: x0 + p.x * (x1 - x0),
        y: y0 + p.y * (y1 - y0),
      }));

      const n = target.length;

      const from = new Array(n).fill(0).map((_, i) => {
        if (!pts.length) return target[i]; // 처음 진입 시
        const srcIdx = Math.floor((i / n) * pts.length); // 0..len-1 균등
        return pts[srcIdx];
      });

      const to = target;

      const t0 = performance.now();
      const dur = 420;

      function step(now) {
        const t = Math.min(1, (now - t0) / dur);
        pts = from.map((p, i) => ({
          x: lerp(p.x, to[i].x, t),
          y: lerp(p.y, to[i].y, t),
        }));
        P = pathFromPts();
        layout();
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          // 5) 애니메이션 끝난 뒤에도 pts를 target으로 고정
          pts = to;
          P = pathFromPts();
          layout();
        }
      }
      requestAnimationFrame(step);
    }

    // ===== 툴바 버튼 연결 =====
    if (toolbar) {
      const buttons = toolbar.querySelectorAll("button");
      buttons.forEach((b) => {
        const handler = () => {
          const shape = b.dataset.shape;
          if (shape === "ellipse") {
            mode = "path";
            presetIdx = 0;
            morphToPresetIndex(presetIdx);
            return;
          }
          if (shape === "path") {
            mode = "path";
            initPtsFromPreset(true);
            layout();
            return;
          }
        };
        b.addEventListener("click", handler);
        listeners.push(() => b.removeEventListener("click", handler));
      });

      const shuffleBtn = toolbar.querySelector("#shuffle");
      if (shuffleBtn) {
        const onShuffle = () => {
          if (typeof dragging === "number" && dragging !== -1) return;
          const prev = presetIdx;
          let next = Math.floor(Math.random() * presets.length);
          if (next === prev && presets.length > 1)
            next = (next + 1) % presets.length;
          presetIdx = next;
          morphToPresetIndex(presetIdx);
        };
        shuffleBtn.addEventListener("click", onShuffle);
        listeners.push(() =>
          shuffleBtn.removeEventListener("click", onShuffle)
        );
      }
    }

    // ===== 리사이즈 =====
    const onResize = () => requestAnimationFrame(layout);
    window.addEventListener("resize", onResize);
    listeners.push(() => window.removeEventListener("resize", onResize));

    // ===== 첫 레이아웃 =====
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      if (mode === "path") initPtsFromPreset(true);
      layout();
    });

    // ===== 정리(cleanup) =====
    return () => {
      listeners.forEach((off) => off());
    };
  }, []);

  return (
    <div className="folded">
      <div className="stage" ref={stageRef}>
        <canvas className="shapeViz" ref={vizRef} />
        <div className="lines" ref={linesRef} />
        <div className="toolbar" ref={toolbarRef}>
          <button data-shape="path">Vector</button>
          <button id="shuffle">Shuffle</button>
        </div>
      </div>
    </div>
  );
}
