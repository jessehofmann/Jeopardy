import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  inkColor?: string;
  label?: string;
}

const CANVAS_W = 600;
const CANVAS_H = 200;

/**
 * Exports the drawing cropped to its ink bounding box (plus a small margin), so
 * downstream `object-fit: contain` displays the strokes filling their box
 * instead of a tiny sliver floating in 600x200 of mostly-empty canvas — which,
 * in the small scoreboard cells, was getting clipped ("names cut off").
 */
function exportTrimmed(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext("2d")!;
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return canvas.toDataURL("image/png");
  }
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas.toDataURL("image/png"); // nothing drawn

  const margin = 12;
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(canvas.width - 1, maxX + margin);
  maxY = Math.min(canvas.height - 1, maxY + margin);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return out.toDataURL("image/png");
}
const SignaturePad = ({
  onChange,
  inkColor = "white",
  label,
}: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (isEmpty) setIsEmpty(false);
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    onChange(exportTrimmed(canvasRef.current!));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, CANVAS_W, CANVAS_H);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="sig-pad">
      {label && <p className="sig-pad-label">{label}</p>}
      <div className="sig-pad-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="sig-pad-canvas"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
        {isEmpty && (
          <div className="sig-pad-placeholder">Sign here</div>
        )}
      </div>
      <button type="button" className="sig-pad-clear" onClick={clear} disabled={isEmpty}>
        Clear
      </button>
    </div>
  );
};

export default SignaturePad;
