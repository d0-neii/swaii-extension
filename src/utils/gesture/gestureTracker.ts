import { Point } from "@/types/gesture";
import { runAction } from "@/utils/action/runAction.content";
import {
  insertCanvas,
  clearCanvas,
  drawOnCanvas,
  fadeOutCanvas,
} from "@/utils/canvas/canvasDrawer";
import { findMatchingGesture } from "@/utils/gesture/gestureMatcher.content";
import { getMatchedMapping } from "@/utils/mapping/gestureMappingResolver.content";

let isDrawing = false;
let points: Point[] = [];
let mouseDownTime = 0;
let hasMouseMoved = false;

export const initGestureTracking = () => {
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("contextmenu", onContextMenu);
};

const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 2) {
    return;
  }

  isDrawing = true;
  points = [{ x: e.clientX, y: e.clientY }];
  mouseDownTime = Date.now();
  hasMouseMoved = false;

  insertCanvas();
  clearCanvas();
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDrawing) {
    return;
  }

  const x = e.clientX;
  const y = e.clientY;

  const prev = points[points.length - 1];
  const movedX = x - prev.x;
  const movedY = y - prev.y;

  const movedEnough = Math.abs(movedX) > 2 || Math.abs(movedY) > 2;

  if (!hasMouseMoved && movedEnough) {
    hasMouseMoved = true;
    insertCanvas();
    clearCanvas();
  }

  if (!hasMouseMoved) {
    return;
  }

  points.push({ x, y });
  drawOnCanvas(
    x,
    y,
    points.map((p) => [p.x, p.y])
  );
};

const onMouseUp = async () => {
  if (!isDrawing) {
    return;
  }

  isDrawing = false;

  const duration = Date.now() - mouseDownTime;
  const isGesture = hasMouseMoved || duration > 200;

  if (!isGesture) {
    return;
  }

  fadeOutCanvas();

  try {
    const matched = await findMatchingGesture(points);
    if (!matched) {
      return;
    }

    const matchedGestureMapping = await getMatchedMapping(matched.name);
    if (matchedGestureMapping) {
      runAction(matchedGestureMapping.action, matchedGestureMapping.site);
    } else {
      console.log("매칭된 제스처 없음");
    }
  } catch (error) {
    console.error("제스처 매칭 중 오류", error);
  }
};

const onContextMenu = (e: MouseEvent) => {
  // macOS는 우클릭을 "누르는 순간" contextmenu가 발생하므로(isDrawing 중),
  // Windows는 "뗄 때" 발생하므로(hasMouseMoved로 판단) 둘 다 막는다.
  // Windows에서 움직이지 않은 단순 우클릭은 기존처럼 메뉴가 뜬다.
  if (isDrawing || hasMouseMoved) {
    e.preventDefault();
  }
};
