// "Where students join from" — world map with one dot per student (MathPortal design, Home).
// ECharts (only the parts the map needs) + the world-atlas outline, bundled — no CDN at runtime.
// Loaded lazily from Home so the rest of the admin doesn't carry the map code.
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GeoComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

echarts.use([ScatterChart, GeoComponent, TooltipComponent, CanvasRenderer]);
let registered = false;
function registerWorld() {
  if (registered) return;
  echarts.registerMap("world", feature(world, world.objects.countries));
  registered = true;
}

/** Country (as the dashboard names it) → centre [lng, lat], spread radius in degrees, colour. */
export const COUNTRY_SPOTS = {
  Egypt: { at: [31.2, 30.0], r: 1.4, color: "#166534" },
  "Saudi Arabia": { at: [45.0, 24.2], r: 2.6, color: "#65a30d" },
  UAE: { at: [54.9, 24.6], r: 0.7, color: "#1d4ed8" },
  Qatar: { at: [51.3, 25.3], r: 0.25, color: "#0d9488" },
  Kuwait: { at: [47.8, 29.3], r: 0.3, color: "#a16207" },
  UK: { at: [-1.5, 52.5], r: 1.2, color: "#7c3aed" },
  USA: { at: [-95.7, 38.5], r: 7, color: "#94a3b8" },
};
const FALLBACK = { r: 1, color: "#94a3b8" };

/** Stable pseudo-random so the dots don't jump on every render. */
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function buildDots(rows) {
  const rnd = seeded(7);
  const out = [];
  rows.forEach(({ country, studentCount }) => {
    const spot = COUNTRY_SPOTS[country];
    if (!spot) return; // no position known for this country
    const n = Math.min(Number(studentCount) || 0, 400); // cap dots; the tooltip shows the real total
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * spot.r;
      out.push({
        name: country,
        value: [spot.at[0] + Math.cos(a) * d, spot.at[1] + Math.sin(a) * d * 0.8, Number(studentCount)],
        itemStyle: { color: spot.color, opacity: 0.85, borderColor: "#fff", borderWidth: 1 },
      });
    }
  });
  return out;
}

export default function StudentsMap({ rows = [] }) {
  const box = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    if (!box.current) return undefined;
    registerWorld();
    chart.current = echarts.init(box.current);
    const onResize = () => chart.current?.resize();
    window.addEventListener("resize", onResize);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(box.current);
    return () => { window.removeEventListener("resize", onResize); ro?.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    if (!chart.current) return;
    // Zoom to the Middle East / North Africa like the design; widen when students are far away.
    const far = rows.some((r) => ["USA", "UK"].includes(r.country) && r.studentCount > 0);
    chart.current.setOption({
      tooltip: {
        trigger: "item",
        backgroundColor: "#0f172a", borderWidth: 0, textStyle: { color: "#fff", fontSize: 12 },
        formatter: (p) => (p.componentSubType === "scatter" ? `${p.name}<br/>${p.value[2]} student${p.value[2] === 1 ? "" : "s"}` : p.name),
      },
      geo: {
        map: "world", roam: true,
        boundingCoords: far ? [[-30, 10], [70, 60]] : [[25, 15], [58, 34]],
        scaleLimit: { min: 0.8, max: 12 },
        label: { show: false },
        itemStyle: { areaColor: "#eef2f7", borderColor: "#ffffff", borderWidth: 1 },
        emphasis: { label: { show: false }, itemStyle: { areaColor: "#e2e8f0" } },
      },
      series: [{
        type: "scatter", coordinateSystem: "geo", geoIndex: 0, data: buildDots(rows),
        symbolSize: 7, emphasis: { scale: 1.6, label: { show: false } },
      }],
    }, true);
  }, [rows]);

  return <div ref={box} style={{ height: 320, width: "100%" }} role="img" aria-label="Map of where students are" />;
}
