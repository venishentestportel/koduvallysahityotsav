import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';

export const CanvasComponent: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { setCanvas, setSelectedObjects, setLayers, pushHistory, canvasConfig, activeTool } = useEditorStore();

  useEffect(() => {
    if (!wrapperRef.current) return;

    // Create canvas element dynamically
    const canvasEl = document.createElement('canvas');
    wrapperRef.current.appendChild(canvasEl);

    // Initialize Fabric canvas - transparent background
    const canvas = new fabric.Canvas(canvasEl, {
      preserveObjectStacking: true,
      selection: true,
    });

    setCanvas(canvas);

    // Resize observer to make the canvas fill the workspace
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.renderAll();
    });
    resizeObserver.observe(wrapperRef.current);

    // Create the "Artboard" (the white page)
    const artboard = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvasConfig.width,
      height: canvasConfig.height,
      fill: canvasConfig.backgroundColor || '#ffffff',
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      // @ts-ignore
      id: 'artboard',
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.3)',
        blur: 20,
        offsetX: 0,
        offsetY: 10
      })
    });
    
    canvas.add(artboard);

    // Center the artboard initially
    setTimeout(() => {
      if (wrapperRef.current) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] = (wrapperRef.current.clientWidth - canvasConfig.width) / 2;
          vpt[5] = (wrapperRef.current.clientHeight - canvasConfig.height) / 2;
          canvas.setViewportTransform(vpt);
          canvas.requestRenderAll();
        }
      }
    }, 50);

    const updateLayers = () => {
      // @ts-ignore
      setLayers(canvas.getObjects().filter(o => o.id !== 'artboard'));
    };

    const handleHistory = () => {
      pushHistory();
      updateLayers();
    };

    // Setup event listeners
    canvas.on('selection:created', () => {
      // @ts-ignore
      setSelectedObjects(canvas.getActiveObjects().filter(o => o.id !== 'artboard'));
    });
    canvas.on('selection:updated', () => {
      // @ts-ignore
      setSelectedObjects(canvas.getActiveObjects().filter(o => o.id !== 'artboard'));
    });
    canvas.on('selection:cleared', () => setSelectedObjects([]));
    
    canvas.on('object:modified', handleHistory);
    canvas.on('object:added', (e) => {
      // @ts-ignore
      if (e.target && e.target.id !== 'artboard') updateLayers();
    });
    canvas.on('object:removed', updateLayers);

    // Prevent artboard from ever being in front
    canvas.on('after:render', () => {
      if (canvas.getObjects()[0] !== artboard) {
        artboard.sendToBack();
      }
    });

    // Zooming and Panning with Mouse Wheel / Trackpad
    canvas.on('mouse:wheel', function(opt) {
      const evt = opt.e as WheelEvent;
      
      if (evt.ctrlKey || evt.metaKey) {
        // Zooming
        const delta = evt.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint({ x: evt.offsetX, y: evt.offsetY }, zoom);
      } else {
        // Panning (scrolling)
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] -= evt.deltaX;
          vpt[5] -= evt.deltaY;
          canvas.requestRenderAll();
        }
      }
      
      evt.preventDefault();
      evt.stopPropagation();
    });

    // Panning
    canvas.on('mouse:down', function(opt) {
      const evt = opt.e as MouseEvent;
      const { activeTool } = useEditorStore.getState();
      
      // Allow panning if holding Space, Alt, Middle Mouse, or if Hand tool is active
      if (evt.altKey || evt.code === 'Space' || activeTool === 'hand' || (evt.buttons === 4)) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', function(opt) {
      if (this.isDragging) {
        const e = opt.e as MouseEvent;
        const vpt = this.viewportTransform!;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }
    });

    canvas.on('mouse:up', function() {
      this.isDragging = false;
      this.selection = true;
    });

    // Spacebar panning state
    let isSpaceDown = false;

    // Handle delete & history keys & spacebar & clipboard
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar panning
      if (e.code === 'Space' && !isSpaceDown) {
        // Prevent panning if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        const activeObjects = canvas.getActiveObjects();
        const isEditingText = activeObjects.some(obj => obj.type === 'i-text' && (obj as fabric.IText).isEditing);
        if (isEditingText) return;

        isSpaceDown = true;
        e.preventDefault();
        canvas.defaultCursor = 'grab';
        useEditorStore.getState().setActiveTool('hand');
        return;
      }

      // Check if user is editing text, if so, allow native behavior
      const activeObjects = canvas.getActiveObjects();
      const isEditingText = activeObjects.some(obj => obj.type === 'i-text' && (obj as fabric.IText).isEditing);
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (isEditingText) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          activeObject.clone((cloned: any) => {
            useEditorStore.getState().setClipboard(cloned);
          });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (isEditingText) return;
        const clipboard = useEditorStore.getState().clipboard;
        if (!clipboard) return;
        
        clipboard.clone((clonedObj: any) => {
          canvas.discardActiveObject();
          clonedObj.set({
            left: clonedObj.left + 20,
            top: clonedObj.top + 20,
            evented: true,
          });
          
          if (clonedObj.type === 'activeSelection') {
            clonedObj.canvas = canvas;
            clonedObj.forEachObject((obj: any) => {
              canvas.add(obj);
            });
            clonedObj.setCoords();
          } else {
            canvas.add(clonedObj);
          }
          
          // Increment clipboard offset for next paste
          clipboard.top += 20;
          clipboard.left += 20;
          
          canvas.setActiveObject(clonedObj);
          canvas.requestRenderAll();
          handleHistory();
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (isEditingText) return;
        e.preventDefault();
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          activeObject.clone((clonedObj: any) => {
            canvas.discardActiveObject();
            clonedObj.set({
              left: clonedObj.left + 20,
              top: clonedObj.top + 20,
              evented: true,
            });
            
            if (clonedObj.type === 'activeSelection') {
              clonedObj.canvas = canvas;
              clonedObj.forEachObject((obj: any) => {
                canvas.add(obj);
              });
              clonedObj.setCoords();
            } else {
              canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            handleHistory();
          });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isEditingText) return;
        e.preventDefault();
        if (e.shiftKey) useEditorStore.getState().redo();
        else useEditorStore.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (isEditingText) return;
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isEditingText) return;
        if (activeObjects.length) {
          activeObjects.forEach((obj) => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          handleHistory();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown = false;
        canvas.defaultCursor = 'default';
        useEditorStore.getState().setActiveTool('select');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Prevent pasting if we are currently editing a text box
      const activeObjects = canvas.getActiveObjects();
      const isEditingText = activeObjects.some(obj => obj.type === 'i-text' && (obj as fabric.IText).isEditing);
      if (isEditingText) return;

      // Check if we just did an internal paste from the handleKeyDown
      // Usually keydown fires before paste. If there's an internal object, we still might want to allow external paste?
      // Actually, if they paste, we can check if there's plain text.
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const text = clipboardData.getData('text/plain');
      if (text) {
        const textObj = new fabric.IText(text, {
          left: canvasConfig.width / 2,
          top: canvasConfig.height / 2,
          fontFamily: 'Inter',
          fill: '#333333',
          fontSize: 40,
        });
        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        canvas.requestRenderAll();
        handleHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);

    // Initial dummy data
    const text = new fabric.IText('Hello Design Studio', {
      left: 200,
      top: 200,
      fontFamily: 'Inter',
      fill: '#333333',
      fontSize: 40,
    });
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: '#6366f1',
      width: 100,
      height: 100,
      rx: 10,
      ry: 10,
    });

    canvas.add(rect, text);
    
    // Save initial state
    setTimeout(() => {
      pushHistory();
      updateLayers();
    }, 150);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
      resizeObserver.disconnect();
      canvas.dispose();
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = '';
      }
    };
  }, []);

  return <div ref={wrapperRef} className="w-full h-full" />;
};
