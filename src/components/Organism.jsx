// src/components/Organism.jsx
import { useEffect, useRef } from "react";
import Voronoi from "voronoi";

import layer1Src from "../assets/layer1.jpg";
import layer2Src from "../assets/layer2.png";
import layer3Src from "../assets/layer3.png";
import layer4Src from "../assets/layer4.png";
import layer5Src from "../assets/layer5.png";

export default function Organism() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const paper = window.paper;
    if (!paper) {
      console.warn("paper not ready");
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    paper.setup(canvas);
    const { view, Path, Point, Color, Tool, Group, Size, Rectangle, Raster } =
      paper;

    const tool = new Tool();

    // =====================================================
    // 1. BLOB CELL PATH (MASK)
    // =====================================================
    const CELL_POINTS = 10;
    const baseRadiusFn = () =>
      Math.min(view.size.width, view.size.height) * 0.16;
    let baseRadius = baseRadiusFn();

    let mousePos = view.center.clone();
    const noiseOffsets = Array.from(
      { length: CELL_POINTS },
      () => Math.random() * 500
    );

    // 마스크 역할
    const cellPath = new Path({
      closed: true,
      strokeColor: null,
      fillColor: null,
    });
    cellPath.clipMask = true;

    // 마스크 + 내용 전체 컨테이너
    const cellGroup = new Group();
    cellGroup.clipped = true;
    cellGroup.addChild(cellPath);

    // Voronoi 전용 그룹
    const voronoiGroup = new Group({ parent: cellGroup });

    let cellTime = 0;
    const CELL_SPEED = 0.008;

    function updateCellPath() {
      cellPath.segments = [];

      const center = view.center;
      const mouseFactor = (mousePos.y - center.y) / (view.size.height / 2);
      const dynamicBase = baseRadius * (1 + 0.15 * mouseFactor);

      for (let i = 0; i < CELL_POINTS; i++) {
        const angle = (i / CELL_POINTS) * Math.PI * 2;

        const noise = Math.sin(cellTime * 2 + noiseOffsets[i]);
        const wave = Math.sin(cellTime * 4 + i * 0.4);

        const jitter = 0.04 * noise + 0.03 * wave;
        const radius = dynamicBase * (1 + jitter);

        const offset = new Point(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius
        );
        cellPath.add(center.add(offset));
      }

      cellPath.smooth({ type: "continuous" });
    }

    // 마우스 인터랙션 나중에 켜고 싶으면 주석 해제
    // tool.onMouseMove = (e) => {
    //   mousePos = e.point.clone();
    // };

    // =====================================================
    // 2. VORONOI (BLOB 주변 박스 안에서만)
    // =====================================================
    const voronoi = new Voronoi();

    const VORONOI_AREA_SCALE = 2.4;
    const VORONOI_SPACING_FACTOR = 0.25;

    let sites = [];
    let bboxRect; // paper.Rectangle
    let bbox; // { xl, xr, yt, yb }

    const spotColor = new Color(108, 138, 149, 0.4); // 살짝 투명한 흰색
    let driftTime = 0;
    const DRIFT_SPEED = 0.01;
    const DRIFT_SCALE = 0.3;

    function setupVoronoiArea() {
      baseRadius = baseRadiusFn();
      const center = view.center;

      const areaSize = new Size(
        baseRadius * VORONOI_AREA_SCALE * 2,
        baseRadius * VORONOI_AREA_SCALE * 2
      );

      bboxRect = new Rectangle(center.subtract(areaSize.divide(2)), areaSize);

      bbox = {
        xl: bboxRect.left,
        xr: bboxRect.right,
        yt: bboxRect.top,
        yb: bboxRect.bottom,
      };

      const spacing = baseRadius * VORONOI_SPACING_FACTOR;
      sites = generateLocalBeeHivePoints(bboxRect, spacing, true);
    }

    function generateLocalBeeHivePoints(rect, spacing, loose) {
      const pts = [];
      const col = new Point(spacing, spacing);

      const cols = Math.ceil(rect.width / col.x);
      const rows = Math.ceil(rect.height / col.y);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          let p = rect.topLeft.add(new Point(i + 0.5, j + 0.5).multiply(col));
          if (j % 2) p = p.add(new Point(col.x / 2, 0));

          if (loose) {
            p = p
              .add(col.divide(4).multiply(Point.random()))
              .subtract(col.divide(4));
          }

          pts.push(p);
        }
      }
      return pts;
    }

    // =====================================================
    // 3. TEXTURE LAYERS
    // =====================================================
    const textureLayers = [];

    function fitRasterToBBox(raster) {
      if (!bboxRect || !raster.width || !raster.height) return;

      raster.position = bboxRect.center;

      const scaleX = bboxRect.width / raster.width;
      const scaleY = bboxRect.height / raster.height;
      const scale = Math.max(scaleX, scaleY);

      raster.scale(scale / raster.scaling.x);
    }

    function createTextureLayers() {
      // 이미 만들어져 있으면 다시 만들지 않음
      if (textureLayers.length > 0) return;

      const configs = [
        { src: layer1Src, opacity: 0.5, blendMode: "normal" },
        { src: layer2Src, opacity: 0, blendMode: "overlay" },
        { src: layer3Src, opacity: 0.5, blendMode: "darken" }, // plus darker 느낌
        { src: layer4Src, opacity: 0.5, blendMode: "normal" },
        { src: layer5Src, opacity: 0.3, blendMode: "color-burn" },
      ];

      configs.forEach((cfg) => {
        const raster = new Raster({ source: cfg.src });
        raster.opacity = cfg.opacity;
        raster.blendMode = cfg.blendMode;
        raster.visible = false;

        raster.onLoad = () => {
          fitRasterToBBox(raster);
          raster.visible = true;
        };

        textureLayers.push(raster);
        cellGroup.addChild(raster); // 마스크 안에 넣기
      });

      // 디버깅
      console.log(
        textureLayers.map((l) => ({
          blendMode: l.blendMode,
          opacity: l.opacity,
        }))
      );
    }

    // =====================================================
    // 4. VORONOI + MASK + TEXTURE 렌더링
    // =====================================================
    function createVoronoiPath(points) {
      const path = new Path({
        parent: voronoiGroup,
        closed: true,
        fillColor: spotColor,
      });

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const n = points[(i + 1) % points.length];
        const v = n.subtract(p).divide(2);
        path.add({
          point: p.add(v),
          handleIn: v.negate(),
          handleOut: v,
        });
      }

      // path.scale(0.97);
      const GAP_SCALE = 0.92; // 0.85 ~ 0.95 사이에서 취향대로 조정
      path.scale(GAP_SCALE, path.bounds.center);
    }

    function renderDiagram() {
      voronoiGroup.removeChildren();

      const diagram = voronoi.compute(
        sites.map((p) => ({ x: p.x, y: p.y })),
        bbox
      );
      if (!diagram) return;

      for (let i = 0; i < sites.length; i++) {
        const cell = diagram.cells[i];
        if (!cell) continue;

        const edges = cell.halfedges;
        if (!edges || edges.length <= 2) continue;

        const pts = [];
        for (let j = 0; j < edges.length; j++) {
          const v = edges[j].getEndpoint();
          pts.push(new Point(v.x, v.y));
        }
        createVoronoiPath(pts);
      }

      // 텍스쳐를 항상 최상단으로
      textureLayers.forEach((layer) => layer.bringToFront());
    }

    // =====================================================
    // 5. FRAME / RESIZE / INIT
    // =====================================================
    view.onFrame = () => {
      cellTime += CELL_SPEED;
      updateCellPath();

      driftTime += DRIFT_SPEED;
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        s.x += Math.sin(driftTime + i * 0.7) * DRIFT_SCALE;
        s.y += Math.cos(driftTime + i * 0.9) * DRIFT_SCALE;
      }

      renderDiagram();
    };

    tool.onKeyDown = (e) => {
      if (e.key === "space") {
        // 필요하면 토글 인터랙션 넣기
      }
    };

    function onResize() {
      const dprNow = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dprNow;
      canvas.height = canvas.offsetHeight * dprNow;

      view.viewSize = new Size(canvas.width, canvas.height);

      setupVoronoiArea();
      updateCellPath();
      textureLayers.forEach((r) => fitRasterToBBox(r));
      renderDiagram();
    }

    view.onResize = onResize;

    // 초기 1회 세팅
    setupVoronoiArea();
    updateCellPath();
    createTextureLayers();
    renderDiagram();

    // cleanup
    return () => {
      view.onFrame = null;
      view.onResize = null;
      tool.onKeyDown = null;
      cellGroup.remove();
      paper.project.clear();
    };
  }, []);

  return (
    <div className="example-card organism-card">
      <canvas ref={canvasRef} className="organism-canvas" />
    </div>
  );
}
