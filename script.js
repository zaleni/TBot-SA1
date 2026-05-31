const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("[data-nav-links]");
const spatialCanvas = document.querySelector("[data-spatial-scene]");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

if (spatialCanvas) {
  const ctx = spatialCanvas.getContext("2d");

  if (ctx) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let points = [];
    let startedAt = performance.now();

    const palette = [
      [23, 109, 122],
      [60, 111, 190],
      [92, 151, 172],
      [25, 36, 57],
    ];
    const groundPlaneY = 1.72;
    const tableCenterY = 0.82;
    const tableHalfHeight = 0.11;
    const tableTopY = tableCenterY - tableHalfHeight - 0.012;
    const tableBottomY = tableCenterY + tableHalfHeight;

    const resizeScene = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = spatialCanvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      spatialCanvas.width = Math.max(1, Math.floor(width * ratio));
      spatialCanvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = Math.max(64, Math.min(112, Math.floor(width / 16)));
      points = Array.from({ length: count }, (_, index) => ({
        x: (Math.random() - 0.5) * 6.6 + 0.18,
        y: 0.12 + Math.random() * 1.28,
        z: (Math.random() - 0.5) * 4.1,
        phase: Math.random() * Math.PI * 2,
        amp: 0.03 + Math.random() * 0.13,
        size: 0.7 + Math.random() * 1.65,
        color: palette[index % palette.length],
      }));
    };

    const rotate = (point, time) => {
      const yaw = time * 0.075;
      const pitch = 0.18 + Math.sin(time * 0.18) * 0.025;
      const roll = Math.sin(time * 0.13) * 0.018;

      let x = point.x;
      let y = point.y;
      let z = point.z;

      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      [x, z] = [x * cy - z * sy, x * sy + z * cy];

      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      [y, z] = [y * cp - z * sp, y * sp + z * cp];

      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      [x, y] = [x * cr - y * sr, x * sr + y * cr];

      return { x, y, z };
    };

    const project = (point, time) => {
      const rotated = rotate(point, time);
      const focal = Math.min(width, 1180) * 0.72;
      const depth = focal / (focal + rotated.z * 92 + 360);
      const scale = Math.min(width, height) * 0.195;

      return {
        x: width / 2 + rotated.x * scale * depth,
        y: height * 0.44 + rotated.y * scale * depth,
        z: rotated.z,
        d: depth,
      };
    };

    const color = (rgb, alpha) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

    const drawLine = (a, b, alpha, lineWidth = 1) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(23, 109, 122, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    const drawColoredLine = (a, b, strokeStyle, lineWidth = 1) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    const drawGrid = (time) => {
      const corners = [
        { x: -5.6, y: groundPlaneY, z: -3.35 },
        { x: 5.6, y: groundPlaneY, z: -3.35 },
        { x: 5.6, y: groundPlaneY, z: 3.35 },
        { x: -5.6, y: groundPlaneY, z: 3.35 },
      ].map((point) => project(point, time));

      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      corners.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fillStyle = "rgba(236, 248, 252, 0.026)";
      ctx.fill();
      ctx.strokeStyle = "rgba(23, 109, 122, 0.055)";
      ctx.lineWidth = 0.75;
      ctx.stroke();

      const lines = [];
      for (let i = -5; i <= 5; i += 1) {
        lines.push({
          a: { x: i, y: groundPlaneY, z: -3.35 },
          b: { x: i, y: groundPlaneY, z: 3.35 },
          major: i === 0 || i === -5 || i === 5,
        });
      }

      for (let i = -3; i <= 3; i += 1) {
        lines.push({
          a: { x: -5.6, y: groundPlaneY, z: i },
          b: { x: 5.6, y: groundPlaneY, z: i },
          major: i === 0 || i === -3 || i === 3,
        });
      }

      for (const line of lines) {
        drawLine(project(line.a, time), project(line.b, time), line.major ? 0.04 : 0.022, line.major ? 0.72 : 0.55);
      }

      const diagonalA = [project({ x: -5.6, y: groundPlaneY, z: -3.35 }, time), project({ x: 5.6, y: groundPlaneY, z: 3.35 }, time)];
      const diagonalB = [project({ x: 5.6, y: groundPlaneY, z: -3.35 }, time), project({ x: -5.6, y: groundPlaneY, z: 3.35 }, time)];
      drawLine(diagonalA[0], diagonalA[1], 0.012, 0.48);
      drawLine(diagonalB[0], diagonalB[1], 0.012, 0.48);
    };

    const drawCuboid = (center, size, time, alpha) => {
      const [sx, sy, sz] = size;
      const vertices = [
        [-sx, -sy, -sz],
        [sx, -sy, -sz],
        [sx, sy, -sz],
        [-sx, sy, -sz],
        [-sx, -sy, sz],
        [sx, -sy, sz],
        [sx, sy, sz],
        [-sx, sy, sz],
      ].map(([x, y, z]) => project({ x: x + center.x, y: y + center.y, z: z + center.z }, time));

      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ];

      for (const [a, b] of edges) {
        drawLine(vertices[a], vertices[b], alpha, 1.05);
      }
    };

    const drawPolygon = (points2d, fillStyle, strokeStyle, lineWidth = 1) => {
      ctx.beginPath();
      ctx.moveTo(points2d[0].x, points2d[0].y);
      points2d.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();

      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }

      if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const drawBox = (center, size, time, options = {}) => {
      const [sx, sy, sz] = size;
      const vertices = [
        [-sx, -sy, -sz],
        [sx, -sy, -sz],
        [sx, sy, -sz],
        [-sx, sy, -sz],
        [-sx, -sy, sz],
        [sx, -sy, sz],
        [sx, sy, sz],
        [-sx, sy, sz],
      ].map(([x, y, z]) => project({ x: x + center.x, y: y + center.y, z: z + center.z }, time));

      const faceDefaults = {
        top: "rgba(238, 250, 253, 0.34)",
        bottom: "rgba(77, 128, 151, 0.06)",
        left: "rgba(23, 109, 122, 0.1)",
        right: "rgba(60, 111, 190, 0.08)",
        front: "rgba(23, 109, 122, 0.13)",
        back: "rgba(96, 151, 172, 0.07)",
      };
      const faces = [
        { name: "top", index: [0, 1, 5, 4] },
        { name: "bottom", index: [3, 2, 6, 7] },
        { name: "left", index: [0, 3, 7, 4] },
        { name: "right", index: [1, 2, 6, 5] },
        { name: "back", index: [0, 1, 2, 3] },
        { name: "front", index: [4, 5, 6, 7] },
      ].map((face) => ({
        ...face,
        depth: face.index.reduce((sum, vertex) => sum + vertices[vertex].z, 0) / face.index.length,
      }));

      faces
        .sort((a, b) => b.depth - a.depth)
        .forEach((face) => {
          drawPolygon(
            face.index.map((vertex) => vertices[vertex]),
            options[face.name] || faceDefaults[face.name],
            options.stroke || "rgba(23, 109, 122, 0.2)",
            options.lineWidth || 1
          );
        });

      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ];

      for (const [a, b] of edges) {
        drawLine(vertices[a], vertices[b], options.edgeAlpha || 0.18, options.edgeWidth || 0.9);
      }
    };

    const drawSurfacePath = (path, time, strokeStyle, lineWidth = 1, fillStyle = "") => {
      const projected = path.map((point) => project(point, time));
      ctx.beginPath();
      projected.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();

      if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
      }

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    const drawSurfaceEllipse = (center, radiusX, radiusZ, time, alpha, fillAlpha = 0) => {
      const samples = [];
      for (let i = 0; i < 72; i += 1) {
        const theta = (Math.PI * 2 * i) / 72;
        samples.push({
          x: center.x + Math.cos(theta) * radiusX,
          y: center.y,
          z: center.z + Math.sin(theta) * radiusZ,
        });
      }

      drawSurfacePath(
        samples,
        time,
        `rgba(60, 111, 190, ${alpha})`,
        1,
        fillAlpha ? `rgba(60, 111, 190, ${fillAlpha})` : ""
      );

      const horizontal = [
        { x: center.x - radiusX, y: center.y, z: center.z },
        { x: center.x + radiusX, y: center.y, z: center.z },
      ].map((point) => project(point, time));
      const vertical = [
        { x: center.x, y: center.y, z: center.z - radiusZ },
        { x: center.x, y: center.y, z: center.z + radiusZ },
      ].map((point) => project(point, time));
      drawLine(horizontal[0], horizontal[1], alpha * 0.54, 0.75);
      drawLine(vertical[0], vertical[1], alpha * 0.54, 0.75);
    };

    const drawSpatialHalo = (center, radius, time, alpha = 0.14, phase = 0) => {
      const samples = [];
      for (let i = 0; i < 84; i += 1) {
        const theta = (Math.PI * 2 * i) / 84;
        samples.push({
          x: center.x + Math.cos(theta) * radius,
          y: center.y + Math.sin(theta * 2 + time * 0.42 + phase) * 0.022,
          z: center.z + Math.sin(theta) * radius * 0.68,
        });
      }

      drawSurfacePath(samples, time, `rgba(60, 111, 190, ${alpha * 1.18})`, 1.08);

      for (let i = 0; i < 4; i += 1) {
        const theta = time * 0.32 + phase + i * (Math.PI / 2);
        const dot = project(
          {
            x: center.x + Math.cos(theta) * radius,
            y: center.y + Math.sin(theta * 2) * 0.022,
            z: center.z + Math.sin(theta) * radius * 0.68,
          },
          time
        );
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 3.8 * dot.d, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + dot.d * 0.18})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(23, 109, 122, ${alpha * 1.55})`;
        ctx.lineWidth = 0.95;
        ctx.stroke();
      }
    };

    const drawSurfaceConstellation = (topY, time) => {
      const anchors = [
        { x: -2.78, z: -0.84, phase: 0.2 },
        { x: -2.16, z: 0.22, phase: 1.2 },
        { x: -1.34, z: 0.98, phase: 2.1 },
        { x: -0.42, z: -0.62, phase: 2.8 },
        { x: 0.74, z: 0.46, phase: 3.6 },
        { x: 1.64, z: -0.82, phase: 4.3 },
        { x: 2.62, z: 0.52, phase: 5.1 },
      ].map((anchor) => ({
        ...project(
          {
            x: anchor.x,
            y: topY - 0.035 + Math.sin(time * 0.54 + anchor.phase) * 0.02,
            z: anchor.z,
          },
          time
        ),
        phase: anchor.phase,
      }));

      for (let i = 0; i < anchors.length - 1; i += 1) {
        drawLine(anchors[i], anchors[i + 1], 0.11, 0.95);
      }

      for (const anchor of anchors) {
        const radius = 3.6 + Math.sin(time * 0.7 + anchor.phase) * 0.7;
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, radius * anchor.d, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
        ctx.fill();
        ctx.strokeStyle = "rgba(60, 111, 190, 0.24)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const drawProjectedEllipse = (center, radiusX, radiusZ, time, options = {}) => {
      const samples = [];
      const count = options.count || 76;
      for (let i = 0; i < count; i += 1) {
        const theta = (Math.PI * 2 * i) / count;
        samples.push({
          x: center.x + Math.cos(theta) * radiusX,
          y: center.y,
          z: center.z + Math.sin(theta) * radiusZ,
        });
      }

      drawSurfacePath(samples, time, options.stroke || "rgba(23, 109, 122, 0.18)", options.lineWidth || 1, options.fill || "");
      return samples.map((point) => project(point, time));
    };

    const drawProjectedBand = (lower, upper, start, end, fillStyle, strokeStyle, lineWidth = 0.8) => {
      const lowerArc = lower.slice(start, end + 1);
      const upperArc = upper.slice(start, end + 1).reverse();
      const band = [...lowerArc, ...upperArc];

      drawPolygon(band, fillStyle, strokeStyle, lineWidth);
    };

    const drawProjectedHull = (points, fillStyle, strokeStyle = "", lineWidth = 0.8) => {
      const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
      const cross = (origin, a, b) => (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
      const lower = [];
      const upper = [];

      for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
          lower.pop();
        }
        lower.push(point);
      }

      for (const point of sorted.slice().reverse()) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
          upper.pop();
        }
        upper.push(point);
      }

      const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
      if (hull.length > 2) {
        drawPolygon(hull, fillStyle, strokeStyle, lineWidth);
      }
    };

    const drawDish = (center, radiusX, radiusZ, time) => {
      const bottom = drawProjectedEllipse({ ...center, y: center.y + 0.052 }, radiusX * 0.82, radiusZ * 0.42, time, {
        fill: "rgba(185, 120, 79, 0.07)",
        stroke: "rgba(185, 120, 79, 0.18)",
        lineWidth: 0.75,
      });
      const rim = drawProjectedEllipse(center, radiusX, radiusZ, time, {
        fill: "rgba(255, 250, 244, 0.36)",
        stroke: "rgba(185, 120, 79, 0.34)",
        lineWidth: 1.15,
      });
      drawProjectedBand(bottom, rim, 0, bottom.length - 1, "rgba(255, 241, 224, 0.18)", "rgba(185, 120, 79, 0.12)", 0.5);
      drawProjectedBand(bottom, rim, 6, 36, "rgba(185, 120, 79, 0.1)", "rgba(185, 120, 79, 0.14)", 0.65);
      drawProjectedBand(bottom, rim, 45, 72, "rgba(213, 159, 104, 0.08)", "rgba(213, 159, 104, 0.11)", 0.55);
      drawProjectedEllipse(center, radiusX, radiusZ, time, {
        fill: "rgba(255, 250, 244, 0.24)",
        stroke: "rgba(185, 120, 79, 0.38)",
        lineWidth: 1.2,
      });
      drawProjectedEllipse({ ...center, y: center.y - 0.02 }, radiusX * 0.72, radiusZ * 0.62, time, {
        fill: "rgba(213, 159, 104, 0.11)",
        stroke: "rgba(213, 159, 104, 0.3)",
        lineWidth: 1,
      });
      drawProjectedEllipse({ ...center, y: center.y - 0.026 }, radiusX * 0.42, radiusZ * 0.34, time, {
        fill: "rgba(185, 120, 79, 0.05)",
        stroke: "rgba(185, 120, 79, 0.15)",
        lineWidth: 0.75,
      });

      const glint = [
        project({ x: center.x - radiusX * 0.48, y: center.y - 0.024, z: center.z - radiusZ * 0.12 }, time),
        project({ x: center.x + radiusX * 0.18, y: center.y - 0.024, z: center.z - radiusZ * 0.32 }, time),
      ];
      drawColoredLine(glint[0], glint[1], "rgba(255, 250, 244, 0.62)", 1);
    };

    const drawBottle = (base, height, radius, time) => {
      const top = { x: base.x, y: base.y - height, z: base.z };
      const shoulder = { x: base.x, y: base.y - height * 0.72, z: base.z };
      const neckTop = { x: base.x, y: base.y - height * 1.06, z: base.z };

      const bodyBase = drawProjectedEllipse(base, radius, radius, time, {
        fill: "rgba(229, 250, 244, 0.34)",
        stroke: "rgba(20, 130, 104, 0.34)",
        lineWidth: 1.15,
      });
      const bodyTop = drawProjectedEllipse(shoulder, radius * 0.68, radius * 0.68, time, {
        fill: "rgba(247, 255, 251, 0.26)",
        stroke: "rgba(84, 178, 159, 0.28)",
        lineWidth: 1.05,
      });
      const neck = drawProjectedEllipse(top, radius * 0.28, radius * 0.28, time, {
        fill: "rgba(247, 255, 251, 0.28)",
        stroke: "rgba(20, 130, 104, 0.3)",
        lineWidth: 1,
      });
      const mouth = drawProjectedEllipse(neckTop, radius * 0.24, radius * 0.24, time, {
        fill: "rgba(247, 255, 251, 0.38)",
        stroke: "rgba(20, 130, 104, 0.36)",
        lineWidth: 1.05,
      });

      const fullBandEnd = bodyBase.length - 1;
      drawProjectedHull([...bodyBase, ...bodyTop], "rgba(212, 244, 234, 0.24)", "rgba(20, 130, 104, 0.09)", 0.5);
      drawProjectedHull([...bodyTop, ...neck], "rgba(220, 248, 240, 0.2)", "rgba(20, 130, 104, 0.08)", 0.46);
      drawProjectedHull([...neck, ...mouth], "rgba(212, 244, 234, 0.22)", "rgba(20, 130, 104, 0.095)", 0.46);
      drawProjectedBand(bodyBase, bodyTop, 6, 34, "rgba(20, 130, 104, 0.16)", "rgba(20, 130, 104, 0.18)", 0.7);
      drawProjectedBand(bodyBase, bodyTop, 44, 70, "rgba(84, 178, 159, 0.1)", "rgba(84, 178, 159, 0.13)", 0.65);
      drawProjectedBand(bodyTop, neck, 7, 32, "rgba(230, 250, 244, 0.16)", "rgba(20, 130, 104, 0.15)", 0.65);
      drawProjectedBand(neck, mouth, 7, 34, "rgba(20, 130, 104, 0.18)", "rgba(20, 130, 104, 0.18)", 0.7);
      drawProjectedBand(neck, mouth, 44, 70, "rgba(84, 178, 159, 0.12)", "rgba(84, 178, 159, 0.14)", 0.65);

      const labelLower = drawProjectedEllipse({ x: base.x, y: base.y - height * 0.36, z: base.z }, radius * 0.84, radius * 0.84, time, {
        stroke: "rgba(20, 130, 104, 0.1)",
        lineWidth: 0.6,
      });
      const labelUpper = drawProjectedEllipse({ x: base.x, y: base.y - height * 0.5, z: base.z }, radius * 0.78, radius * 0.78, time, {
        stroke: "rgba(84, 178, 159, 0.1)",
        lineWidth: 0.6,
      });
      drawProjectedHull([...labelLower, ...labelUpper], "rgba(255, 255, 255, 0.24)", "rgba(20, 130, 104, 0.09)", 0.45);
      drawProjectedBand(labelLower, labelUpper, 8, 34, "rgba(84, 178, 159, 0.13)", "rgba(20, 130, 104, 0.14)", 0.55);

      drawProjectedEllipse(base, radius, radius, time, {
        stroke: "rgba(20, 130, 104, 0.36)",
        lineWidth: 1.25,
      });
      drawProjectedEllipse(shoulder, radius * 0.68, radius * 0.68, time, {
        stroke: "rgba(84, 178, 159, 0.28)",
        lineWidth: 1.1,
      });
      drawProjectedEllipse(top, radius * 0.28, radius * 0.28, time, {
        stroke: "rgba(20, 130, 104, 0.32)",
        lineWidth: 1.05,
      });
      drawProjectedEllipse(neckTop, radius * 0.24, radius * 0.24, time, {
        stroke: "rgba(20, 130, 104, 0.38)",
        lineWidth: 1.1,
      });

      const sidePairs = [
        [bodyBase[8], bodyTop[8]],
        [bodyBase[30], bodyTop[30]],
        [bodyTop[6], neck[6]],
        [bodyTop[32], neck[32]],
        [neck[7], mouth[7]],
        [neck[34], mouth[34]],
      ];

      for (const [a, b] of sidePairs) {
        drawColoredLine(a, b, "rgba(20, 130, 104, 0.3)", 1.18);
      }

      const highlight = [
        project({ x: base.x - radius * 0.42, y: base.y - height * 0.18, z: base.z - radius * 0.16 }, time),
        project({ x: base.x - radius * 0.26, y: base.y - height * 0.88, z: base.z - radius * 0.1 }, time),
      ];
      drawColoredLine(highlight[0], highlight[1], "rgba(247, 255, 251, 0.72)", 1.32);
    };

    const drawSmallCylinder = (center, radius, height, time, accent = "teal") => {
      const fill = accent === "blue" ? "rgba(60, 111, 190, 0.18)" : "rgba(23, 109, 122, 0.18)";
      const stroke = accent === "blue" ? "rgba(60, 111, 190, 0.32)" : "rgba(23, 109, 122, 0.32)";
      const base = drawProjectedEllipse(center, radius, radius, time, {
        fill,
        stroke,
        lineWidth: 0.85,
      });
      const top = drawProjectedEllipse({ ...center, y: center.y - height }, radius * 0.9, radius * 0.9, time, {
        fill: "rgba(255, 255, 255, 0.16)",
        stroke,
        lineWidth: 0.85,
      });
      drawProjectedBand(base, top, 8, 38, accent === "blue" ? "rgba(60, 111, 190, 0.16)" : "rgba(23, 109, 122, 0.16)", stroke, 0.75);
      drawProjectedBand(base, top, 46, 68, accent === "blue" ? "rgba(60, 111, 190, 0.08)" : "rgba(23, 109, 122, 0.08)", stroke, 0.65);
      drawProjectedEllipse(center, radius, radius, time, {
        stroke,
        lineWidth: 0.9,
      });
      drawProjectedEllipse({ ...center, y: center.y - height }, radius * 0.9, radius * 0.9, time, {
        stroke,
        lineWidth: 0.9,
      });
      drawLine(base[14], top[14], 0.18, 0.9);
      drawLine(base[38], top[38], 0.18, 0.9);
    };

    const drawTableSurfaceGrid = (table, time) => {
      const topY = table.center.y - table.size[1] - 0.012;
      const [sx, , sz] = table.size;

      for (let x = -3; x <= 3; x += 1) {
        drawLine(
          project({ x: table.center.x + (x * sx) / 3, y: topY, z: table.center.z - sz * 0.86 }, time),
          project({ x: table.center.x + (x * sx) / 3, y: topY, z: table.center.z + sz * 0.86 }, time),
          0.055,
          0.75
        );
      }

      for (let z = -2; z <= 2; z += 1) {
        drawLine(
          project({ x: table.center.x - sx * 0.9, y: topY, z: table.center.z + (z * sz) / 2 }, time),
          project({ x: table.center.x + sx * 0.9, y: topY, z: table.center.z + (z * sz) / 2 }, time),
          0.05,
          0.75
        );
      }

      drawSurfaceEllipse({ x: table.center.x + 2.18, y: topY - 0.01, z: table.center.z - 0.58 }, 0.58, 0.36, time, 0.14, 0.012);
      drawSurfaceEllipse({ x: table.center.x - 1.92, y: topY - 0.01, z: table.center.z + 0.78 }, 0.34, 0.22, time, 0.1, 0.008);
    };

    const drawWorkspaceVolume = (time) => {
      drawCuboid({ x: 0.18, y: 0.26, z: 0.02 }, [4.2, 0.92, 1.72], time, 0.045);

      const camera = project({ x: -3.65, y: -0.72, z: -1.82 }, time);
      const frame = [
        { x: -2.15, y: 0.06, z: -1.28 },
        { x: 2.42, y: 0.06, z: -1.28 },
        { x: 2.42, y: 1.02, z: 1.32 },
        { x: -2.15, y: 1.02, z: 1.32 },
      ].map((point) => project(point, time));

      for (const corner of frame) {
        drawLine(camera, corner, 0.036, 0.75);
      }

      drawPolygon(frame, "rgba(60, 111, 190, 0.012)", "rgba(60, 111, 190, 0.052)", 0.75);
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 5.5 * camera.d, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(23, 109, 122, 0.11)";
      ctx.fill();
    };

    const drawCoordinateFrame = (origin, time) => {
      const base = project(origin, time);
      const axes = [
        { end: { x: origin.x + 0.64, y: origin.y, z: origin.z }, color: "rgba(60, 111, 190, 0.34)" },
        { end: { x: origin.x, y: origin.y - 0.54, z: origin.z }, color: "rgba(23, 109, 122, 0.34)" },
        { end: { x: origin.x, y: origin.y, z: origin.z + 0.64 }, color: "rgba(185, 120, 79, 0.28)" },
      ];

      for (const axis of axes) {
        const end = project(axis.end, time);
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(end.x, end.y, 3.1 * end.d, 0, Math.PI * 2);
        ctx.fillStyle = axis.color;
        ctx.fill();
      }
    };

    const drawTabletopObjects = (topY, time) => {
      drawBox(
        { x: -3.05, y: topY - 0.15, z: -1.02 },
        [0.26, 0.15, 0.26],
        time + 0.18,
        {
          top: "rgba(232, 248, 249, 0.2)",
          left: "rgba(23, 109, 122, 0.055)",
          front: "rgba(60, 111, 190, 0.055)",
          stroke: "rgba(23, 109, 122, 0.095)",
          edgeAlpha: 0.08,
        }
      );
      drawBox(
        { x: -2.94, y: topY - 0.41, z: -1.0 },
        [0.17, 0.11, 0.17],
        time + 0.52,
        {
          top: "rgba(240, 252, 249, 0.26)",
          left: "rgba(20, 130, 104, 0.07)",
          right: "rgba(84, 178, 159, 0.055)",
          front: "rgba(60, 111, 190, 0.055)",
          stroke: "rgba(20, 130, 104, 0.13)",
          edgeAlpha: 0.11,
        }
      );
      drawBox(
        { x: -0.42, y: topY - 0.09, z: -1.3 },
        [0.66, 0.09, 0.22],
        time + 0.42,
        {
          top: "rgba(244, 250, 253, 0.18)",
          left: "rgba(96, 151, 172, 0.045)",
          front: "rgba(23, 109, 122, 0.045)",
          stroke: "rgba(60, 111, 190, 0.085)",
          edgeAlpha: 0.075,
        }
      );
      drawBox(
        { x: 2.86, y: topY - 0.15, z: -1.08 },
        [0.22, 0.15, 0.44],
        time + 0.68,
        {
          top: "rgba(236, 246, 255, 0.2)",
          left: "rgba(60, 111, 190, 0.05)",
          front: "rgba(23, 109, 122, 0.05)",
          stroke: "rgba(60, 111, 190, 0.09)",
          edgeAlpha: 0.075,
        }
      );

      drawBox(
        { x: 2.72, y: topY - 0.055, z: 1.08 },
        [0.42, 0.055, 0.28],
        time + 0.2,
        {
          top: "rgba(235, 248, 255, 0.16)",
          left: "rgba(60, 111, 190, 0.045)",
          front: "rgba(23, 109, 122, 0.045)",
          stroke: "rgba(60, 111, 190, 0.08)",
          edgeAlpha: 0.065,
        }
      );

      drawBox(
        { x: -2.82, y: topY - 0.09, z: 1.16 },
        [0.18, 0.09, 0.18],
        time + 0.9,
        {
          top: "rgba(241, 252, 249, 0.18)",
          left: "rgba(23, 109, 122, 0.045)",
          front: "rgba(60, 111, 190, 0.045)",
          stroke: "rgba(23, 109, 122, 0.08)",
          edgeAlpha: 0.065,
        }
      );

      drawBottle({ x: -1.36, y: topY - 0.03, z: -0.38 }, 0.86, 0.22, time);
      drawDish({ x: 1.16, y: topY - 0.024, z: 0.48 }, 0.56, 0.34, time);
      drawSmallCylinder({ x: 0.08, y: topY - 0.016, z: 1.02 }, 0.16, 0.2, time, "blue");
      drawSmallCylinder({ x: 2.08, y: topY - 0.016, z: -0.06 }, 0.13, 0.16, time, "teal");

      drawSpatialHalo({ x: -1.36, y: topY - 0.52, z: -0.38 }, 0.58, time, 0.13, 0.4);
      drawSpatialHalo({ x: 1.16, y: topY - 0.36, z: 0.48 }, 0.78, time, 0.105, 2.2);

      const puck = project({ x: 2.18, y: topY - 0.1, z: -0.58 }, time);
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, 7.2 * puck.d, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(23, 109, 122, 0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(23, 109, 122, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawTableScene = (time) => {
      const table = {
        center: { x: 0.12, y: tableCenterY, z: 0.03 },
        size: [5.08, tableHalfHeight, 2.04],
      };
      const topY = tableTopY;
      const legHalfHeight = (groundPlaneY - tableBottomY) / 2;
      const legCenterY = tableBottomY + legHalfHeight;
      const legOptions = {
        top: "rgba(235, 247, 251, 0.12)",
        left: "rgba(23, 109, 122, 0.066)",
        right: "rgba(60, 111, 190, 0.05)",
        front: "rgba(23, 109, 122, 0.072)",
        back: "rgba(96, 151, 172, 0.044)",
        stroke: "rgba(23, 109, 122, 0.064)",
        edgeAlpha: 0.052,
      };

      const shadow = project({ x: table.center.x, y: groundPlaneY + 0.02, z: table.center.z }, time);
      ctx.save();
      ctx.translate(shadow.x, shadow.y);
      ctx.rotate(-0.06);
      ctx.scale(1, 0.34);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.min(width, 920) * 0.23 * shadow.d, 86 * shadow.d, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(21, 32, 51, 0.026)";
      ctx.fill();
      ctx.restore();

      [
        [-4.35, -1.54],
        [4.42, -1.54],
        [-4.35, 1.56],
        [4.42, 1.56],
      ].forEach(([x, z]) => {
        drawBox({ x: table.center.x + x, y: legCenterY, z: table.center.z + z }, [0.075, legHalfHeight, 0.075], time, legOptions);
      });

      drawBox(table.center, table.size, time, {
        top: "rgba(239, 250, 254, 0.22)",
        bottom: "rgba(23, 109, 122, 0.036)",
        left: "rgba(23, 109, 122, 0.08)",
        right: "rgba(60, 111, 190, 0.06)",
        front: "rgba(23, 109, 122, 0.1)",
        back: "rgba(96, 151, 172, 0.05)",
        stroke: "rgba(23, 109, 122, 0.16)",
        edgeAlpha: 0.14,
        lineWidth: 0.85,
      });

      drawTableSurfaceGrid(table, time);
      drawSurfaceConstellation(topY, time);
      drawCoordinateFrame({ x: table.center.x - 3.2, y: topY - 0.02, z: table.center.z - 1.18 }, time);
      drawTabletopObjects(topY, time);
    };

    const drawTargetMarker = (point, time, labelAlpha = 0.22) => {
      const projected = project(point, time);
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, 11 * projected.d, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(60, 111, 190, ${labelAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(projected.x - 16 * projected.d, projected.y);
      ctx.lineTo(projected.x + 16 * projected.d, projected.y);
      ctx.moveTo(projected.x, projected.y - 16 * projected.d);
      ctx.lineTo(projected.x, projected.y + 16 * projected.d);
      ctx.strokeStyle = `rgba(23, 109, 122, ${labelAlpha * 0.72})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    };

    const drawActionTrajectory = (time) => {
      const samples = [];
      const start = { x: -1.18, y: tableTopY - 0.44, z: -0.38 };
      const end = { x: 1.16, y: tableTopY - 0.055, z: 0.48 };

      for (let i = 0; i <= 86; i += 1) {
        const t = i / 86;
        const arc = Math.sin(t * Math.PI);
        samples.push(
          project(
            {
              x: start.x + (end.x - start.x) * t,
              y: start.y + (end.y - start.y) * t - arc * 0.34 + Math.sin(time * 0.35) * 0.018,
              z: start.z + (end.z - start.z) * t + Math.sin(t * Math.PI * 1.2 + time * 0.22) * 0.11,
            },
            time
          )
        );
      }

      const drawPath = (strokeStyle, lineWidth) => {
        ctx.beginPath();
        samples.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      };

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const mainGradient = ctx.createLinearGradient(samples[0].x, samples[0].y, samples[samples.length - 1].x, samples[samples.length - 1].y);
      mainGradient.addColorStop(0, "rgba(74, 95, 210, 0.5)");
      mainGradient.addColorStop(0.58, "rgba(105, 80, 185, 0.56)");
      mainGradient.addColorStop(1, "rgba(60, 111, 190, 0.46)");

      drawPath("rgba(255, 255, 255, 0.68)", 6.4);
      drawPath("rgba(105, 80, 185, 0.18)", 4.2);
      drawPath(mainGradient, 2.35);
      ctx.restore();

      for (let i = 10; i < samples.length; i += 22) {
        const pulse = 1 + Math.sin(time * 1.1 + i * 0.2) * 0.12;
        ctx.beginPath();
        ctx.arc(samples[i].x, samples[i].y, 7.6 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(105, 80, 185, 0.055)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(samples[i].x, samples[i].y, 4.3 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
        ctx.fill();
        ctx.strokeStyle = "rgba(74, 95, 210, 0.32)";
        ctx.lineWidth = 1.05;
        ctx.stroke();
      }

      const startProjected = project(start, time);
      const endProjected = project(end, time);
      for (const [point, alpha] of [
        [startProjected, 0.24],
        [endProjected, 0.3],
      ]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7.6 * point.d, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(105, 80, 185, 0.055)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5.4 * point.d, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
        ctx.fill();
        ctx.strokeStyle = `rgba(74, 95, 210, ${alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      const head = samples[samples.length - 1];
      const tail = samples[samples.length - 6];
      const angle = Math.atan2(head.y - tail.y, head.x - tail.x);
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -4.5);
      ctx.lineTo(-8, 4.5);
      ctx.closePath();
      ctx.fillStyle = "rgba(105, 80, 185, 0.5)";
      ctx.fill();
      ctx.restore();
    };

    const renderScene = (time) => {
      ctx.clearRect(0, 0, width, height);

      drawGrid(time);
      drawWorkspaceVolume(time);
      drawTableScene(time);
      drawActionTrajectory(time);
      drawTargetMarker({ x: 2.18, y: tableTopY - 0.1, z: -0.58 }, time, 0.14);

      const projected = points.map((point) => {
        const local = {
          x: point.x + Math.sin(time * 0.75 + point.phase) * point.amp,
          y: point.y + Math.cos(time * 0.62 + point.phase) * point.amp,
          z: point.z + Math.sin(time * 0.45 + point.phase) * point.amp * 1.5,
        };
        return { ...project(local, time), source: point };
      });

      for (let i = 0; i < projected.length; i += 1) {
        for (let j = i + 1; j < projected.length; j += 1) {
          const a = projected[i];
          const b = projected[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 88) {
            const alpha = 0.082 * (1 - distance / 88);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(60, 111, 190, ${alpha})`;
            ctx.lineWidth = 0.86;
            ctx.stroke();
          }
        }
      }

      for (const point of projected) {
        const alpha = 0.145 + point.d * 0.21;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.source.size * point.d * 1.08, 0, Math.PI * 2);
        ctx.fillStyle = color(point.source.color, alpha);
        ctx.fill();

        if (point.source.size > 1.95) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, point.source.size * point.d * 1.08 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = color(point.source.color, 0.14);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    const drawScene = () => {
      const time = (performance.now() - startedAt) / 1000;
      renderScene(time);

      requestAnimationFrame(drawScene);
    };

    resizeScene();
    window.addEventListener("resize", resizeScene);

    if (!prefersReducedMotion.matches) {
      drawScene();
    } else {
      renderScene(0);
    }
  }
}

const revealItems = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.16 }
);

for (const item of revealItems) {
  revealObserver.observe(item);
}

const metricItems = document.querySelectorAll("[data-count]");

const metricObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }

      const element = entry.target;
      const target = Number(element.getAttribute("data-count") || "0");
      const duration = 900;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased).toString();

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.textContent = target.toString();
        }
      };

      requestAnimationFrame(tick);
      metricObserver.unobserve(element);
    }
  },
  { threshold: 0.5 }
);

for (const metric of metricItems) {
  metricObserver.observe(metric);
}

const sectionLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const activeObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    for (const link of sectionLinks) {
      link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
    }
  },
  { rootMargin: "-25% 0px -60% 0px", threshold: [0.12, 0.4, 0.7] }
);

for (const section of sections) {
  activeObserver.observe(section);
}

const copyButton = document.querySelector("[data-copy-target]");

if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const targetId = copyButton.getAttribute("data-copy-target");
    const target = targetId ? document.getElementById(targetId) : null;
    const text = target ? target.innerText.trim() : "";

    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1400);
    } catch {
      copyButton.textContent = "Select";
      setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1400);
    }
  });
}
