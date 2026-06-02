import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Type, Square, Layout } from 'lucide-react';
import { fabric } from 'fabric';

type UnitType = 'px' | 'cm' | 'in';

const convertToPx = (value: number, unit: UnitType) => {
  if (unit === 'in') return Math.round(value * 96);
  if (unit === 'cm') return Math.round(value * 37.79527559);
  return value; // px
};

const convertFromPx = (value: number, unit: UnitType) => {
  if (unit === 'in') return Number((value / 96).toFixed(2));
  if (unit === 'cm') return Number((value / 37.79527559).toFixed(2));
  return value; // px
};

export const RightSidebar: React.FC = () => {
  const { canvas, selectedObjects, layers, pushHistory, canvasConfig, setCanvasConfig } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('properties');
  const [fillColor, setFillColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(40);
  
  // Canvas settings state
  const [canvasUnit, setCanvasUnit] = useState<UnitType>('px');
  const [canvasW, setCanvasW] = useState(800);
  const [canvasH, setCanvasH] = useState(800);

  useEffect(() => {
    if (selectedObjects.length === 1) {
      const obj = selectedObjects[0];
      if (obj.fill) setFillColor(obj.fill as string);
      if (obj.type === 'i-text') {
        setFontSize((obj as fabric.IText).fontSize || 40);
      }
    }
  }, [selectedObjects]);

  useEffect(() => {
    setCanvasW(convertFromPx(canvasConfig.width, canvasUnit));
    setCanvasH(convertFromPx(canvasConfig.height, canvasUnit));
  }, [canvasConfig.width, canvasConfig.height, canvasUnit]);

  const handleApplyCanvasSize = () => {
    const pxW = convertToPx(canvasW, canvasUnit);
    const pxH = convertToPx(canvasH, canvasUnit);
    setCanvasConfig({ width: pxW, height: pxH });
    
    // Update artboard size in canvas if it exists
    if (canvas) {
      const objects = canvas.getObjects();
      const artboard = objects.find(o => o.id === 'artboard');
      if (artboard) {
        artboard.set({ width: pxW, height: pxH });
        canvas.renderAll();
        pushHistory();
      }
    }
  };

  const updateFill = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFillColor(val);
    if (!canvas) return;
    selectedObjects.forEach(obj => obj.set('fill', val));
    canvas.renderAll();
    pushHistory();
  };

  const updateFontSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setFontSize(val);
    if (!canvas) return;
    selectedObjects.forEach(obj => {
      if (obj.type === 'i-text') {
        (obj as fabric.IText).set('fontSize', val);
      }
    });
    canvas.renderAll();
    pushHistory();
  };

  const moveLayer = (obj: fabric.Object, direction: 'up' | 'down') => {
    if (!canvas) return;
    if (direction === 'up') {
      canvas.bringForward(obj);
    } else {
      canvas.sendBackwards(obj);
    }
    canvas.discardActiveObject();
    canvas.renderAll();
    pushHistory();
    // Re-trigger layer update
    useEditorStore.getState().setLayers([...canvas.getObjects()]);
  };

  const deleteLayer = (obj: fabric.Object) => {
    if (!canvas) return;
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    pushHistory();
  };

  const toggleVisibility = (obj: fabric.Object) => {
    if (!canvas) return;
    obj.set('visible', !obj.visible);
    canvas.renderAll();
    pushHistory();
    useEditorStore.getState().setLayers([...canvas.getObjects()]);
  };

  const isText = selectedObjects.length > 0 && selectedObjects.every(o => o.type === 'i-text');

  return (
    <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col h-full text-gray-300 z-50">
      <div className="flex border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'properties' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
        >
          Properties
        </button>
        <button 
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'layers' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
        >
          Layers
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'properties' ? (
          selectedObjects.length === 0 ? (
            <div className="space-y-6">
              <div className="text-sm text-gray-400 flex flex-col items-center justify-center space-y-2 py-4 border-b border-gray-800">
                <Layout className="w-8 h-8 text-gray-600" />
                <span>No selection</span>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 block">Canvas Settings</label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Unit</span>
                    <select 
                      value={canvasUnit} 
                      onChange={(e) => setCanvasUnit(e.target.value as UnitType)}
                      className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1 outline-none focus:border-indigo-500"
                    >
                      <option value="px">Pixels (px)</option>
                      <option value="in">Inches (in)</option>
                      <option value="cm">Centimeters (cm)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Width</span>
                    <input 
                      type="number" 
                      value={canvasW} 
                      onChange={(e) => setCanvasW(Number(e.target.value))}
                      className="w-20 bg-gray-800 border border-gray-700 text-white rounded p-1 text-sm text-right outline-none focus:border-indigo-500" 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Height</span>
                    <input 
                      type="number" 
                      value={canvasH} 
                      onChange={(e) => setCanvasH(Number(e.target.value))}
                      className="w-20 bg-gray-800 border border-gray-700 text-white rounded p-1 text-sm text-right outline-none focus:border-indigo-500" 
                    />
                  </div>
                  
                  <button 
                    onClick={handleApplyCanvasSize}
                    className="w-full mt-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm py-1.5 rounded transition-colors"
                  >
                    Apply Size
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Appearance</label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Fill Color</span>
                    <input type="color" value={fillColor} onChange={updateFill} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  </div>
                </div>
              </div>
              
              {isText && (
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Typography</label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Font Size</span>
                      <input type="number" value={fontSize} onChange={updateFontSize} className="w-16 bg-gray-800 border border-gray-700 text-white rounded p-1 text-sm text-right outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="space-y-2">
            {[...layers].reverse().map((layer, index) => {
              const isSelected = selectedObjects.includes(layer);
              const Icon = layer.type === 'i-text' ? Type : Square;
              
              return (
                <div key={index} className={`flex items-center justify-between p-2 rounded ${isSelected ? 'bg-indigo-900 border border-indigo-700' : 'bg-gray-800 border border-transparent'} group`}>
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm truncate w-24">
                      {layer.type === 'i-text' ? (layer as fabric.IText).text : 'Shape'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleVisibility(layer)} className="p-1 hover:text-white text-gray-400">
                      {layer.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                    </button>
                    <button onClick={() => moveLayer(layer, 'up')} className="p-1 hover:text-white text-gray-400">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveLayer(layer, 'down')} className="p-1 hover:text-white text-gray-400">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteLayer(layer)} className="p-1 hover:text-red-400 text-gray-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {layers.length === 0 && (
              <div className="text-sm text-gray-500 text-center mt-10">No layers on canvas</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
