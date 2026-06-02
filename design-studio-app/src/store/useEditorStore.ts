import { create } from 'zustand';
import { fabric } from 'fabric';

export type ToolType = 'select' | 'hand' | 'shape' | 'text';

interface EditorState {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas) => void;
  selectedObjects: fabric.Object[];
  setSelectedObjects: (objects: fabric.Object[]) => void;
  layers: fabric.Object[];
  setLayers: (layers: fabric.Object[]) => void;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  history: string[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canvasConfig: {
    width: number;
    height: number;
    zoom: number;
    backgroundColor: string;
  };
  setCanvasConfig: (config: Partial<EditorState['canvasConfig']>) => void;
  clipboard: any | null;
  setClipboard: (clipboard: any) => void;
  aiTemplate: any | null;
  setAiTemplate: (template: any) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  setCanvas: (canvas) => set({ canvas }),
  selectedObjects: [],
  setSelectedObjects: (objects) => set({ selectedObjects: objects }),
  layers: [],
  setLayers: (layers) => set({ layers }),
  clipboard: null,
  setClipboard: (clipboard) => set({ clipboard }),
  aiTemplate: null,
  setAiTemplate: (template) => set({ aiTemplate: template }),
  activeTool: 'select',
  setActiveTool: (tool) => {
    const { canvas } = get();
    if (canvas) {
      if (tool === 'hand') {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'grab';
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      } else {
        canvas.selection = true;
        canvas.defaultCursor = 'default';
      }
    }
    set({ activeTool: tool });
  },
  history: [],
  historyIndex: -1,
  pushHistory: () => {
    const { canvas, history, historyIndex } = get();
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON(['id', 'name', 'locked']));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(json);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { canvas, history, historyIndex } = get();
    if (!canvas || historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    const prevState = history[prevIndex];
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
      set({ historyIndex: prevIndex });
    });
  },
  redo: () => {
    const { canvas, history, historyIndex } = get();
    if (!canvas || historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const nextState = history[nextIndex];
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      set({ historyIndex: nextIndex });
    });
  },
  canvasConfig: {
    width: 800,
    height: 800,
    zoom: 1,
    backgroundColor: '#ffffff',
  },
  setCanvasConfig: (config) =>
    set((state) => ({
      canvasConfig: { ...state.canvasConfig, ...config },
    })),
}));
