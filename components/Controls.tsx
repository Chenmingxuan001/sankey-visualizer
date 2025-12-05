import React from 'react';
import { VisualizationSettings } from '../types';
import { Settings2, Download, Upload, Type, Plus, Save, FileText } from 'lucide-react';

interface Props {
  years: number[];
  selectedYear: number | null;
  onYearChange: (year: number) => void;
  settings: VisualizationSettings;
  onSettingsChange: (newSettings: VisualizationSettings) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onDownloadPDF: () => void;
  onAddText: () => void;
  onSaveLayoutClick: () => void;
}

const Controls: React.FC<Props> = ({
  years,
  selectedYear,
  onYearChange,
  settings,
  onSettingsChange,
  onFileUpload,
  onDownload,
  onDownloadPDF,
  onAddText,
  onSaveLayoutClick
}) => {
  const handleSettingChange = (key: keyof VisualizationSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-slate-50 border-r border-slate-200 w-80 flex-shrink-0 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm">Nd</span>
          Sankey Viz
        </h1>
        <p className="text-sm text-slate-500 mt-1">Material Flow Analysis Tool</p>
      </div>

      {/* Data Upload Section */}
      <div className="p-6 border-b border-slate-200 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Upload size={16} /> Data Input
        </h2>
        
        <label className="block">
          <span className="sr-only">Choose excel file</span>
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={onFileUpload}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-emerald-50 file:text-emerald-700
              hover:file:bg-emerald-100
              cursor-pointer
            "
          />
        </label>

        {years.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Select Year</label>
            <select 
              value={selectedYear || ''} 
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Visualization Settings */}
      <div className="p-6 space-y-6 flex-1">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Settings2 size={16} /> Configuration
        </h2>

        {/* Layout */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-900 border-b pb-1">Layout</h3>
          
          <div>
             <label className="text-xs text-slate-500 flex justify-between">
                <span>Flow Thickness</span>
                <span>{Math.round(settings.flowScale * 100)}%</span>
             </label>
             <input 
                type="range" min="0.1" max="1" step="0.05"
                value={settings.flowScale}
                onChange={(e) => handleSettingChange('flowScale', Number(e.target.value))}
                className="w-full accent-emerald-600"
             />
          </div>

          <div>
            <label className="text-xs text-slate-500">Node Width ({settings.nodeWidth}px)</label>
            <input 
              type="range" min="5" max="100" 
              value={settings.nodeWidth}
              onChange={(e) => handleSettingChange('nodeWidth', Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Vertical Padding ({settings.nodePadding}px)</label>
            <input 
              type="range" min="0" max="200" 
              value={settings.nodePadding}
              onChange={(e) => handleSettingChange('nodePadding', Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Label Font Size ({settings.fontSize}px)</label>
            <input 
              type="range" min="8" max="24" 
              value={settings.fontSize}
              onChange={(e) => handleSettingChange('fontSize', Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Link Value Font Size ({settings.linkFontSize}px)</label>
            <input 
              type="range" min="6" max="20" 
              value={settings.linkFontSize}
              onChange={(e) => handleSettingChange('linkFontSize', Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Alignment</label>
            <select
              value={settings.align}
              onChange={(e) => handleSettingChange('align', e.target.value)}
              className="w-full mt-1 rounded text-sm border-slate-300 border p-1"
            >
              <option value="justify">Justify</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="center">Center</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
             <input 
               type="checkbox" 
               checked={settings.showLabels}
               onChange={(e) => handleSettingChange('showLabels', e.target.checked)}
               className="rounded text-emerald-600 focus:ring-emerald-500"
             />
             <label className="text-sm text-slate-700">Show Labels</label>
          </div>
        </div>

        {/* Annotations */}
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-900 border-b pb-1 flex items-center gap-2">
                <Type size={14} /> Annotations
            </h3>
            <button 
                onClick={onAddText}
                className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 py-2 px-3 rounded-md transition-colors text-xs font-medium"
            >
                <Plus size={14} /> Add Text Label
            </button>
            <p className="text-xs text-slate-400 italic">Double-click any label to edit.</p>
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-900 border-b pb-1">Appearance</h3>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs text-slate-500 block mb-1">Domestic</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={settings.colorDomestic}
                    onChange={(e) => handleSettingChange('colorDomestic', e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono">{settings.colorDomestic}</span>
                </div>
             </div>
             
             <div>
                <label className="text-xs text-slate-500 block mb-1">Trade</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={settings.colorTrade}
                    onChange={(e) => handleSettingChange('colorTrade', e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono">{settings.colorTrade}</span>
                </div>
             </div>

             <div>
                <label className="text-xs text-slate-500 block mb-1">Loss</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={settings.colorLoss}
                    onChange={(e) => handleSettingChange('colorLoss', e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono">{settings.colorLoss}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-200 space-y-3">
         <button 
          onClick={onSaveLayoutClick}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 px-4 rounded-md transition-colors text-sm font-medium"
        >
          <Save size={16} /> Save Layout
        </button>
        
        <div className="flex gap-2">
            <button 
              onClick={onDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 px-2 rounded-md transition-colors text-sm font-medium"
              title="Save as JPG"
            >
              <Download size={16} /> JPG
            </button>
            <button 
              onClick={onDownloadPDF}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded-md transition-colors text-sm font-medium"
              title="Save as PDF (Vector)"
            >
              <FileText size={16} /> PDF
            </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;