import React from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { RightSidebar } from './components/layout/RightSidebar';
import { Workspace } from './components/layout/Workspace';

function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-950 font-sans text-gray-100">
      {/* Background canvas takes the whole screen */}
      <div className="absolute inset-0 z-0">
        <Workspace />
      </div>
      
      {/* Floating UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="flex flex-col h-full">
          <div className="pointer-events-auto shadow-md">
            <TopBar />
          </div>
          <div className="flex flex-1 justify-between overflow-hidden">
            <div className="pointer-events-auto h-full shadow-lg">
              <LeftSidebar />
            </div>
            <div className="pointer-events-auto h-full shadow-lg">
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
