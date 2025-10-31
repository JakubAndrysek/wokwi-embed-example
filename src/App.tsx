import { useEffect, useRef, useState } from 'react';
import { MessagePortTransport, APIClient } from 'wokwi-cli';
import type { APIEvent, SerialMonitorDataPayload } from 'wokwi-cli';

const diagram = `{
  "version": 1,
  "author": "Uri Shaked",
  "editor": "wokwi",
  "parts": [
    {
      "type": "board-esp32-devkit-c-v4",
      "id": "esp",
      "top": 0,
      "left": 0,
      "attrs": { "env": "micropython-20231227-v1.22.0" }
    }
  ],
  "connections": [ [ "esp:TX", "$serialMonitor:RX", "", [] ], [ "esp:RX", "$serialMonitor:TX", "", [] ] ],
  "dependencies": {}
}`;

const microPythonCode = `
import time
while True:
    print(f"Hello, World {time.time()}")
    time.sleep(1)
`;

function App() {
  const [output, setOutput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<APIClient | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.port) {
        console.log('Received MessagePort from iframe');

        const transport = new MessagePortTransport(event.data.port);
        const client = new APIClient(transport);
        clientRef.current = client;

        await client.connected;

        client.onConnected = async (helloMessage) => {
          console.log('Wokwi client connected', helloMessage);
          setIsConnected(true);

          await client.serialMonitorListen();
          await client.fileUpload('main.py', microPythonCode);
          await client.fileUpload('diagram.json', diagram);
        };

        client.listen('serial-monitor:data', (event: APIEvent<SerialMonitorDataPayload>) => {
          const rawBytes = new Uint8Array(event.payload.bytes);
          const text = new TextDecoder().decode(rawBytes);
          setOutput((prev) => prev + text);
        });

        client.onError = (error) => {
          console.error('Wokwi error:', error);
        };
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('Wokwi ESP32 MicroPython script loaded');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleStart = () => {
    if (clientRef.current) {
      clientRef.current.simStart({
        firmware: 'main.py',
        elf: 'main.py',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-6 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">
            Wokwi ESP32 MicroPython Example
          </h1>
          <p className="text-slate-400">
            Interactive ESP32 simulation with real-time serial monitoring
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Simulation Panel */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
            <h2 className="text-xl font-semibold text-blue-300 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd" />
              </svg>
              ESP32 Simulation
            </h2>

            <div className="bg-slate-950 rounded-lg p-2 mb-4">
              <iframe
                ref={iframeRef}
                src="https://wokwi.com/experimental/embed"
                width="100%"
                height="500"
                id="wokwi-embed"
                className="rounded-lg"
              ></iframe>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleStart}
                disabled={!isConnected}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center
                  ${isConnected
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/25'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start Simulation
              </button>

              <div className={`
                flex items-center px-4 py-2 rounded-lg text-sm font-medium
                ${isConnected
                  ? 'bg-green-900/50 text-green-400 border border-green-700'
                  : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                }
              `}>
                <div className={`
                  w-2 h-2 rounded-full mr-2 animate-pulse
                  ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}
                `}></div>
                {isConnected ? 'Connected' : 'Connecting...'}
              </div>
            </div>
          </div>

          {/* Serial Monitor Panel */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
            <h2 className="text-xl font-semibold text-blue-300 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>
              Serial Monitor Output
            </h2>

            <div className="bg-slate-950 rounded-lg p-4 h-[500px] overflow-auto border border-slate-700">
              <pre className="text-green-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {output || (
                  <span className="text-slate-500 italic">
                    Waiting for simulation output...
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
