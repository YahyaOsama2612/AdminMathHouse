import { useEffect, useState } from "react";
import api from "../api/api";

/* Every question in the system is a photo. Shows it (tap to enlarge); if the list it came from didn't include
   the photo, it is fetched once per question (GET /api/admin/questions/:id) and remembered. */

const photoCache = new Map();

/* inCard: the photo itself doesn't catch the click (the card around it does); a small 🔍 button opens it large. */
export default function QuestionPhoto({ id, image, text, size = "md", className = "", inCard = false }) {
  const [src, setSrc] = useState(image || photoCache.get(id) || "");
  const [state, setState] = useState(src ? "ok" : id ? "loading" : "none");
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (image) { setSrc(image); setState("ok"); return undefined; }
    if (!id) { setState("none"); return undefined; }
    if (photoCache.has(id)) { const c = photoCache.get(id); setSrc(c); setState(c ? "ok" : "none"); return undefined; }
    let live = true;
    setState("loading");
    api.get(`/api/admin/questions/${id}`)
      .then((res) => {
        const img = res?.data?.data?.data?.image || res?.data?.data?.image || "";
        photoCache.set(id, img);
        if (live) { setSrc(img); setState(img ? "ok" : "none"); }
      })
      .catch(() => live && setState("none"));
    return () => { live = false; };
  }, [id, image]);

  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (e) => e.key === "Escape" && setZoom(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom]);

  const box = size === "sm" ? "h-20 max-w-[16rem]" : size === "lg" ? "h-44 sm:h-56 max-w-[34rem]" : size === "card" ? "h-40 sm:h-44" : "h-28 sm:h-32 max-w-[22rem]";
  if (state === "loading") return <div className={`w-full ${box} rounded-lg skel ${className}`} aria-label="Loading photo" />;
  if (state === "none") return <p className={`text-sm text-gray-500 ${className}`}>{text || "Photo not uploaded"}</p>;
  const viewer = zoom && (
    <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out" onClick={(e) => { e.stopPropagation(); setZoom(false); }}>
      <img src={src} alt="Question" className="max-w-full max-h-full object-contain rounded-lg bg-white" />
    </div>
  );
  if (inCard) {
    return (
      <div className={`relative w-full ${box} rounded-xl border border-gray-100 bg-white p-1.5 overflow-hidden ${className}`}>
        <img src={src} alt="Question" loading="lazy" draggable={false} className="w-full h-full object-contain pointer-events-none" />
        <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(true); }} onKeyDown={(e) => e.stopPropagation()} title="View large" aria-label="View the question large"
          className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-lg bg-white/90 border border-gray-200 shadow-sm text-sm flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-105 transition">🔍</button>
        {viewer}
      </div>
    );
  }
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setZoom(true); }} title="Tap to enlarge"
        className={`block w-full ${box} rounded-lg border border-gray-200 bg-white p-1 overflow-hidden cursor-zoom-in ${className}`}>
        <img src={src} alt="Question" loading="lazy" className="w-full h-full object-contain" />
      </button>
      {zoom && (
        <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoom(false)}>
          <img src={src} alt="Question" className="max-w-full max-h-full object-contain rounded-lg bg-white" />
        </div>
      )}
    </>
  );
}
