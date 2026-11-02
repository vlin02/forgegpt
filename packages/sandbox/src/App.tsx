import { useEffect, useRef, useState } from 'react';
import { Engine, Position } from 'block';
import * as block from 'block';
import { Renderer } from './renderer.js';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [code, setCode] = useState('// Globals: engine, pause, block\n// Import from block: const { Position, EAST, WEST, NORTH, SOUTH, UP, DOWN, OpaqueBlock, Lever, RedstoneDust, Piston } = block;\n// Use await pause() to pause execution and update visualization\n\nconst { Position } = block;\n\nengine.tick();\nawait pause();');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const engineRef = useRef<Engine>(new Engine());
  const rendererRef = useRef<Renderer | null>(null);
  const pauseResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    rendererRef.current = new Renderer(canvasRef.current, engineRef.current);
    rendererRef.current.render();

    return () => rendererRef.current?.dispose();
  }, []);

  const resetEngine = () => {
    engineRef.current = new Engine();
    if (rendererRef.current && canvasRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = new Renderer(canvasRef.current, engineRef.current);
      rendererRef.current.render();
    }
  };

  const runCode = async () => {
    if (!rendererRef.current || !canvasRef.current) return;
    
    resetEngine();
    setIsRunning(true);
    setIsPaused(false);
    
    const renderer = rendererRef.current;
    const engine = engineRef.current;
    
    const pause = async () => {
      renderer.render();
      await new Promise(resolve => setTimeout(resolve, 0));
      setIsPaused(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      await new Promise<void>(resolve => { pauseResolverRef.current = resolve; });
      setIsPaused(false);
    };
    
    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction('engine', 'pause', 'block', code);
      await fn(engine, pause, block);
      renderer.render();
    } catch (err: any) {
      console.error('Error executing code:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsRunning(false);
      setIsPaused(false);
      pauseResolverRef.current = null;
    }
  };

  const resume = () => {
    if (pauseResolverRef.current) {
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
  };

  const reset = () => {
    setIsRunning(false);
    setIsPaused(false);
    pauseResolverRef.current = null;
    resetEngine();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div style={{ width: '400px', backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column', padding: '10px', gap: '10px' }}>
        <h3 style={{ margin: 0, color: '#ddd' }}>Code Editor</h3>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#2a2a2a', color: '#ddd', border: '1px solid #444', padding: '10px', resize: 'none' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isRunning ? (
            <button onClick={runCode} style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
              Run
            </button>
          ) : isPaused ? (
            <button onClick={resume} style={{ flex: 1, padding: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}>
              Resume
            </button>
          ) : null}
          <button onClick={reset} disabled={isRunning && !isPaused} style={{ flex: 1, padding: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', cursor: isRunning && !isPaused ? 'not-allowed' : 'pointer', opacity: isRunning && !isPaused ? 0.5 : 1 }}>
            Reset
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <button onClick={() => setShowLegend(true)} style={{ position: 'absolute', top: '10px', right: '10px', padding: '5px 10px', zIndex: 100 }}>
          Legend
        </button>
        <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {showLegend && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowLegend(false)}>
          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', minWidth: '300px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Legend</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #444' }}>
                <strong>Axes:</strong> Red=East/West, Green=Up/Down, Blue=North/South<br />
                <strong>Origin:</strong> White sphere at (0,0,0)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#9d9d97' }} />
                <span>Solid Block (unpowered)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#ffffff' }} />
                <span>Solid Block (powered)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#654321' }} />
                <span>Lever (gray base + brown stick, off)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#ffaa00' }} />
                <span>Lever (gray base + orange stick, on)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#330000' }} />
                <span>Redstone Dust (shape varies by connections)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#ff0000' }} />
                <span>Powered Dust (brighter = more power)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', background: 'linear-gradient(90deg, #808080 70%, #8b6914 70%)' }} />
                <span>Piston (gray base + brown wood face, retracted)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', background: 'linear-gradient(90deg, #808080 70%, #ffaa00 70%)' }} />
                <span>Piston (gray base + orange wood face, extended)</span>
              </div>
            </div>
            <button onClick={() => setShowLegend(false)} style={{ marginTop: '20px', padding: '10px', width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
