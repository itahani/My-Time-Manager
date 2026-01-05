"use client";

import { useState, useEffect } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- COMPONENT 1: SORTABLE SUB-TASK ---
function SortableSubTask({ st, stepId, onToggleSubTask, onEditSubTask, onEditTime }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: st.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between group gap-4 relative bg-white py-1 ${isDragging ? "shadow-md rounded-lg" : ""}`}>
      <div {...attributes} {...listeners} className="absolute -left-6 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab p-1">⋮⋮</div>
      <div className="flex items-center gap-3 flex-1">
        <input type="checkbox" checked={st.done} onChange={() => onToggleSubTask(stepId, st.id)} className="w-5 h-5 rounded-full border-gray-300 text-blue-600 cursor-pointer" />
        <input type="text" value={st.task} onChange={(e) => onEditSubTask(stepId, st.id, e.target.value)} className={`text-sm bg-transparent border-b border-transparent focus:border-blue-500 outline-none flex-1 py-1 ${st.done ? "line-through text-gray-400" : "text-gray-700 font-medium"}`} />
      </div>
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 border border-gray-100">
        <input type="number" min="0" value={st.time || 0} onChange={(e) => onEditTime(stepId, st.id, parseInt(e.target.value) || 0)} className="text-sm font-bold text-blue-600 bg-transparent w-12 text-center focus:outline-none py-1" />
        <span className="text-[10px] uppercase font-bold text-gray-400">min</span>
      </div>
    </div>
  );
}

// --- COMPONENT 2: SORTABLE STEP ---
function SortableStep({ step, onToggleSubTask, onEditSubTask, onEditTime }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const totalStepTime = step.subTasks?.reduce((acc: number, curr: any) => acc + (parseInt(curr.time) || 0), 0) || 0;
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-4">
      <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-2">
        <div {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400">⠿</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">{step.title}</h3>
          <p className="text-[10px] text-gray-400 uppercase font-bold">{totalStepTime} minutes total</p>
        </div>
      </div>
      <div className="space-y-3 ml-8">
        <SortableContext items={step.subTasks.map((st: any) => st.id)} strategy={verticalListSortingStrategy}>
          {step.subTasks?.map((st: any) => (
            <SortableSubTask key={st.id} st={st} stepId={step.id} onToggleSubTask={onToggleSubTask} onEditSubTask={onEditSubTask} onEditTime={onEditTime} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function Home() {
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Persistence Logic
  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isClient) {
      const saved = localStorage.getItem("timeboxer-save");
      if (saved) setPlan(JSON.parse(saved));
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient && plan) localStorage.setItem("timeboxer-save", JSON.stringify(plan));
  }, [plan, isClient]);

  const formatTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  const totalMinutes = plan?.steps?.reduce((acc: number, step: any) => 
    acc + step.subTasks.reduce((sAcc: number, st: any) => sAcc + (parseInt(st.time) || 0), 0), 0) || 0;

  useEffect(() => {
    if (plan?.steps) {
      const allSubTasks = plan.steps.flatMap((s: any) => s.subTasks || []);
      const totalTimePlanned = allSubTasks.reduce((acc: number, st: any) => acc + (parseInt(st.time) || 0), 0);
      const timeCompleted = allSubTasks.filter((st: any) => st.done).reduce((acc: number, st: any) => acc + (parseInt(st.time) || 0), 0);
      setProgress(totalTimePlanned === 0 ? 0 : Math.round((timeCompleted / totalTimePlanned) * 100));
    }
  }, [plan]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, duration }),
      });
      const data = await res.json();
      const sanitizedSteps = data.steps.map((s: any) => ({
        ...s,
        subTasks: s.subTasks.map((st: any) => ({ ...st, time: parseInt(st.time) || 15 }))
      }));
      setPlan({ ...data, steps: sanitizedSteps });
    } catch (err) { alert("Error generating plan."); } 
    finally { setLoading(false); }
  };

  const clearPlan = () => {
    if (confirm("Reset everything and start a new plan?")) {
      localStorage.removeItem("timeboxer-save");
      setPlan(null);
      setGoal("");
      setDuration("");
    }
  };

  const toggleSubTask = (stepId: string, subTaskId: string) => {
    setPlan((prev: any) => ({
      ...prev,
      steps: prev.steps.map((step: any) => step.id === stepId ? {
        ...step, subTasks: step.subTasks.map((st: any) => st.id === subTaskId ? { ...st, done: !st.done } : st)
      } : step)
    }));
  };

  const editSubTask = (stepId: string, subTaskId: string, newValue: string) => {
    setPlan((prev: any) => ({
      ...prev,
      steps: prev.steps.map((step: any) => step.id === stepId ? {
        ...step, subTasks: step.subTasks.map((st: any) => st.id === subTaskId ? { ...st, task: newValue } : st)
      } : step)
    }));
  };

  const editTime = (stepId: string, subTaskId: string, newValue: number) => {
    setPlan((prev: any) => ({
      ...prev,
      steps: prev.steps.map((step: any) => step.id === stepId ? {
        ...step, subTasks: step.subTasks.map((st: any) => st.id === subTaskId ? { ...st, time: newValue } : st)
      } : step)
    }));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPlan((prev: any) => {
      const isStep = prev.steps.some((s: any) => s.id === active.id);
      if (isStep) {
        const oldIndex = prev.steps.findIndex((s: any) => s.id === active.id);
        const newIndex = prev.steps.findIndex((s: any) => s.id === over.id);
        return { ...prev, steps: arrayMove(prev.steps, oldIndex, newIndex) };
      }
      return prev; // Simplification for demo
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-blue-900 mb-2 italic">My Time Manager</h1>
          <p className="text-blue-600 font-medium">Smart productivity coach for everyone</p>
        </div>

        {!plan && (
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Goal</label>
                <input type="text" placeholder="Ex: Learn React" className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none text-blue-700 font-semibold" value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Duration</label>
                <input type="text" placeholder="Ex: 5 hours" className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none text-blue-700 font-semibold" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>
            <button onClick={handleGenerate} disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 shadow-xl disabled:bg-gray-300 uppercase tracking-widest transition-all">
              {loading ? "Planning..." : "Plan my time"}
            </button>
          </div>
        )}

        {plan && (
          <div className="space-y-6">
            <div className="bg-blue-900 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black mb-1">{plan.projectName}</h2>
                    <p className="text-xs font-medium text-blue-200/80 mb-4">
                      Total: <span className="text-white font-bold">{totalMinutes} min</span> ({formatTime(totalMinutes)})
                    </p>
                    <button onClick={clearPlan} className="text-[10px] bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full uppercase font-bold tracking-tighter transition-colors">
                      + New Plan
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-black">{progress}%</span>
                  </div>
                </div>
                <div className="w-full bg-white/10 h-4 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="bg-blue-400 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(96,165,250,0.5)]" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            </div>

            {/* Congrats text */}
            {progress === 100 && (
              <div className="bg-green-500 text-white p-4 rounded-2xl shadow-lg shadow-green-200 animate-bounce flex items-center justify-center gap-3">
                <span className="text-2xl">🚀</span>
                <p className="font-black uppercase tracking-widest text-sm">
                  You're ready to crush this goal!
                </p>
              </div>
            )}


            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={plan.steps.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-2">
                  {plan.steps.map((step: any) => (
                    <SortableStep key={step.id} step={step} onToggleSubTask={toggleSubTask} onEditSubTask={editSubTask} onEditTime={editTime} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </main>
  );
}