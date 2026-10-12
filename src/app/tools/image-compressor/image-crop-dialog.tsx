"use client";

/* Inspection previews are local, metadata-free Blob URLs. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Crop, Move, RotateCcw, X } from "lucide-react";
import type { CropRect } from "@/lib/image-studio/types";
import { getCropPixels } from "@/lib/image-studio/geometry";

export type CropAspect = "free" | "1:1" | "3:4" | "4:3" | "16:9";
type CropField = keyof CropRect;
type Handle = "move" | "nw" | "ne" | "sw" | "se";
interface CropImage { name: string; width: number; height: number; previewUrl: string; crop: CropRect | null }
interface ImageCropDialogProps {
  image: CropImage;
  initialAspect?: CropAspect;
  onApply: (crop: CropRect | null) => void;
  onClose: () => void;
}
const FULL: CropRect = { x: 0, y: 0, width: 1, height: 1 };
const fields: { key: CropField; label: string }[] = [{ key: "x", label: "Left position" }, { key: "y", label: "Top position" }, { key: "width", label: "Crop width" }, { key: "height", label: "Crop height" }];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const textValues = (crop: CropRect) => Object.fromEntries(fields.map(({ key }) => [key, String(Number((crop[key] * 100).toFixed(4)))])) as Record<CropField, string>;

function ratioFor(aspect: CropAspect, image: CropImage): number | null {
  if (aspect === "free") return null;
  const [width, height] = aspect.split(":").map(Number);
  // Normalized fractions must be converted using the ORIENTED source dimensions.
  return (width / height) * (image.height / image.width);
}

function minimum(image: CropImage) {
  return { width: Math.min(1, Math.max(2 / image.width, 0.005)), height: Math.min(1, Math.max(2 / image.height, 0.005)) };
}

function fitAspect(rect: CropRect, aspect: CropAspect, image: CropImage): CropRect {
  const ratio = ratioFor(aspect, image);
  const min = minimum(image);
  if (!ratio) {
    const width = clamp(rect.width, min.width, 1), height = clamp(rect.height, min.height, 1);
    return { x: clamp(rect.x, 0, 1 - width), y: clamp(rect.y, 0, 1 - height), width, height };
  }
  const maxWidth = Math.min(1, ratio);
  const minWidth = Math.min(maxWidth, Math.max(min.width, min.height * ratio));
  const width = clamp(Math.min(rect.width, rect.height * ratio), minWidth, maxWidth);
  const height = width / ratio;
  return { x: clamp(rect.x + (rect.width - width) / 2, 0, 1 - width), y: clamp(rect.y + (rect.height - height) / 2, 0, 1 - height), width, height };
}

function resizeHandle(rect: CropRect, handle: Exclude<Handle, "move">, dx: number, dy: number, aspect: CropAspect, image: CropImage): CropRect {
  const west = handle.includes("w"), north = handle.includes("n");
  const anchorX = west ? rect.x + rect.width : rect.x;
  const anchorY = north ? rect.y + rect.height : rect.y;
  const maxWidth = west ? anchorX : 1 - anchorX;
  const maxHeight = north ? anchorY : 1 - anchorY;
  const min = minimum(image);
  const ratio = ratioFor(aspect, image);
  let width = rect.width + (west ? -dx : dx);
  let height = rect.height + (north ? -dy : dy);
  if (ratio) {
    // A horizontal keyboard step drives width; a vertical step drives height.
    if (Math.abs(dx) < Math.abs(dy * ratio)) width = height * ratio;
    const upper = Math.min(maxWidth, maxHeight * ratio);
    width = clamp(width, Math.min(upper, Math.max(min.width, min.height * ratio)), upper);
    height = width / ratio;
  } else {
    width = clamp(width, Math.min(min.width, maxWidth), maxWidth);
    height = clamp(height, Math.min(min.height, maxHeight), maxHeight);
  }
  return { x: west ? anchorX - width : anchorX, y: north ? anchorY - height : anchorY, width, height };
}

export function ImageCropDialog({ image, initialAspect = "free", onApply, onClose }: ImageCropDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [aspect, setAspect] = useState<CropAspect>(initialAspect);
  const [rect, setRect] = useState(() => fitAspect(image.crop ?? FULL, initialAspect, image));
  const [drafts, setDrafts] = useState(() => textValues(fitAspect(image.crop ?? FULL, initialAspect, image)));
  const [imageFailed, setImageFailed] = useState(false);
  const drag = useRef<{ id: number; handle: Handle; x: number; y: number; width: number; height: number; rect: CropRect } | null>(null);

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    if (element && !element.open) { element.showModal(); cancel.current?.focus(); }
    return () => {
      if (element?.open) element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  function commit(next: CropRect) {
    if (![next.x, next.y, next.width, next.height].every(Number.isFinite)) return;
    setRect(next); setDrafts(textValues(next));
  }

  function bounds(key: CropField): [number, number] {
    const min = minimum(image), ratio = ratioFor(aspect, image);
    if (key === "x") return [0, 1 - rect.width];
    if (key === "y") return [0, 1 - rect.height];
    const upper = key === "width" ? Math.min(1 - rect.x, ratio ? (1 - rect.y) * ratio : 1)
      : Math.min(1 - rect.y, ratio ? (1 - rect.x) / ratio : 1);
    const lower = key === "width" ? Math.max(min.width, ratio ? min.height * ratio : 0)
      : Math.max(min.height, ratio ? min.width / ratio : 0);
    return [Math.min(lower, upper), upper];
  }

  function fieldError(key: CropField, text: string): string | null {
    const number = text.trim() === "" ? NaN : Number(text);
    const [min, max] = bounds(key);
    if (!Number.isFinite(number) || number < min * 100 - 0.0001 || number > max * 100 + 0.0001) {
      return `Use ${Number((min * 100).toFixed(4))}% to ${Number((max * 100).toFixed(4))}%.`;
    }
    return null;
  }

  function changeField(key: CropField, value: number) {
    const [min, max] = bounds(key);
    const next = { ...rect, [key]: clamp(value, min, max) };
    const ratio = ratioFor(aspect, image);
    if (ratio && key === "width") next.height = next.width / ratio;
    if (ratio && key === "height") next.width = next.height * ratio;
    return next;
  }

  function numeric(key: CropField, text: string) {
    if (fieldError(key, text)) { setDrafts(value => ({ ...value, [key]: text })); return; }
    const next = changeField(key, Number(text) / 100);
    setRect(next); setDrafts({ ...textValues(next), [key]: text });
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, handle: Handle) {
    if (event.button !== 0 || imageFailed) return;
    const box = stage.current?.getBoundingClientRect();
    if (!box?.width || !box.height) return;
    event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, handle, x: event.clientX, y: event.clientY, width: box.width, height: box.height, rect };
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = (event.clientX - start.x) / start.width, dy = (event.clientY - start.y) / start.height;
    commit(start.handle === "move"
      ? { ...start.rect, x: clamp(start.rect.x + dx, 0, 1 - start.rect.width), y: clamp(start.rect.y + dy, 0, 1 - start.rect.height) }
      : resizeHandle(start.rect, start.handle, dx, dy, aspect, image));
  }

  function pointerEnd(event: PointerEvent<HTMLButtonElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>, handle: Handle) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const dx = (event.key === "ArrowRight" ? amount : event.key === "ArrowLeft" ? -amount : 0) / image.width;
    const dy = (event.key === "ArrowDown" ? amount : event.key === "ArrowUp" ? -amount : 0) / image.height;
    commit(handle === "move" ? { ...rect, x: clamp(rect.x + dx, 0, 1 - rect.width), y: clamp(rect.y + dy, 0, 1 - rect.height) }
      : resizeHandle(rect, handle, dx, dy, aspect, image));
  }

  const invalid = fields.some(({ key }) => fieldError(key, drafts[key]) !== null);
  const pixels = getCropPixels(image.width, image.height, rect);

  return (
    <dialog className="studio-dialog studio-crop-dialog" ref={dialog} aria-labelledby="studio-crop-title" aria-describedby="studio-crop-description"
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="studio-section-heading">
        <h2 id="studio-crop-title"><Crop size={20} aria-hidden="true" /> Crop this image</h2>
        <button type="button" className="studio-icon-button" onClick={onClose} aria-label="Close crop dialog"><X size={20} aria-hidden="true" /></button>
      </div>
      <p id="studio-crop-description" className="studio-caption">Only <strong className="studio-break-name">{image.name}</strong> changes. The preview is oriented; coordinates refer to the full oriented image, not the thumbnail.</p>
      <label className="studio-field">
        <span>Crop aspect ratio</span>
        <select value={aspect} onChange={event => { const next = event.target.value as CropAspect; setAspect(next); commit(fitAspect(rect, next, image)); }}>
          {(["free", "1:1", "3:4", "4:3", "16:9"] as const).map(value => <option key={value} value={value}>{value === "free" ? "Free aspect ratio" : value}</option>)}
        </select>
      </label>
      {imageFailed && <p className="studio-error" role="alert">The local inspection preview could not be displayed. Close this dialog and retry inspection before cropping.</p>}
      <div className="studio-crop-preview">
        <div className="studio-crop-stage" ref={stage} style={{ aspectRatio: `${image.width} / ${image.height}`, maxWidth: `${360 * image.width / image.height}px` }}>
          <img src={image.previewUrl} alt={`Oriented crop preview of ${image.name}`} draggable={false} onError={() => setImageFailed(true)} />
          <div className="studio-crop-selection" style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}>
            <button type="button" className="studio-crop-move" aria-label="Move crop selection. Arrow keys move one source pixel; Shift moves ten."
              onPointerDown={event => pointerDown(event, "move")} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
              onKeyDown={event => keyboard(event, "move")} disabled={imageFailed}><Move size={20} aria-hidden="true" /></button>
            {(["nw", "ne", "sw", "se"] as const).map((handle, index) => (
              <button type="button" key={handle} className={`studio-crop-handle studio-crop-handle-${handle}`}
                aria-label={`Resize ${["top left", "top right", "bottom left", "bottom right"][index]} crop corner. Use arrow keys; Shift moves ten pixels.`}
                onPointerDown={event => pointerDown(event, handle)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
                onKeyDown={event => keyboard(event, handle)} disabled={imageFailed}><span aria-hidden="true" /></button>
            ))}
          </div>
        </div>
      </div>
      <p className="studio-caption">Drag the selection or its corners. Every handle supports arrow keys (1 source pixel) and Shift + arrows (10). Aspect locks use actual image dimensions.</p>
      <div className="studio-crop-fields">
        {fields.map(({ key, label }) => {
          const [min, max] = bounds(key), error = fieldError(key, drafts[key]);
          return (
            <div className="studio-field" key={key}>
              <label htmlFor={`studio-crop-${key}`}>{label} (%)</label>
              <input type="range" min={min * 100} max={max * 100} step="any" value={rect[key] * 100} aria-label={`${label} percent slider`}
                onChange={event => commit(changeField(key, Number(event.target.value) / 100))} disabled={imageFailed} />
              <input id={`studio-crop-${key}`} type="number" inputMode="decimal" min={min * 100} max={max * 100} step="any" value={drafts[key]}
                onChange={event => numeric(key, event.target.value)} aria-invalid={!!error} aria-describedby={error ? `studio-crop-${key}-error` : undefined} disabled={imageFailed} />
              {error && <span id={`studio-crop-${key}-error`} className="studio-field-error">{error}</span>}
            </div>
          );
        })}
      </div>
      <p className="studio-caption">Crop: {pixels.width.toLocaleString("en-US")} × {pixels.height.toLocaleString("en-US")} source pixels. Coordinates are clamped inside the image with a positive minimum area.</p>
      <div className="studio-dialog-actions">
        <button type="button" className="studio-button" onClick={() => { setAspect("free"); commit(FULL); }}><RotateCcw size={16} aria-hidden="true" /> Reset crop</button>
        <button type="button" className="studio-button" ref={cancel} onClick={onClose}>Cancel</button>
        <button type="button" className="studio-button studio-button-primary" disabled={invalid || imageFailed}
          onClick={() => onApply(rect.x === 0 && rect.y === 0 && rect.width === 1 && rect.height === 1 ? null : { ...rect })}>Apply to this image</button>
      </div>
    </dialog>
  );
}