import React from 'react';
import { Save, Download, Undo, Redo, Layout } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const TopBar: React.FC = () => {
  const { undo, redo, historyIndex, history, canvas } = useEditorStore();

  const handleExport = () => {
    if (!canvas) return;
    const { canvasConfig } = useEditorStore.getState();
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2, // High res export
      left: 0,
      top: 0,
      width: canvasConfig.width,
      height: canvasConfig.height
    });
    const link = document.createElement('a');
    link.download = 'design-export.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'project.json';
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 text-white">
      <div className="flex items-center space-x-2">
        <Layout className="w-6 h-6 text-indigo-500" />
        <span className="font-semibold text-lg tracking-tight">Design Studio</span>
      </div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          title="Undo"
        >
          <Undo className="w-5 h-5" />
        </button>
        <button 
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          title="Redo"
        >
          <Redo className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <button onClick={handleSave} className="flex items-center px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium transition-colors">
          <Save className="w-4 h-4 mr-2" />
          Save JSON
        </button>
        <button onClick={handleExport} className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium transition-colors">
          <Download className="w-4 h-4 mr-2" />
          Export PNG
        </button>
      </div>
    </div>
  );
};
