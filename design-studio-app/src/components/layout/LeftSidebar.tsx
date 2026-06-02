import React, { useState } from 'react';
import { MousePointer2, Type, Square, Image as ImageIcon, Hand, Circle, Triangle, Shapes, FileJson, Cloud, FileText } from 'lucide-react';
import { useEditorStore, type ToolType } from '../../store/useEditorStore';
import { fabric } from 'fabric';
import { createClient } from '@supabase/supabase-js';
import { extractDataFromPdf } from '../../utils/pdfExtractor';

const SUPABASE_URL = 'https://lxbvadjjboavxwidxsnl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const LeftSidebar: React.FC = () => {
  const { activeTool, setActiveTool, canvas, pushHistory, setAiTemplate, aiTemplate } = useEditorStore();
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supabaseFiles, setSupabaseFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const handleToolClick = (toolId: string) => {
    if (toolId === 'select' || toolId === 'hand') {
      setActiveTool(toolId as ToolType);
    } else if (toolId === 'text') {
      addText();
    } else if (toolId === 'shape-rect') {
      addRect();
      setShowShapeMenu(false);
    } else if (toolId === 'shape-circle') {
      addCircle();
      setShowShapeMenu(false);
    } else if (toolId === 'shape-triangle') {
      addTriangle();
      setShowShapeMenu(false);
    } else if (toolId === 'shapes') {
      setShowShapeMenu(!showShapeMenu);
    } else if (toolId === 'upload-ai') {
      document.getElementById('ai-json-upload')?.click();
    } else if (toolId === 'supabase-ai') {
      fetchSupabaseFiles();
      setShowSupabaseModal(true);
    } else if (toolId === 'auto-fill-pdf') {
      document.getElementById('bulk-pdf-upload')?.click();
    }
  };

  const fetchSupabaseFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage.from('json file').list();
      if (error) throw error;
      const jsonFiles = (data || []).filter(f => f.name.endsWith('.json'));
      setSupabaseFiles(jsonFiles);
    } catch (err) {
      console.error('Error fetching Supabase files:', err);
      alert('Failed to fetch files from Supabase.');
    }
    setIsLoadingFiles(false);
  };

  const drawRegionsToCanvas = (data: any) => {
    if (!canvas) return;
    const canvasWidth = canvas.width || 800;
    const canvasHeight = canvas.height || 800;

    data.regions.forEach((region: any) => {
      const rx = parseFloat(region.boundingBox.x) * canvasWidth;
      const ry = parseFloat(region.boundingBox.y) * canvasHeight;
      const rw = parseFloat(region.boundingBox.w) * canvasWidth;
      const rh = parseFloat(region.boundingBox.h) * canvasHeight;

      const rect = new fabric.Rect({
        left: 0,
        top: 0,
        width: rw,
        height: rh,
        fill: 'rgba(49, 130, 206, 0.2)',
        stroke: '#3182ce',
        strokeWidth: 2,
      });

      const text = new fabric.Text(`${region.label}\n(${region.text || 'No text'})`, {
        left: 0,
        top: rh + 5,
        fontSize: 14,
        fill: '#2b6cb0',
        fontFamily: 'Inter',
      });

      const group = new fabric.Group([rect, text], {
        left: rx,
        top: ry,
      });

      // Tag the group so we can find it later when auto-filling
      (group as any).aiLabel = region.label;
      (group as any).boundingBox = region.boundingBox;

      canvas.add(group);
    });

    setAiTemplate(data);
    canvas.renderAll();
    pushHistory();
  };

  const loadFromSupabase = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('json file').download(fileName);
      if (error) throw error;
      
      const text = await data.text();
      const jsonData = JSON.parse(text);
      
      if (jsonData.metadata?.type !== 'ai_pdf_extraction_template' || !jsonData.regions) {
        alert('Invalid AI PDF Template format.');
        return;
      }

      drawRegionsToCanvas(jsonData);
      setShowSupabaseModal(false);
    } catch (err) {
      console.error('Error loading file:', err);
      alert('Failed to load the file from Supabase.');
    }
  };

  const handleAIJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.metadata?.type !== 'ai_pdf_extraction_template' || !data.regions) {
          alert('Invalid AI PDF Template format.');
          return;
        }

        drawRegionsToCanvas(data);
        
        // Reset input so the same file can be uploaded again if needed
        e.target.value = '';
      } catch (err) {
        console.error('Error parsing JSON', err);
        alert('Failed to parse the uploaded file.');
      }
    };
    reader.readAsText(file);
  };

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('Double click to edit', {
      left: canvas.width ? canvas.width / 2 - 100 : 200,
      top: canvas.height ? canvas.height / 2 - 20 : 200,
      fontFamily: 'Inter',
      fill: '#333333',
      fontSize: 40,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    pushHistory();
  };

  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: canvas.width ? canvas.width / 2 - 50 : 200,
      top: canvas.height ? canvas.height / 2 - 50 : 200,
      fill: '#6366f1',
      width: 100,
      height: 100,
      rx: 8,
      ry: 8,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    pushHistory();
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: canvas.width ? canvas.width / 2 - 50 : 200,
      top: canvas.height ? canvas.height / 2 - 50 : 200,
      fill: '#ec4899',
      radius: 50,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    pushHistory();
  };

  const addTriangle = () => {
    if (!canvas) return;
    const triangle = new fabric.Triangle({
      left: canvas.width ? canvas.width / 2 - 50 : 200,
      top: canvas.height ? canvas.height / 2 - 50 : 200,
      fill: '#10b981',
      width: 100,
      height: 100,
    });
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.renderAll();
    pushHistory();
  };

  const primaryTools = [
    { id: 'select', icon: MousePointer2, label: 'Move Tool (V)' },
    { id: 'hand', icon: Hand, label: 'Hand Tool (H)' },
    { id: 'text', icon: Type, label: 'Add Text (T)' },
    { id: 'shapes', icon: Shapes, label: 'Shapes' },
    { id: 'image', icon: ImageIcon, label: 'Upload Image (I)' },
    { id: 'upload-ai', icon: FileJson, label: 'Upload AI JSON (Local)' },
    { id: 'supabase-ai', icon: Cloud, label: 'Load AI JSON from Supabase' },
    { id: 'auto-fill-pdf', icon: FileText, label: 'Auto-fill from PDFs' },
  ];

  const shapeTools = [
    { id: 'shape-rect', icon: Square, label: 'Rectangle (R)' },
    { id: 'shape-circle', icon: Circle, label: 'Circle (O)' },
    { id: 'shape-triangle', icon: Triangle, label: 'Triangle (P)' },
  ];

  return (
    <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 space-y-4 z-50 relative">
      {primaryTools.map((tool) => (
        <div key={tool.id} className="relative group">
          <button
            onClick={() => handleToolClick(tool.id)}
            className={`p-3 rounded-xl transition-all relative ${
              activeTool === tool.id || (tool.id === 'shapes' && showShapeMenu) ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tool.icon className="w-6 h-6" />
          </button>
          
          {/* Tooltip */}
          {!showShapeMenu && (
            <div className="absolute left-14 top-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {tool.label}
            </div>
          )}
          
          {/* Shape Flyout Menu */}
          {tool.id === 'shapes' && showShapeMenu && (
            <div className="absolute left-16 top-0 ml-2 bg-gray-900 border border-gray-800 rounded-lg shadow-xl py-2 w-48 z-[100]">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Select Shape</div>
              {shapeTools.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => handleToolClick(shape.id)}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <shape.icon className="w-4 h-4 mr-3" />
                  {shape.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      
      <input
        type="file"
        id="ai-json-upload"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleAIJsonUpload}
      />
      
      <input
        type="file"
        id="bulk-pdf-upload"
        accept=".pdf"
        multiple
        style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            if (!aiTemplate) {
              alert("Please load an AI JSON Template first!");
              return;
            }
            if (!canvas) return;

            setIsLoadingFiles(true);
            const files = Array.from(e.target.files);
            
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              try {
                const extractedData = await extractDataFromPdf(file, aiTemplate);
                
                // Update canvas groups
                canvas.getObjects().forEach((obj: any) => {
                  if (obj.type === 'group' && obj.aiLabel) {
                    const textObj = obj.getObjects().find((o: any) => o.type === 'text' || o.type === 'i-text' || o.type === 'textbox');
                    if (textObj && extractedData[obj.aiLabel] !== undefined) {
                      textObj.set('text', extractedData[obj.aiLabel] || ' ');
                    }
                  }
                });
                
                canvas.renderAll();
                pushHistory();
                
                // If multiple, export immediately so we can process the next one
                if (files.length > 1) {
                  const dataURL = canvas.toDataURL({
                    format: 'jpeg',
                    quality: 1,
                  });
                  const link = document.createElement('a');
                  link.download = `poster_${file.name.replace('.pdf', '')}.jpg`;
                  link.href = dataURL;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  // Wait a moment between downloads
                  await new Promise(r => setTimeout(r, 500));
                }

              } catch (err) {
                console.error(`Error processing ${file.name}:`, err);
                alert(`Failed to process ${file.name}`);
              }
            }
            
            setIsLoadingFiles(false);
            if (files.length > 1) {
              alert(`Successfully processed and downloaded ${files.length} posters.`);
            } else {
              alert('Successfully mapped data from PDF to the canvas.');
            }
            e.target.value = '';
          }
        }}
      />
      
      {/* Invisible backdrop to close shape menu when clicking outside */}
      {showShapeMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowShapeMenu(false)}
        />
      )}

      {/* Supabase Files Modal */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Cloud className="w-5 h-5 mr-2 text-indigo-600" />
                Supabase Templates
              </h2>
              <button 
                onClick={() => setShowSupabaseModal(false)}
                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
              >
                &times;
              </button>
            </div>
            
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Loading files...
                </div>
              ) : supabaseFiles.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 flex-col py-8">
                  <FileJson className="w-12 h-12 text-gray-300 mb-2" />
                  <p>No JSON templates found.</p>
                  <p className="text-sm text-center mt-2">Make sure you uploaded them to the 'json file' bucket in Supabase.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {supabaseFiles.map((file, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => loadFromSupabase(file.name)}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-lg transition-colors flex items-center"
                      >
                        <FileJson className="w-4 h-4 text-indigo-500 mr-3" />
                        <span className="truncate flex-1 text-sm text-gray-700">{file.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
