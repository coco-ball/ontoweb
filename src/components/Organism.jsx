// src/components/Organism.jsx
import { useEffect, useRef } from "react";
import Voronoi from "voronoi";

export default function Organism() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // StrictMode 대비

    const paper = window.paper;
    if (!canvas || !paper) {
      console.warn("canvas / paper not ready");
      return;
    }

    // Paper.js 준비
    paper.setup(canvas);
    const { view, Path, Point, Color, project, Tool } = paper;

    const tool = new Tool();

    // ======== Voronoi + 자동 움직임 ========
    const voronoi = new Voronoi();

    const DENSITY = 10; // 숫자 줄이면 셀 더 촘촘
    let sites = generateBeeHivePoints(view.size.divide(DENSITY), true);

    let bbox;
    let oldSize = view.size.clone();
    let spotColor = new Color("#7be7ef50");
    let selected = false;

    let t = 0;
    const DRIFT_SPEED = 0.03;
    const DRIFT_SCALE = 0.5;

    onResize();

    view.onMouseDown = onMouseDown;
    view.onFrame = onFrame;
    view.onResize = onResize;
    tool.onKeyDown = onKeyDown;

    function onFrame() {
      t += DRIFT_SPEED;

      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        s.x += Math.sin(t + i * 0.7) * DRIFT_SCALE;
        s.y += Math.cos(t + i * 1.3) * DRIFT_SCALE;
      }
      renderDiagram();
    }

    function onMouseDown(event) {
      sites.push(event.point.clone());
      renderDiagram();
    }

    function renderDiagram() {
      project.activeLayer.removeChildren();

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
        createPath(points);
      }
    }

    function removeSmallBits(path) {
      const min = path.length / 20;
      for (let i = path.segments.length - 1; i >= 0; i--) {
        const segment = path.segments[i];
        const cur = segment.point;
        const nextSegment = segment.next;
        const next = nextSegment.point.add(nextSegment.handleIn);
        if (cur.getDistance(next) < min) segment.remove();
      }
    }

    function generateBeeHivePoints(size, loose) {
      const points = [];
      const col = view.size.divide(size);

      for (let i = -1; i < size.width + 1; i++) {
        for (let j = -1; j < size.height + 1; j++) {
          let point = new Point(i, j)
            .divide(size)
            .multiply(view.size)
            .add(col.divide(2));

          if (j % 2) point = point.add(new Point(col.width / 2, 0));
          if (loose)
            point = point
              .add(col.divide(4).multiply(Point.random()))
              .subtract(col.divide(4));
          points.push(point);
        }
      }
      return points;
    }

    function createPath(points) {
      const path = new Path();
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

    function onResize() {
      const margin = 20;
      bbox = {
        xl: margin,
        xr: view.bounds.width - margin,
        yt: margin,
        yb: view.bounds.height - margin,
      };

      for (let i = 0; i < sites.length; i++) {
        sites[i] = sites[i].multiply(view.size).divide(oldSize);
      }
      oldSize = view.size.clone();
      renderDiagram();
    }

    function onKeyDown(event) {
      if (event.key === "space") {
        selected = !selected;
        renderDiagram();
      }
    }

    // cleanup
    return () => {
      view.onMouseDown = null;
      view.onFrame = null;
      view.onResize = null;
      tool.onKeyDown = null;
      tool.remove();
      project.clear();
    };
  }, []);

  return (
    <div className="organism-card">
      <canvas ref={canvasRef} className="organism-canvas" />
    </div>
  );
}
