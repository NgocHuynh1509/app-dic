import { useEffect, useRef, useState } from "react";
import type { LiveData, GraphPoint } from "../../types";

const WINDOW_POSITION = 0.13;
const POSITION_STEP = 0.0025;
const TICK_MS = 100;

const BASELINE_FORCE = 500;
const MEAN_REVERSION = 0.04; // kéo giá trị về baseline dần, không cho trôi vô hạn
const NOISE_AMPLITUDE = 320; // độ "rung" liên tục kiểu nhịp tim
const SPIKE_CHANCE = 0.05;
const SPIKE_AMPLITUDE = 1600;

// Giới hạn số điểm giữ trong bộ nhớ để đồ thị chạy mãi mãi mà
// không làm phình mảng dữ liệu vô hạn (chỉ giữ đủ cho vài cửa sổ).
const MAX_CURVE_POINTS = 4000;

export interface TestResult {
  ultimateForce: number;
  peakPosition: number;
}

interface SimulatedTest {
  liveData: LiveData;
  curve: GraphPoint[];
  result: TestResult | null;
  restart: () => void;
}

function generateForce(previousForce: number): number {
  const reversion = (BASELINE_FORCE - previousForce) * MEAN_REVERSION;
  const noise = (Math.random() - 0.5) * NOISE_AMPLITUDE;

  let force = previousForce + reversion + noise;

  // Thỉnh thoảng tạo peak đột biến, không còn bị kẹp trần/sàn cố định.
  if (Math.random() < SPIKE_CHANCE) {
    force += (Math.random() - 0.3) * SPIKE_AMPLITUDE;
  }

  return Number(force.toFixed(2));
}

export function useSimulatedH5kTData(): SimulatedTest {
  const [liveData, setLiveData] = useState<LiveData>({
    force: BASELINE_FORCE,
    position: 0,
    time: 0,
    positionRate: 1.5,
  });

  const [curve, setCurve] = useState<GraphPoint[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);

  const positionRef = useRef(0);
  const forceRef = useRef(BASELINE_FORCE);
  const timeRef = useRef(0);

  const peakForceRef = useRef(BASELINE_FORCE);
  const peakPositionRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      positionRef.current += POSITION_STEP;
      const position = Number(positionRef.current.toFixed(4));

      forceRef.current = generateForce(forceRef.current);
      const force = forceRef.current;

      timeRef.current += TICK_MS / 1000;

      if (force > peakForceRef.current) {
        peakForceRef.current = force;
        peakPositionRef.current = position;
      }

      setLiveData({
        force,
        position,
        time: timeRef.current,
        positionRate: POSITION_STEP / (TICK_MS / 1000),
      });

      // Đồ thị chạy liên tục, không dừng — chỉ cắt bớt phần đã cũ
      // (nằm ngoài vài cửa sổ hiển thị) để tránh phình bộ nhớ.
      setCurve((prev) => {
        const next = [...prev, { position, force }];
        if (next.length > MAX_CURVE_POINTS) {
          return next.slice(next.length - MAX_CURVE_POINTS);
        }
        return next;
      });

      const currentCycle = Math.floor(position / WINDOW_POSITION);
      const previousCycle = Math.floor(
        (position - POSITION_STEP) / WINDOW_POSITION
      );

      if (currentCycle > previousCycle) {
        setResult({
          ultimateForce: peakForceRef.current,
          peakPosition: peakPositionRef.current,
        });

        peakForceRef.current = force;
        peakPositionRef.current = position;
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  const restart = () => {
    positionRef.current = 0;
    forceRef.current = BASELINE_FORCE;
    timeRef.current = 0;

    peakForceRef.current = BASELINE_FORCE;
    peakPositionRef.current = 0;

    setCurve([]);
    setResult(null);

    setLiveData({
      force: BASELINE_FORCE,
      position: 0,
      time: 0,
      positionRate: POSITION_STEP / (TICK_MS / 1000),
    });
  };

  return { liveData, curve, result, restart };
}