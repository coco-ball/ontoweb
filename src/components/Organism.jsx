// src/components/Organism.jsx
import { useEffect, useRef } from "react";
import Voronoi from "voronoi";

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
    const { view, Path, Point, Color, Tool, Group, Size, Rectangle } = paper;

    const tool = new Tool();

    // =========================
    // 1. 세포 모양 path + 마스크
    // =========================
    const CELL_POINTS = 10;
    const baseRadiusFn = () =>
      Math.min(view.size.width, view.size.height) * 0.16;
    let baseRadius = baseRadiusFn();

    let mousePos = view.center.clone();

    const noiseOffsets = Array.from(
      { length: CELL_POINTS },
      () => Math.random() * 1000
    );

    const cellPath = new Path({
      closed: true,
      strokeColor: null,
      fillColor: null,
    });
    cellPath.clipMask = true;

    const cellGroup = new Group({ clipped: true });
    cellGroup.addChild(cellPath);

    let cellTime = 0;
    const CELL_SPEED = 0.008;

    function updateCellPath() {
      cellPath.segments = [];

      const center = view.center;
      const mouseFactor = (mousePos.y - center.y) / (view.size.height / 2); // -1~1
      const dynamicBase = baseRadius * (1 + 0.2 * mouseFactor);

      for (let i = 0; i < CELL_POINTS; i++) {
        const angle = (i / CELL_POINTS) * Math.PI * 2;

        const noise = Math.sin(cellTime * 1.5 + noiseOffsets[i]);
        const wave = Math.sin(cellTime * 2.5 + i * 0.6);

        const jitter = 0.07 * noise + 0.05 * wave;
        const radius = dynamicBase * (1 + jitter);

        const offset = new Point(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius
        );
        const pt = center.add(offset);
        cellPath.add(pt);
      }

      cellPath.smooth({ type: "continuous" });
    }

    // 마우스는 잠시 비활성
    // tool.onMouseMove = (event) => {
    //   mousePos = event.point.clone();
    // };

    // =========================
    // 2. Voronoi 설정 (blob 주변 박스 안에서만)
    // =========================
    const voronoi = new Voronoi();

    // Voronoi를 계산할 영역: blob 주변 정사각형
    const VORONOI_AREA_SCALE = 2.4; // blob 반지름의 몇 배까지 셀 만들지
    const VORONOI_SPACING_FACTOR = 0.4; // 셀 간격 (작을수록 촘촘)

    let sites = [];
    let bbox; // { xl, xr, yt, yb }
    let bboxRect; // paper.Rectangle
    let oldSize = view.size.clone();

    const spotColor = new Color("#ffffff");
    let selected = false;

    let driftTime = 0;
    const DRIFT_SPEED = 0.02;
    const DRIFT_SCALE = 0.7;

    // 초기 셋업
    setupVoronoiArea();
    updateCellPath();
    renderDiagram();

    // ---- 메인 프레임 루프 ----
    const onFrame = () => {
      cellTime += CELL_SPEED;
      updateCellPath();

      driftTime += DRIFT_SPEED;
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        s.x += Math.sin(driftTime * 0.9 + i * 0.7) * DRIFT_SCALE;
        s.y += Math.cos(driftTime * 0.7 + i * 1.3) * DRIFT_SCALE;
      }

      renderDiagram();
    };

    const onMouseDown = (event) => {
      // 필요 없다면 이 부분 통째로 null로 둬도 됨
      sites.push(event.point.clone());
      renderDiagram();
    };

    const onKeyDown = (event) => {
      if (event.key === "space") {
        selected = !selected;
        renderDiagram();
      }
    };

    view.onFrame = onFrame;
    view.onMouseDown = null; // 마우스 인터랙션 off
    view.onResize = onResize;
    tool.onKeyDown = onKeyDown;

    // =========================
    // 3. Voronoi + 마스크 렌더
    // =========================
    function renderDiagram() {
      cellGroup.removeChildren();
      cellGroup.addChild(cellPath);

      const diagram = voronoi.compute(sites, {
        xl: bbox.xl,
        xr: bbox.xr,
        yt: bbox.yt,
        yb: bbox.yb,
      });

      if (!diagram) return;

      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        const cell = diagram.cells[site.voronoiId];
        if (!cell) continue;

        const halfedges = cell.halfedges;
        if (!halfedges || halfedges.length <= 2) continue;

        const points = [];
        for (let j = 0; j < halfedges.length; j++) {
          const v = halfedges[j].getEndpoint();
          points.push(new Point(v.x, v.y));
        }
        createVoronoiPath(points);
      }
    }

    function createVoronoiPath(points) {
      const path = new Path({ parent: cellGroup });
      path.fillColor = spotColor;
      path.closed = true;

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const next = points[(i + 1) % points.length];
        const vector = next.subtract(point).divide(2);
        path.add({
          point: point.add(vector),
          handleIn: vector.negate(),
          handleOut: vector,
        });
      }
      path.scale(0.97);
      removeSmallBits(path);
      return path;
    }

    function removeSmallBits(path) {
      const min = path.length / 80;
      for (let i = path.segments.length - 1; i >= 0; i--) {
        const segment = path.segments[i];
        const cur = segment.point;
        const nextSegment = segment.next;
        const next = nextSegment.point.add(nextSegment.handleIn);
        if (cur.getDistance(next) < min) segment.remove();
      }
    }

    // 🔹 blob 주변 박스 안에서만 BeeHive 포인트 생성
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

    // 박스 안에서만 육각형 그리드 포인트 생성
    function generateLocalBeeHivePoints(rect, spacing, loose) {
      const points = [];
      const col = new Point(spacing, spacing);

      const cols = Math.ceil(rect.width / col.x);
      const rows = Math.ceil(rect.height / col.y);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          let point = rect.topLeft.add(
            new Point(i + 0.5, j + 0.5).multiply(col)
          );

          if (j % 2) point = point.add(new Point(col.x / 2, 0));
          if (loose)
            point = point
              .add(col.divide(4).multiply(Point.random()))
              .subtract(col.divide(4));

          points.push(point);
        }
      }
      return points;
    }

    // ---- Resize ----
    function onResize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;

      view.viewSize = new Size(canvas.width, canvas.height);

      oldSize = view.size.clone();

      setupVoronoiArea();
      updateCellPath();
      renderDiagram();
    }

    // cleanup
    return () => {
      view.onMouseDown = null;
      view.onFrame = null;
      view.onResize = null;
      tool.onMouseMove = null;
      tool.onKeyDown = null;
      tool.remove();
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
