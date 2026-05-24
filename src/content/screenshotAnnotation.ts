import type { PromptAttachment } from "../shared/messages";

type AnnotationTool = "highlight" | "blur" | "arrow" | "label";

const annotationRootId = "ai-buddy-screenshot-annotation";

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load screenshot for annotation."));
    image.src = dataUrl;
  });
}

function canvasPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawArrow(context: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) {
  const angle = Math.atan2(endY - startY, endX - startX);
  const headLength = 18;

  context.save();
  context.strokeStyle = "#dc2626";
  context.fillStyle = "#dc2626";
  context.lineWidth = 5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();
  context.restore();
}

function drawLabel(context: CanvasRenderingContext2D, x: number, y: number, text: string) {
  context.save();
  context.font = "600 22px Inter, system-ui, sans-serif";
  const metrics = context.measureText(text);
  const paddingX = 10;
  const paddingY = 7;
  const width = metrics.width + paddingX * 2;
  const height = 34;

  context.fillStyle = "rgba(15, 23, 42, 0.86)";
  context.fillRect(x, y - height, width, height);
  context.fillStyle = "#ffffff";
  context.fillText(text, x + paddingX, y - paddingY);
  context.restore();
}

function drawRectTool(
  context: CanvasRenderingContext2D,
  tool: "highlight" | "blur",
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  if (width < 4 || height < 4) {
    return;
  }

  if (tool === "highlight") {
    context.save();
    context.fillStyle = "rgba(250, 204, 21, 0.26)";
    context.strokeStyle = "#facc15";
    context.lineWidth = 5;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.restore();
    return;
  }

  const region = context.getImageData(x, y, width, height);
  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;
  const scratchContext = scratch.getContext("2d");
  if (!scratchContext) {
    return;
  }
  scratchContext.putImageData(region, 0, 0);
  context.save();
  context.filter = "blur(12px)";
  context.drawImage(scratch, x, y, width, height);
  context.filter = "none";
  context.fillStyle = "rgba(15, 23, 42, 0.08)";
  context.fillRect(x, y, width, height);
  context.restore();
}

function setActiveTool(buttons: HTMLButtonElement[], tool: AnnotationTool) {
  buttons.forEach((button) => {
    button.dataset.active = button.dataset.tool === tool ? "true" : "false";
  });
}

export async function annotateScreenshotAttachment(attachment: PromptAttachment) {
  const image = await loadImage(attachment.dataUrl);

  return new Promise<PromptAttachment>((resolve, reject) => {
    document.getElementById(annotationRootId)?.remove();

    const root = document.createElement("div");
    root.id = annotationRootId;
    root.innerHTML = `
      <style>
        #${annotationRootId} {
          position: fixed;
          z-index: 2147483647;
          inset: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 10px;
          padding: 14px;
          box-sizing: border-box;
          background: rgba(15, 23, 42, 0.72);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #${annotationRootId} .ai-buddy-annotation-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          border: 1px solid #d8deea;
          border-radius: 8px;
          padding: 8px;
          background: #ffffff;
        }

        #${annotationRootId} button {
          min-height: 34px;
          border: 1px solid #d8deea;
          border-radius: 7px;
          padding: 0 11px;
          background: #ffffff;
          color: #172033;
          font: inherit;
          cursor: pointer;
        }

        #${annotationRootId} button[data-active="true"],
        #${annotationRootId} .ai-buddy-primary {
          border-color: #2563eb;
          background: #2563eb;
          color: #ffffff;
        }

        #${annotationRootId} .ai-buddy-danger {
          border-color: #dc2626;
          color: #dc2626;
        }

        #${annotationRootId} .ai-buddy-annotation-stage {
          display: grid;
          place-items: center;
          min-height: 0;
          overflow: auto;
        }

        #${annotationRootId} canvas {
          max-width: 100%;
          max-height: calc(100vh - 92px);
          border-radius: 8px;
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.36);
          background: #ffffff;
          cursor: crosshair;
        }
      </style>
      <div class="ai-buddy-annotation-toolbar">
        <button type="button" data-tool="highlight" data-active="true">Highlight</button>
        <button type="button" data-tool="blur">Blur</button>
        <button type="button" data-tool="arrow">Arrow</button>
        <button type="button" data-tool="label">Label</button>
        <button type="button" data-action="undo">Undo</button>
        <button type="button" class="ai-buddy-primary" data-action="use">Use Screenshot</button>
        <button type="button" data-action="skip">Skip Annotation</button>
        <button type="button" class="ai-buddy-danger" data-action="cancel">Cancel</button>
      </div>
      <div class="ai-buddy-annotation-stage"></div>
    `;

    const stage = root.querySelector<HTMLDivElement>(".ai-buddy-annotation-stage")!;
    const canvas = document.createElement("canvas");
    canvas.width = attachment.width;
    canvas.height = attachment.height;
    stage.appendChild(canvas);
    document.documentElement.appendChild(root);

    const context = canvas.getContext("2d");
    if (!context) {
      root.remove();
      reject(new Error("Unable to prepare screenshot annotation."));
      return;
    }

    context.drawImage(image, 0, 0, attachment.width, attachment.height);
    const snapshots: string[] = [canvas.toDataURL("image/png")];
    let activeTool: AnnotationTool = "highlight";
    let startPoint: { x: number; y: number } | null = null;

    const toolButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-tool]"));
    toolButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeTool = button.dataset.tool as AnnotationTool;
        setActiveTool(toolButtons, activeTool);
      });
    });

    function pushSnapshot() {
      snapshots.push(canvas.toDataURL("image/png"));
      if (snapshots.length > 20) {
        snapshots.shift();
      }
    }

    function finish(updatedAttachment: PromptAttachment) {
      document.removeEventListener("keydown", handleEscape, true);
      root.remove();
      resolve(updatedAttachment);
    }

    root.querySelector<HTMLButtonElement>("button[data-action='undo']")?.addEventListener("click", async () => {
      if (snapshots.length <= 1) {
        return;
      }
      snapshots.pop();
      const previous = await loadImage(snapshots.at(-1)!);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(previous, 0, 0, canvas.width, canvas.height);
    });

    root.querySelector<HTMLButtonElement>("button[data-action='use']")?.addEventListener("click", () => {
      finish({
        ...attachment,
        id: `annotated-${attachment.id}`,
        dataUrl: canvas.toDataURL("image/png"),
      });
    });

    root.querySelector<HTMLButtonElement>("button[data-action='skip']")?.addEventListener("click", () => {
      finish(attachment);
    });

    root.querySelector<HTMLButtonElement>("button[data-action='cancel']")?.addEventListener("click", () => {
      root.remove();
      reject(new Error("Screenshot annotation cancelled."));
    });

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startPoint = canvasPoint(canvas, event);
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointerup", (event) => {
      if (!startPoint) {
        return;
      }

      event.preventDefault();
      const endPoint = canvasPoint(canvas, event);
      canvas.releasePointerCapture(event.pointerId);

      if (activeTool === "arrow") {
        drawArrow(context, startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else if (activeTool === "label") {
        const text = window.prompt("Label text")?.trim();
        if (text) {
          drawLabel(context, endPoint.x, endPoint.y, text);
        }
      } else {
        drawRectTool(context, activeTool, startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      }

      startPoint = null;
      pushSnapshot();
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      document.removeEventListener("keydown", handleEscape, true);
      root.remove();
      reject(new Error("Screenshot annotation cancelled."));
    };
    document.addEventListener("keydown", handleEscape, true);
  });
}
