import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export const PrescriptionUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addPoints } = useApp();
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSubmit = () => {
        if (!file) return;
        
        // In this version, we simulate the upload for pharmacist review
        addPoints(50);
        alert(`Prescription uploaded successfully. You earned 50 Health Points! Our pharmacist will review it shortly.`);
        navigate('/cart');
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="text-teal-600" />
                Upload Prescription
            </h1>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                {!preview ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-10 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        <Upload size={48} className="mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-600 font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-400 mt-2">JPG, PNG up to 5MB</p>
                    </div>
                ) : (
                    <div className="relative">
                        <img src={preview} alt="Prescription" className="max-h-64 mx-auto rounded-lg shadow-md" />
                        <div className="mt-4 p-4 bg-teal-50 text-teal-700 rounded-xl border border-teal-100 flex items-center gap-2 justify-center">
                            <Check size={20} />
                            <span>Prescription Selected</span>
                        </div>
                        <button
                            onClick={() => { setFile(null); setPreview(null); }}
                            className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md hover:bg-red-50 text-slate-600 hover:text-red-500"
                        >
                            <AlertCircle size={20} />
                        </button>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                />

                {preview && (
                    <button
                        onClick={handleSubmit}
                        className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Upload size={20} /> Submit for Pharmacist Review
                    </button>
                )}
            </div>

            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                     <AlertCircle size={18} className="text-amber-500" />
                     What happens next?
                </h3>
                <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5 text-left">
                    <li>Our certified pharmacist will review your prescription within 15-30 minutes.</li>
                    <li>You will receive a notification once the medicines are added to your order.</li>
                    <li>You can track the progress in your dashboard.</li>
                    <li>Medicines marked strictly for prescription will be verified against this image.</li>
                </ul>
            </div>
        </div>
    );
};
