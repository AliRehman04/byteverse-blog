"use client";

/* Local Blob URLs must not be sent through a server image optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { Columns2, MoveHorizontal, ZoomIn } from "lucide-react";
import type { ImageResult } from "@/lib/image-studio/protocol";

interface ImageCompareProps {
  result: ImageResult;
  outputUrl: string;
  referenceUrl: string;
  filename: string;
}

function PanViewport({ label, zoomed, children }: { label: string; zoomed: boolean; children: ReactNode }) {
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!zoomed || event.button !== 0 || event.pointerType === "touch") return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    event.currentTarget.scrollLeft = current.left - (event.clientX - current.x);
    event.currentTarget.scrollTop = current.top - (event.clientY - current.y);
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function pan(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !zoomed) return;
    const amount = event.shiftKey ? 160 : 40;
    const direction: Record<string, [number, number]> = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] };
    if (!direction[event.key]) return;
    event.preventDefault();
    const [left, top] = direction[event.key];
    event.currentTarget.scrollBy({ left, top, behavior: "instant" });
  }

  return (
    <div className={`studio-pan-viewport${zoomed ? " is-zoomed" : ""}`} tabIndex={0} role="region"
      aria-label={`${label}. ${zoomed ? "Scroll, drag, or use arrow keys to pan; Shift moves farther." : "Fit-to-view preview."}`}
      onKeyDown={pan} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      {children}
    </div>
  );
}

export function ImageCompare({ result, outputUrl, referenceUrl, filename }: ImageCompareProps) {
  const [divider, setDivider] = useState(50);
  const [zoom, setZoom] = useState<"fit" | 1 | 2>("fit");
  const [sideBySide, setSideBySide] = useState(false);
  const [outputUnsupported, setOutputUnsupported] = useState(false);
  const [referenceUnsupported, setReferenceUnsupported] = useState(false);
  const stageStyle: CSSProperties = zoom === "fit"
    ? { width: "100%", maxWidth: `${440 * result.width / result.height}px`, aspectRatio: `${result.width} / ${result.height}` }
    : { width: `${result.width * zoom}px`, height: `${result.height * zoom}px` };

  function dividerKey(event: KeyboardEvent<HTMLInputElement>) {
    if (!event.shiftKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const change = event.key === "ArrowRight" || event.key === "ArrowUp" ? 10 : -10;
    setDivider(value => Math.max(0, Math.min(100, value + change)));
  }

  const output = <img src={outputUrl} alt={`Optimized ${filename}`} draggable={false} onError={() => setOutputUnsupported(true)} />;
  const reference = <img src={referenceUrl} alt={`Cropped and resized pre-compression reference for ${filename}`} draggable={false} onError={() => setReferenceUnsupported(true)} />;

  return (
    <section className="studio-comparison" aria-label="Before and after comparison">
      <div className="studio-section-heading">
        <h3><ZoomIn size={17} aria-hidden="true" /> Inspect the result</h3>
        <div className="studio-button-group" aria-label="Preview zoom">
          {(["fit", 1, 2] as const).map(value => (
            <button key={value} type="button" aria-pressed={zoom === value} onClick={() => setZoom(value)} disabled={outputUnsupported}>
              {value === "fit" ? "Fit" : `${value * 100}%`}
            </button>
          ))}
        </div>
      </div>
      <div className="studio-compare-toolbar">
        <span className="studio-caption">{zoom === "fit" ? "Fit to view" : `Output ${zoom === 1 ? "1:1" : "2:1"} · ${result.width.toLocaleString("en-US")} × ${result.height.toLocaleString("en-US")} actual pixels`}</span>
        <button className="studio-button studio-button-small" type="button" aria-pressed={sideBySide}
          onClick={() => setSideBySide(value => !value)} disabled={outputUnsupported || referenceUnsupported}>
          {sideBySide ? <MoveHorizontal size={16} aria-hidden="true" /> : <Columns2 size={16} aria-hidden="true" />}
          {sideBySide ? "Use slider" : "Side by side"}
        </button>
      </div>

      {outputUnsupported ? (
        <p className="studio-notice" role="status">
          This browser cannot display this {result.format.toUpperCase()} output. Comparison is unavailable, but the worker-verified file is still available to download. Choose WebP or JPG for another preview format.
        </p>
      ) : referenceUnsupported ? (
        <>
          <p className="studio-notice" role="status">The reference preview could not be displayed. The output is shown on its own; no mismatched source is substituted.</p>
          <PanViewport label="Output image" zoomed={zoom !== "fit"}><div className="studio-compare-stage" style={stageStyle}>{output}</div></PanViewport>
        </>
      ) : sideBySide ? (
        <div className="studio-side-by-side">
          <div><p className="studio-preview-label">Before · reference preview</p><PanViewport label="Before reference" zoomed={zoom !== "fit"}><div className="studio-compare-stage" style={stageStyle}>{reference}</div></PanViewport></div>
          <div><p className="studio-preview-label">After · full output</p><PanViewport label="After output" zoomed={zoom !== "fit"}><div className="studio-compare-stage" style={stageStyle}>{output}</div></PanViewport></div>
        </div>
      ) : (
        <>
          <div className="studio-preview-labels"><span>Before · reference</span><span>After · output</span></div>
          <PanViewport label="Before and after image" zoomed={zoom !== "fit"}>
            <div className="studio-compare-stage" style={stageStyle}>
              {output}
              <div className="studio-reference-layer" style={{ clipPath: `inset(0 ${100 - divider}% 0 0)` }}>{reference}</div>
              <span className="studio-divider-line" style={{ left: `${divider}%` }} aria-hidden="true"><MoveHorizontal size={16} /></span>
            </div>
          </PanViewport>
          <label className="studio-range-label">
            <span>Comparison divider <strong>{divider}% before</strong></span>
            <input type="range" min={0} max={100} step={1} value={divider} onChange={event => setDivider(Number(event.target.value))}
              onKeyDown={dividerKey} aria-label="Before and after comparison divider" aria-valuetext={`${divider}% before reference, ${100 - divider}% after output`} />
          </label>
          <p className="studio-caption">Arrow keys move 1%; Shift + arrow keys move 10%.</p>
        </>
      )}
      <p className="studio-caption studio-reference-disclosure">
        Before uses the same crop, dimensions and JPEG background as the output, with its preview capped at 1,600 px on the longest side. A capped reference is enlarged at 100% / 200% and is not a 1:1 source comparison. Output 100% uses one CSS pixel per actual output pixel. Scroll or focus the preview and use arrow keys to pan when zoomed.
      </p>
    </section>
  );
}