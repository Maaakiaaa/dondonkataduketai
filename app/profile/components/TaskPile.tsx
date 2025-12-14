"use client";

import Matter from "matter-js";
import { useCallback, useEffect, useRef, useState } from "react";

export type Task = {
  id: string;
  title: string;
  completedAt: string;
  estimatedTime: number;
};

interface TaskPileProps {
  tasks: Task[];
}

const PHYSICS_TASK_LIMIT = 30;
const SHAKE_FORCE_SCALE = 0.002; // シェイク時の力の強さ
const SHAKE_THRESHOLD = 3; // シェイクと判定する加速度の閾値 (m/s²)

declare global {
  interface Window {
    DeviceMotionEvent: {
      new (): DeviceMotionEvent;
      prototype: DeviceMotionEvent;
      requestPermission?: () => Promise<"granted" | "denied">;
    };
  }
}

export default function TaskPile({ tasks }: TaskPileProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // 加速度センサー関連の状態
  const [motionSupported, setMotionSupported] = useState<boolean | null>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Split tasks into physics-enabled (recent) and static (older)
  const recentTasks = tasks.slice(0, PHYSICS_TASK_LIMIT);
  const olderTasksCount = Math.max(0, tasks.length - PHYSICS_TASK_LIMIT);

  // 加速度センサーのサポート確認（実際にデータが来るかテスト）
  useEffect(() => {
    if (typeof window === "undefined") return;

    // DeviceMotionEvent APIが存在しない場合は非対応
    if (!("DeviceMotionEvent" in window)) {
      setMotionSupported(false);
      return;
    }

    // iOS 13+ではパーミッションが必要
    if (typeof window.DeviceMotionEvent.requestPermission === "function") {
      setNeedsPermission(true);
      // iOSでrequestPermissionがある場合はセンサー対応デバイスと判断
      setMotionSupported(true);
      return;
    }

    // その他のデバイス：実際にイベントが発火するかテスト
    let hasReceivedEvent = false;
    const timeout = 1000; // 1秒待つ

    const testHandler = (event: DeviceMotionEvent) => {
      // 実際に加速度データが取得できるかチェック
      const accel = event.accelerationIncludingGravity;
      if (accel && (accel.x !== null || accel.y !== null || accel.z !== null)) {
        hasReceivedEvent = true;
        window.removeEventListener("devicemotion", testHandler);
        setMotionSupported(true);
      }
    };

    window.addEventListener("devicemotion", testHandler);

    // タイムアウト後にイベントが来なければ非対応と判断
    const timeoutId = setTimeout(() => {
      window.removeEventListener("devicemotion", testHandler);
      if (!hasReceivedEvent) {
        setMotionSupported(false);
      }
    }, timeout);

    return () => {
      window.removeEventListener("devicemotion", testHandler);
      clearTimeout(timeoutId);
    };
  }, []);

  // 加速度センサーのイベントハンドラ（シェイク検出）
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!engineRef.current) return;

    // 重力を除いた純粋な加速度を使用（振る動作のみ検出）
    const accel = event.acceleration;
    if (!accel || accel.x === null || accel.y === null) return;

    // 加速度の大きさを計算
    const magnitude = Math.sqrt(
      (accel.x || 0) ** 2 + (accel.y || 0) ** 2 + (accel.z || 0) ** 2,
    );

    // 閾値未満なら何もしない
    if (magnitude < SHAKE_THRESHOLD) return;

    // requestAnimationFrame でスロットリング
    if (animationFrameRef.current) return;

    animationFrameRef.current = requestAnimationFrame(() => {
      if (engineRef.current) {
        // 全ての非静的ボディに力を適用
        const bodies = Matter.Composite.allBodies(engineRef.current.world);
        for (const body of bodies) {
          if (!body.isStatic) {
            Matter.Body.applyForce(body, body.position, {
              x: (accel.x || 0) * SHAKE_FORCE_SCALE * body.mass,
              y: -(accel.y || 0) * SHAKE_FORCE_SCALE * body.mass,
            });
          }
        }
      }
      animationFrameRef.current = null;
    });
  }, []);

  // 加速度センサーの有効化/無効化
  const toggleMotion = useCallback(async () => {
    if (!motionSupported) return;

    if (motionEnabled) {
      // 無効化
      window.removeEventListener("devicemotion", handleDeviceMotion);
      setMotionEnabled(false);
    } else {
      // 有効化 - iOS 13+ではパーミッション要求が必要
      if (
        needsPermission &&
        typeof window.DeviceMotionEvent.requestPermission === "function"
      ) {
        try {
          const permission = await window.DeviceMotionEvent.requestPermission();
          if (permission !== "granted") {
            alert("加速度センサーの使用が許可されませんでした");
            return;
          }
        } catch (error) {
          console.error("Motion permission error:", error);
          alert("加速度センサーの許可リクエストに失敗しました");
          return;
        }
      }

      window.addEventListener("devicemotion", handleDeviceMotion);
      setMotionEnabled(true);
    }
  }, [motionSupported, motionEnabled, needsPermission, handleDeviceMotion]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (motionEnabled) {
        window.removeEventListener("devicemotion", handleDeviceMotion);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [motionEnabled, handleDeviceMotion]);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Setup Matter.js
    const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint,
      Events = Matter.Events;

    const engine = Engine.create();
    engineRef.current = engine;

    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio,
      },
    });
    renderRef.current = render;

    // Create walls and ground
    const wallThickness = 60;
    const ground = Bodies.rectangle(
      width / 2,
      height + wallThickness / 2 - 10, // Slightly visible or just below
      width,
      wallThickness,
      { isStatic: true, render: { fillStyle: "#000000" } }, // Black ground
    );
    const leftWall = Bodies.rectangle(
      0 - wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      { isStatic: true },
    );
    const rightWall = Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      { isStatic: true },
    );

    Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Add task bodies
    const taskBodies = recentTasks.map((task) => {
      const x = Math.random() * (width - 100) + 50;
      const y = -Math.random() * 500 - 50; // Start above the screen

      // Determine color based on estimatedTime (richness)
      const time = task.estimatedTime || 0;
      let color: string;

      if (time >= 60) {
        color = "#FF4444"; // Red (Long)
      } else if (time >= 30) {
        color = "#FFF600"; // Yellow (Medium)
      } else {
        color = "#4ECDC4"; // Blue/Cyan (Short)
      }

      // Calculate size based on estimatedTime (proportional)
      // Min size 40, Max size 120.
      const size = Math.min(120, Math.max(40, 40 + time * 0.8));

      // Create a box with rounded corners (chamfer)
      return Bodies.rectangle(x, y, size, size * 0.8, {
        chamfer: { radius: 8 },
        render: {
          fillStyle: color,
          strokeStyle: "#000000", // Black border
          lineWidth: 2,
        },
        label: task.title, // Store title for potential future use
      });
    });

    Composite.add(engine.world, taskBodies);

    // Add mouse control
    const mouse = Mouse.create(render.canvas);
    mouse.pixelRatio = window.devicePixelRatio;

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    });

    Composite.add(engine.world, mouseConstraint);

    // Keep the mouse in sync with rendering
    render.mouse = mouse;

    // Run the engine
    Render.run(render);
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    // Cleanup
    return () => {
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas) {
        render.canvas.remove();
      }
      // Clear world
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [recentTasks]); // Re-run if recent tasks change (though ideally we'd just add bodies)

  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* シェイク機能トグル */}
      <div className="w-full px-4 py-2 bg-gray-100 rounded-t-xl border-b border-gray-200">
        {motionSupported === null ? (
          <div className="text-sm text-gray-500">読み込み中...</div>
        ) : motionSupported ? (
          <button
            type="button"
            onClick={toggleMotion}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              motionEnabled
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <span className="text-lg">{motionEnabled ? "📳" : "📴"}</span>
            <span>{motionEnabled ? "シェイクON" : "シェイクOFF"}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-300 text-gray-500 text-sm">
            <span className="text-lg">🚫</span>
            <span>シェイク機能非対応</span>
          </div>
        )}
      </div>

      {/* Physics Area */}
      <div
        ref={sceneRef}
        className="w-full flex-1 bg-white border-b-4 border-black relative overflow-hidden"
        style={{ minHeight: "300px" }}
      >
        {/* Overlay text or UI elements can go here */}
      </div>

      {/* Static Tower (Strata) */}
      {olderTasksCount > 0 && (
        <div className="w-full bg-gray-50 p-4 rounded-b-xl border-t-0">
          <div className="flex flex-col-reverse items-center gap-1 opacity-90">
            {/* Visual representation of strata - just some striped blocks */}
            {Array.from({
              length: Math.min(5, Math.ceil(olderTasksCount / 10)),
            }).map((_, i) => {
              const taskIndex = PHYSICS_TASK_LIMIT + i * 10;
              const key = tasks[taskIndex]?.id || i;
              const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#9b5de5"];
              return (
                <div
                  key={key}
                  className="w-3/4 h-4 rounded-md border-2 border-black"
                  style={{
                    backgroundColor: colors[i % colors.length],
                    width: `${80 + Math.random() * 10}%`,
                  }}
                />
              );
            })}
            <div className="text-xs text-black font-black mt-2">
              ... 他にも {olderTasksCount} 件のタスクを積み上げました！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
