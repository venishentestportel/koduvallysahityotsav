import React from 'react';
import { CanvasComponent } from '../canvas/CanvasComponent';

export const Workspace: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-950 relative overflow-hidden" id="workspace-container">
      {/* Background grid - CSS based to remain stationary or we could move it to fabric. For now, stationary CSS grid. */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Canvas container */}
      <div className="absolute inset-0 z-10 w-full h-full">
        <CanvasComponent />
      </div>
    </div>
  );
};
