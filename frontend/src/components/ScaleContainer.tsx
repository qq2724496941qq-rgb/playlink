import { useEffect, useState, useRef, ReactNode } from "react";

const DESIGN_W = 1280;
const DESIGN_H = 720;

interface ScaleContainerProps {
  children: ReactNode;
}

export default function ScaleContainer({ children }: ScaleContainerProps) {
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 我们取较大比例，来尝试填满屏幕（Cover 模式），从而消除黑边
      // 如果您发现内容被裁切了，我们可以改回 Math.min (Contain 模式)
      const scaleW = vw / DESIGN_W;
      const scaleH = vh / DESIGN_H;

      // 目前采用 Math.min (Contain)，即保证不裁切但留黑边
      // 如果您想彻底去掉黑边，可以把下面改为 Math.max，但内容会被裁切
      const newScale = Math.min(scaleW, scaleH);

      setScale(newScale);
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        width: DESIGN_W,
        height: DESIGN_H,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center",
        overflow: "hidden",
        backgroundColor: "#f8f9ff",
      }}
    >
      {children}
    </div>
  );
}
