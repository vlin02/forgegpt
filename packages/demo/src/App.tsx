import { useEffect, useRef, useState } from 'react';
import { Builder, Engine } from 'block';
import { Renderer } from './renderer';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(false);
  const engineRef = useRef<Engine>(new Engine());
  const builderRef = useRef<Builder>(new Builder(engineRef.current));
  const rendererRef = useRef<any>(null);

  const builder = builderRef.current;

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const snapshotParam = urlParams.get('s');
    
    if (snapshotParam) {
      try {
        engineRef.current = Engine.fromURL(snapshotParam);
      } catch (e) {
        console.error('Failed to load snapshot from URL', e);
      }
    }
    
    const newRenderer = new Renderer(canvasRef.current, engineRef.current);
    rendererRef.current = newRenderer;
    rendererRef.current.render();
    rendererRef.current.setCursor(builder.getCursor());

    return () => {
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);


  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', position: 'relative' }}>
      <button 
        onClick={() => setShowLegend(true)} 
        style={{ 
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '5px 10px',
          zIndex: 100
        }}
      >
        Legend
      </button>
      <div ref={canvasRef} style={{ flex: 1, width: '100%' }} />

      {showLegend && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowLegend(false)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '20px',
              borderRadius: '8px',
              minWidth: '300px',
            }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
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
                <div style={{ width: '30px', height: '30px', backgroundColor: '#556b2f' }} />
                <span>Piston (retracted)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#88ff44' }} />
                <span>Piston (extended)</span>
              </div>
            </div>
            <button
              onClick={() => setShowLegend(false)}
              style={{ marginTop: '20px', padding: '10px', width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
