import { useEffect, useRef, useState } from 'react';
import { Builder, Engine, type Block, OpaqueBlock, RedstoneDust, Piston, Lever, Position, UP, DOWN } from 'block';
import { Renderer } from './renderer';
import { parseAndExecute } from './parser';
import './App.css';

const defaultCode = ``;

function initializeTestScene(engine: Engine, markers: Map<string, Block>) {
  // 2-wide piston door test setup
  const piston1 = new Piston(UP);
  const piston2 = new Piston(UP);
  engine.setBlock(new Position(0, 1, 0), piston1);
  engine.setBlock(new Position(2, 1, 0), piston2);

  const blockA = new OpaqueBlock();
  const blockB = new OpaqueBlock();
  engine.setBlock(new Position(0, 2, 0), blockA);
  engine.setBlock(new Position(2, 2, 0), blockB);

  engine.setBlock(new Position(1, 1, 0), new OpaqueBlock());

  engine.setBlock(new Position(-1, -1, 0), new OpaqueBlock());
  engine.setBlock(new Position(0, -1, 0), new OpaqueBlock());
  engine.setBlock(new Position(1, -1, 0), new OpaqueBlock());

  engine.setBlock(new Position(0, 0, 0), new RedstoneDust());
  engine.setBlock(new Position(1, 0, 0), new RedstoneDust());
  
  const lever = new Lever(DOWN);
  engine.setBlock(new Position(-1, 0, 0), lever);
  markers.set('lever', lever);
}

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(defaultCode);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showLegend, setShowLegend] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [popoverInfo, setPopoverInfo] = useState<{ name: string; info: string; x: number; y: number } | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const builderRef = useRef<Builder | null>(null);
  const markersRef = useRef<Map<string, Block>>(new Map());
  const rendererRef = useRef<any>(null);
  
  if (!engineRef.current) {
    engineRef.current = new Engine();
    initializeTestScene(engineRef.current, markersRef.current);
    builderRef.current = new Builder(engineRef.current);
  }
  
  const [markers, setMarkers] = useState<Map<string, Block>>(() => new Map(markersRef.current));

  const engine = engineRef.current;
  const builder = builderRef.current;

  const executeCode = () => {
    if (!canvasRef.current || !code.trim() || !engine || !builder) return;

    try {
      parseAndExecute(builder, code, markersRef.current);
      setMarkers(new Map(markersRef.current));

      if (!rendererRef.current) {
        const newRenderer = new Renderer(canvasRef.current, engine);
        rendererRef.current = newRenderer;
      }
      
      rendererRef.current.render();
      rendererRef.current.setCursor(builder.getCursor());
      
      setHistory(prev => [...prev, code]);
      setCode('');
      setError('');
      
      setTimeout(() => {
        if (historyRef.current) {
          historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
      }, 0);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      executeCode();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, window.innerHeight * 0.4);
    textarea.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    return () => {
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  const handleReset = () => {
    engineRef.current = new Engine();
    builderRef.current = new Builder(engineRef.current);
    markersRef.current = new Map();
    initializeTestScene(engineRef.current, markersRef.current);
    setMarkers(new Map(markersRef.current));
    setHistory([]);
    setCode('');
    setError('');
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
  };

  useEffect(() => {
    if (rendererRef.current && hoveredBlock) {
      const block = markers.get(hoveredBlock);
      if (block) {
        rendererRef.current.setHighlight(block);
      }
    } else if (rendererRef.current) {
      rendererRef.current.setHighlight(null);
    }
  }, [hoveredBlock, markers]);

  return (
    <div style={{ display: 'flex', height: '100vh', gap: '10px', padding: '10px', boxSizing: 'border-box' }}>
      <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#2a2a2a', 
          fontFamily: 'monospace', 
          fontSize: '12px'
        }}>
          <div>Cursor: ({builder?.getCursor().x}, {builder?.getCursor().y}, {builder?.getCursor().z})</div>
          {markers.size > 0 && (
            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span>Named:</span>
              {Array.from(markers.keys()).map((id) => (
                <span 
                  key={id}
                  onMouseEnter={(e) => {
                    setHoveredBlock(id);
                    try {
                      const block = markers.get(id);
                      if (block && engineRef.current) {
                        const info = engineRef.current.inspectBlock(block);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPopoverInfo({ name: id, info, x: rect.right + 10, y: rect.top });
                      }
                    } catch {}
                  }}
                  onMouseLeave={() => {
                    setHoveredBlock(null);
                    setPopoverInfo(null);
                  }}
                  style={{ 
                    cursor: 'pointer', 
                    textDecoration: hoveredBlock === id ? 'underline' : 'none',
                    color: hoveredBlock === id ? '#ffaa00' : 'inherit'
                  }}
                >
                  {id}
                </span>
              ))}
            </div>
          )}
        </div>
        <div 
          ref={historyRef}
          style={{ 
            flex: 1, 
            backgroundColor: '#1a1a1a', 
            padding: '10px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '13px',
            whiteSpace: 'pre-wrap'
          }}
        >
          {history.map((cmd, i) => (
            <div key={i} style={{ display: 'flex', marginBottom: '8px', color: '#888' }}>
              <span style={{ color: '#4a9eff', userSelect: 'none', marginRight: '8px' }}>{'>'}</span>
              <span>{cmd}</span>
            </div>
          ))}
        </div>
        <textarea
          value={code}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          style={{ 
            minHeight: '60px',
            maxHeight: '40vh',
            fontFamily: 'monospace', 
            fontSize: '14px',
            resize: 'none',
            overflow: 'auto'
          }}
        />
        {error && <div style={{ color: 'red', padding: '8px', fontSize: '13px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={executeCode} style={{ padding: '10px', fontSize: '16px', flex: 1 }}>
            Run (Cmd+Enter)
          </button>
          <button onClick={handleReset} style={{ padding: '10px', fontSize: '16px' }}>
            Reset
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
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
      </div>

      {popoverInfo && (
        <div
          style={{
            position: 'fixed',
            left: `${popoverInfo.x}px`,
            top: `${popoverInfo.y}px`,
            backgroundColor: '#2a2a2a',
            border: '1px solid #ffaa00',
            padding: '10px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            whiteSpace: 'pre',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {popoverInfo.info}
        </div>
      )}

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
            onClick={(e) => e.stopPropagation()}
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
