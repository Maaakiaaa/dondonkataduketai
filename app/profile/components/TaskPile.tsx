"use client";

import Matter from "matter-js";
import { useEffect, useRef } from "react";

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

export default function TaskPile({ tasks }: TaskPileProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // Split tasks into physics-enabled (recent) and static (older)
  const recentTasks = tasks.slice(0, PHYSICS_TASK_LIMIT);
  const olderTasksCount = Math.max(0, tasks.length - PHYSICS_TASK_LIMIT);

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
      let color = "#FFE66D"; // Yellow (Short)
      const time = task.estimatedTime || 0;

      if (time >= 60) {
        color = "#FFF600"; // Yellow (Long)
      } else if (time >= 30) {
        color = "#FF2A96"; // Pink (Medium)
      } else {
        color = "#26F0F1"; // Cyan (Short)
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
      {/* Physics Area */}
      <div
        ref={sceneRef}
        className="w-full flex-1 bg-white border-b-4 border-black relative overflow-hidden rounded-t-xl"
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
