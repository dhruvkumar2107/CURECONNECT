import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Check, X, ArrowRight, Sparkles, Clock, Bell, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { analytics } from '../services/posthog';

const STEPS = [
  { icon: <Upload size={16} />, title: 'Upload', desc: 'Take a photo or upload your prescription image' },
  { icon: <ShieldCheck size={16} />, title: 'Verify', desc: 'Our pharmacist reviews within 15–30 minutes' },
  { icon: <Bell size={16} />, title: 'Notify', desc: 'Medicines automatically added to your order' },
  { icon: <Check size={16} />, title: 'Collect', desc: 'Pick up your verified medicines at the pharmacy' },
];

export const PrescriptionUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPoints } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    analytics.page('Prescription Upload');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (!file) return;
    analytics.prescriptionUploaded(file.type, file.size);
    addPoints(50);
    navigate('/cart');
    // Show toast via URL or state in production
  };

  return (
    <div className="max-w-2xl mx-auto py-8 page-enter">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.25)' }}>
            <FileText size={20} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Upload Prescription</h1>
            <p className="text-slate-500 text-sm">Earn 50 Health Points on every upload</p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="rounded-2xl overflow-hidden mb-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="p-6">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center py-14 rounded-xl cursor-pointer transition-all duration-300"
              style={{
                border: `2px dashed ${isDragging ? 'rgba(13,148,136,0.5)' : 'rgba(255,255,255,0.1)'}`,
                background: isDragging ? 'rgba(13,148,136,0.05)' : 'transparent',
              }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all"
                style={{ background: isDragging ? 'rgba(13,148,136,0.2)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Upload size={28} className={isDragging ? 'text-teal-400' : 'text-slate-600'} />
              </div>
              <p className="font-bold text-white text-base mb-1">
                {isDragging ? 'Drop your file here' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-slate-500 text-sm">JPG, PNG, PDF up to 5MB</p>
              <div className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-teal-400 transition-all"
                style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
                Browse Files
              </div>
            </div>
          ) : (
            <div className="relative">
              <img src={preview} alt="Prescription preview" className="max-h-72 mx-auto rounded-xl object-contain" />
              <button onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white transition-all"
                style={{ background: 'rgba(239,68,68,0.8)' }}>
                <X size={16} />
              </button>
              <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl text-sm text-teal-300 font-medium"
                style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
                <Check size={16} /> {file?.name}
              </div>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
        </div>

        {preview && (
          <div className="px-6 pb-6">
            <button onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-white text-sm uppercase tracking-wider transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 0 30px rgba(13,148,136,0.3)' }}>
              <Upload size={18} /> Submit for Pharmacist Review
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-black"
                style={{ background: 'rgba(255,255,255,0.15)' }}>+50 pts</span>
            </button>
          </div>
        )}
      </div>

      {/* Process Steps */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
          <Sparkles size={16} className="text-teal-500" /> What happens next?
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.2)' }}>
                <span className="text-teal-400">{step.icon}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
