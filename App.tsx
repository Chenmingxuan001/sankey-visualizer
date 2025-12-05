import React, { useState, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import SankeyDiagram, { SankeyDiagramRef } from './components/SankeyDiagram';
import Controls from './components/Controls';
import { processYearData } from './utils/processData';
import { NdDataRow, VisualizationSettings, CustomLabel, SavedLayoutMap } from './types';
import { AlertCircle, Upload } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<NdDataRow[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Layout Persistence State
  const [savedLayout, setSavedLayout] = useState<SavedLayoutMap | null>(null);
  
  // Custom Labels State
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>([]);
  
  // Ref to trigger save from Controls
  const sankeyRef = useRef<SankeyDiagramRef>(null);

  // Updated colors to match Figure S8: 
  // Domestic = Green, Trade = Blue, Loss = Grey
  const [settings, setSettings] = useState<VisualizationSettings>({
    nodeWidth: 25,
    nodePadding: 30,
    fontSize: 12,
    linkFontSize: 10, 
    flowScale: 0.9, 
    colorDomestic: '#74c476', // Light Green
    colorTrade: '#2171b5',    // Strong Blue
    colorLoss: '#969696',     // Grey
    showLabels: true,
    align: 'justify'
  });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Parse data
        const jsonData = XLSX.utils.sheet_to_json<NdDataRow>(ws);
        
        // Validate basics
        if (!jsonData || jsonData.length === 0) {
          throw new Error("No data found in the Excel file.");
        }
        
        // Check for 'year' column
        if (!jsonData[0].hasOwnProperty('year')) {
            throw new Error("Column 'year' missing. Please ensure the Excel follows the required format.");
        }

        setData(jsonData);
        
        // Extract unique years and sort
        const availableYears: number[] = Array.from(new Set(jsonData.map((r: NdDataRow) => Number(r.year)))).sort((a: number, b: number) => a - b);
        setYears(availableYears);
        if (availableYears.length > 0) {
          setSelectedYear(availableYears[0]);
        }
        setError(null);
        setCustomLabels([]); // Reset labels on new file
      } catch (err) {
        console.error(err);
        setError("Error parsing Excel file. Please ensure it matches the specified schema.");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const processedGraphData = useMemo(() => {
    if (!selectedYear || data.length === 0) return { nodes: [], links: [] };
    const row = data.find(r => Number(r.year) === selectedYear);
    if (!row) return { nodes: [], links: [] };
    return processYearData(row);
  }, [data, selectedYear]);

  const handleDownloadJPG = () => {
    const svgEl = document.querySelector('svg');
    if (!svgEl) {
        alert("Could not find diagram to save.");
        return;
    }
    
    // 1. Prepare SVG string with proper namespaces
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    // Ensure namespace exists
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Ensure width and height are explicit for the canvas to know how big to draw
    const svgRect = svgEl.getBoundingClientRect();
    const width = svgRect.width || 1200;
    const height = svgRect.height || 800;
    
    // Add explicit w/h if missing in string
    if(!source.match(/^<svg[^>]+width="/)){
         source = source.replace(/^<svg/, `<svg width="${width}" height="${height}"`);
    }

    // 2. Create URL
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    // 3. Draw to Canvas
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2; // Higher resolution
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            URL.revokeObjectURL(url);
            return;
        }
        
        // Fill White Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale and Draw
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height); // Draw using original dimensions, context is scaled
        
        // 4. Download
        try {
            const jpgUrl = canvas.toDataURL("image/jpeg", 0.95);
            const link = document.createElement("a");
            link.href = jpgUrl;
            link.download = `sankey_nd_flow_${selectedYear || 'data'}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Download failed", e);
            alert("Failed to save image. Browser security might be blocking canvas export.");
        }
        
        URL.revokeObjectURL(url);
    };

    img.onerror = (e) => {
        console.error("Image load failed", e);
        alert("Failed to render SVG for download.");
        URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const handleDownloadPDF = async () => {
    const svgEl = document.querySelector('svg');
    if (!svgEl) {
        alert("Could not find diagram to save.");
        return;
    }

    try {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const margin = 20;

        await svg2pdf(svgEl as SVGElement, doc, {
            x: margin,
            y: margin,
            width: pageWidth - (margin * 2),
            height: pageHeight - (margin * 2)
        });

        doc.save(`sankey_nd_flow_${selectedYear || 'data'}.pdf`);
    } catch (e) {
        console.error("PDF Generation Error:", e);
        alert("Failed to generate PDF. Check console for details.");
    }
  };

  const handleAddText = () => {
      const newLabel: CustomLabel = {
          id: Date.now().toString(),
          text: "New Label",
          x: 550, // Center-ish
          y: 350
      };
      setCustomLabels([...customLabels, newLabel]);
  };

  const handleSaveLayout = useCallback((layout: SavedLayoutMap) => {
      setSavedLayout(layout);
  }, []);
  
  const triggerSaveLayout = () => {
      if (sankeyRef.current) {
          sankeyRef.current.saveLayout();
      }
  };

  return (
    <div className="flex h-screen bg-white">
      <Controls 
        years={years}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        settings={settings}
        onSettingsChange={setSettings}
        onFileUpload={handleFileUpload}
        onDownload={handleDownloadJPG}
        onDownloadPDF={handleDownloadPDF}
        onAddText={handleAddText}
        onSaveLayoutClick={triggerSaveLayout}
      />
      
      <main className="flex-1 p-8 overflow-hidden flex flex-col items-center justify-center bg-slate-50 relative">
        
        {/* Header inside main area for context */}
        <div className="absolute top-6 left-8 z-10 pointer-events-none">
            <h2 className="text-2xl font-bold text-slate-800 pointer-events-auto">
                {selectedYear ? `Year: ${selectedYear}` : "No Data Loaded"}
            </h2>
            {selectedYear && (
                <p className="text-slate-500 text-sm mt-1">
                   Drag nodes to move • Drag corners to resize • Hover nodes to adjust flows
                </p>
            )}
        </div>

        {error && (
            <div className="absolute top-6 right-8 z-10 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                <AlertCircle size={20} />
                {error}
            </div>
        )}

        {processedGraphData.nodes.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center pt-12 relative">
            <SankeyDiagram 
                ref={sankeyRef}
                data={processedGraphData} 
                settings={settings}
                customLabels={customLabels}
                onUpdateLabels={setCustomLabels}
                savedLayout={savedLayout}
                onSaveLayout={handleSaveLayout}
                width={1200} 
                height={800}
            />
          </div>
        ) : (
          <div className="text-center text-slate-400 max-w-md">
             <div className="mb-4 mx-auto w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                <Upload className="text-slate-300" />
             </div>
             <p className="font-medium text-lg text-slate-600">Waiting for Data</p>
             <p className="text-sm mt-2">Upload an Excel file (.xlsx) containing the Nd flow data columns to generate the diagram.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;