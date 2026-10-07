import React, { useState } from 'react';
import {
  RotateCw, RotateCcw, Crop, Sun, Sliders, Trash2, Check, X,
  Maximize2, ArrowLeft, ArrowRight, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import { Button } from './Button';
import { GlassPanel } from './GlassPanel';

export interface DocEditState {
  rotation: number; // 0, 90, 180, 270
  cropMode: 'none' | 'tight' | 'medium' | 'fit';
  filterMode: 'none' | 'scan_bw' | 'high_contrast';
  brightness: number; // 80 - 120
  activePage: number;
  deletedPages: number[];
}

interface DocumentEditorProps {
  fileName: string;
  totalPages: number;
  previewUrl?: string;
  fileType?: string;
  onSave: (editedState: DocEditState) => void;
  onClose: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  fileName,
  totalPages,
  previewUrl,
  fileType = 'pdf',
  onSave,
  onClose,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [cropMode, setCropMode] = useState<'none' | 'tight' | 'medium' | 'fit'>('none');
  const [filterMode, setFilterMode] = useState<'none' | 'scan_bw' | 'high_contrast'>('none');
  const [brightness, setBrightness] = useState<number>(100);
  const [activePage, setActivePage] = useState<number>(1);
  const [deletedPages, setDeletedPages] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'rotate' | 'crop' | 'filter' | 'pages'>('rotate');

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const togglePageDeletion = (pageNum: number) => {
    if (deletedPages.includes(pageNum)) {
      setDeletedPages(deletedPages.filter((p) => p !== pageNum));
    } else {
      if (totalPages - deletedPages.length <= 1) {
        alert("At least one page must remain in the document.");
        return;
      }
      setDeletedPages([...deletedPages, pageNum]);
    }
  };

  const handleApply = () => {
    onSave({
      rotation,
      cropMode,
      filterMode,
      brightness,
      activePage,
      deletedPages,
    });
  };

  // Compute CSS filter style for dynamic preview
  const getPreviewFilterStyle = () => {
    let filters = `brightness(${brightness}%)`;
    if (filterMode === 'scan_bw') {
      filters += ' grayscale(100%) contrast(150%)';
    } else if (filterMode === 'high_contrast') {
      filters += ' contrast(180%)';
    }
    return filters;
  };

  // Compute CSS crop/margin padding style
  const getCropStyle = () => {
    switch (cropMode) {
      case 'tight':
        return 'scale-105 overflow-hidden';
      case 'medium':
        return 'scale-110 overflow-hidden';
      case 'fit':
        return 'object-contain';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 glass-1 backdrop-blur-2xl flex items-center justify-center p-4 bg-slate-950/80 font-sans">
      <div className="max-w-5xl w-full h-[90vh] bg-white rounded-control shadow-2xl border border-ink/20 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between bg-bgBase">
          <div className="flex items-center gap-3 truncate">
            <Sliders className="w-6 h-6 text-signalCyan shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-ink truncate">{fileName}</h2>
              <p className="text-xs text-ink2 font-medium">Document Tools · Rotate, Crop, Filter & Edit Pages</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleApply}>
              <Check className="w-4 h-4" /> Save & Apply Edits
            </Button>
          </div>
        </div>

        {/* Main Editor Body */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          
          {/* Left / Center Preview Stage */}
          <div className="col-span-8 bg-ink/5 p-8 flex flex-col items-center justify-between relative overflow-hidden">
            
            {/* Page Navigation Indicator */}
            <div className="w-full flex justify-between items-center z-10">
              <span className="text-xs font-bold text-ink2 bg-white/80 px-3 py-1.5 rounded-pill border border-ink/10">
                Page {activePage} of {totalPages} {deletedPages.includes(activePage) ? '(Removed)' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={activePage <= 1}
                  onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                  className="p-2 glass-2 rounded-control disabled:opacity-30 text-ink border border-ink/10"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={activePage >= totalPages}
                  onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 glass-2 rounded-control disabled:opacity-30 text-ink border border-ink/10"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Document Preview Box */}
            <div className="my-auto relative flex items-center justify-center max-w-full max-h-[60vh] p-4">
              <div
                className={`transition-all duration-300 shadow-2xl rounded bg-white overflow-hidden border border-ink/15 relative ${
                  deletedPages.includes(activePage) ? 'opacity-30 grayscale' : ''
                }`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  filter: getPreviewFilterStyle(),
                }}
              >
                {previewUrl ? (
                  previewUrl.startsWith('data:image/') || fileType.includes('image') ? (
                    <img
                      src={previewUrl}
                      alt={fileName}
                      className={`max-h-[50vh] object-contain ${getCropStyle()}`}
                    />
                  ) : (
                    <object
                      data={previewUrl}
                      type="application/pdf"
                      className="w-[450px] h-[50vh]"
                    >
                      <iframe
                        src={previewUrl}
                        title={fileName}
                        className="w-[450px] h-[50vh] border-0"
                      />
                    </object>
                  )
                ) : (
                  <div className="w-[380px] h-[50vh] p-8 flex flex-col justify-between text-ink bg-white">
                    <div className="space-y-3">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-xs font-mono font-bold">{fileName}</span>
                        <span className="text-[10px] bg-ink/10 px-2 py-0.5 rounded font-bold">PAGE {activePage}</span>
                      </div>
                      <div className="w-3/4 h-2.5 bg-ink/20 rounded-pill" />
                      <div className="w-full h-2 bg-ink/10 rounded-pill" />
                      <div className="w-5/6 h-2 bg-ink/10 rounded-pill" />
                      <div className="w-4/5 h-2 bg-ink/10 rounded-pill" />
                    </div>
                    <div className="my-auto text-center py-6">
                      <Sparkles className="w-16 h-16 text-signalCyan mx-auto opacity-70" />
                      <p className="font-bold text-xs text-ink2 mt-2">Live Page Preview</p>
                    </div>
                    <div className="space-y-1.5 border-t pt-2">
                      <div className="w-full h-2 bg-ink/10 rounded-pill" />
                      <div className="w-2/3 h-2 bg-ink/10 rounded-pill" />
                    </div>
                  </div>
                )}

                {deletedPages.includes(activePage) && (
                  <div className="absolute inset-0 bg-red-950/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-lg">
                    Page Removed
                  </div>
                )}
              </div>
            </div>

            {/* Rotation angle badge */}
            {rotation !== 0 && (
              <div className="absolute bottom-4 left-6 bg-ink text-white text-xs font-mono px-3 py-1 rounded-pill">
                Rotated {rotation}°
              </div>
            )}
          </div>

          {/* Right Editing Control Sidebar */}
          <div className="col-span-4 border-l border-ink/10 bg-white p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              
              {/* Tool Selector Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-ink/5 rounded-control text-xs font-bold">
                <button
                  onClick={() => setActiveTab('rotate')}
                  className={`py-2 rounded-sm transition ${
                    activeTab === 'rotate' ? 'bg-white text-ink shadow-xs' : 'text-ink2 hover:text-ink'
                  }`}
                >
                  Rotate
                </button>
                <button
                  onClick={() => setActiveTab('crop')}
                  className={`py-2 rounded-sm transition ${
                    activeTab === 'crop' ? 'bg-white text-ink shadow-xs' : 'text-ink2 hover:text-ink'
                  }`}
                >
                  Crop
                </button>
                <button
                  onClick={() => setActiveTab('filter')}
                  className={`py-2 rounded-sm transition ${
                    activeTab === 'filter' ? 'bg-white text-ink shadow-xs' : 'text-ink2 hover:text-ink'
                  }`}
                >
                  Filter
                </button>
                <button
                  onClick={() => setActiveTab('pages')}
                  className={`py-2 rounded-sm transition ${
                    activeTab === 'pages' ? 'bg-white text-ink shadow-xs' : 'text-ink2 hover:text-ink'
                  }`}
                >
                  Pages
                </button>
              </div>

              {/* TAB 1: ROTATE */}
              {activeTab === 'rotate' && (
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink2 block">Rotate Page</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleRotateLeft}
                      className="p-4 border border-ink/15 rounded-control hover:bg-ink/5 transition text-ink font-bold flex flex-col items-center gap-2 text-xs"
                    >
                      <RotateCcw className="w-6 h-6 text-signalCyan" /> Rotate 90° Left
                    </button>
                    <button
                      onClick={handleRotateRight}
                      className="p-4 border border-ink/15 rounded-control hover:bg-ink/5 transition text-ink font-bold flex flex-col items-center gap-2 text-xs"
                    >
                      <RotateCw className="w-6 h-6 text-signalCyan" /> Rotate 90° Right
                    </button>
                  </div>

                  <button
                    onClick={() => setRotation(0)}
                    className="w-full text-xs font-semibold text-ink2 hover:text-ink text-center pt-2"
                  >
                    Reset Rotation (0°)
                  </button>
                </div>
              )}

              {/* TAB 2: CROP / MARGINS */}
              {activeTab === 'crop' && (
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink2 block">Page Framing & Margins</span>
                  <div className="space-y-2">
                    {[
                      { id: 'none', label: 'Original Full Page', desc: 'No margins cropped' },
                      { id: 'tight', label: 'Tight Crop (5%)', desc: 'Trim white outer borders' },
                      { id: 'medium', label: 'Medium Crop (10%)', desc: 'Focus on main text area' },
                      { id: 'fit', label: 'Fit to Printable Area', desc: 'Auto scale to printable bounds' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCropMode(opt.id as any)}
                        className={`w-full p-3 rounded-control border text-left transition flex items-center justify-between ${
                          cropMode === opt.id
                            ? 'border-ink bg-signalCyan/10 text-ink'
                            : 'border-ink/10 hover:border-ink/25 text-ink2'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-ink">{opt.label}</div>
                          <div className="text-[10px] text-ink2">{opt.desc}</div>
                        </div>
                        {cropMode === opt.id && <Check className="w-4 h-4 text-signalCyan" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: FILTERS & BRIGHTNESS */}
              {activeTab === 'filter' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink2 block">Enhance Presets</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'none', label: 'Normal' },
                        { id: 'scan_bw', label: 'Doc Scan' },
                        { id: 'high_contrast', label: 'High Contrast' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFilterMode(f.id as any)}
                          className={`py-2 px-3 rounded-control text-xs font-bold border transition ${
                            filterMode === f.id
                              ? 'bg-ink text-white border-ink'
                              : 'border-ink/15 text-ink hover:bg-ink/5'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-ink/10">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <Sun className="w-4 h-4 text-warning" /> Brightness
                      </span>
                      <span className="text-xs font-mono font-bold text-ink">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={140}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-signalCyan"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: PAGE MANAGEMENT */}
              {activeTab === 'pages' && (
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink2 block">Manage Document Pages</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isDeleted = deletedPages.includes(pageNum);
                      return (
                        <div
                          key={pageNum}
                          onClick={() => setActivePage(pageNum)}
                          className={`p-3 rounded-control border flex items-center justify-between cursor-pointer transition ${
                            activePage === pageNum
                              ? 'border-ink bg-white shadow-xs'
                              : 'border-ink/10 bg-bgBase/50 hover:bg-white'
                          } ${isDeleted ? 'opacity-40 line-through' : ''}`}
                        >
                          <span className="text-xs font-bold text-ink">Page {pageNum}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePageDeletion(pageNum);
                            }}
                            className={`p-1.5 rounded transition ${
                              isDeleted ? 'text-success hover:bg-success/10' : 'text-error hover:bg-error/10'
                            }`}
                          >
                            {isDeleted ? <RefreshCw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-ink/10 space-y-2">
              <Button variant="primary" size="lg" className="w-full" onClick={handleApply}>
                <Check className="w-5 h-5" /> Apply & Update Document
              </Button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
