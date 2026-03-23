import React, { useState } from 'react';
import { Send, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import { addFeedback } from '../services/dbService';

export const FeedbackSection = () => {
    const [rating, setRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === null) {
            setError('Please select a rating to continue');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await addFeedback(rating, comment);
            setIsSubmitted(true);
            setTimeout(() => {
                setIsSubmitted(false);
                setRating(null);
                setComment('');
            }, 5000);
        } catch (err) {
            setError('System encountered an error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const ratings = [
        { value: 1, label: '😠', text: 'Poor' },
        { value: 2, label: '☹️', text: 'Fair' },
        { value: 3, label: '😐', text: 'Good' },
        { value: 4, label: '🙂', text: 'Great' },
        { value: 5, label: '🤩', text: 'Excellent' },
    ];

    if (isSubmitted) {
        return (
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-12 text-center animate-in zoom-in fade-in duration-500 shadow-2xl shadow-teal-900/20">
                <div className="flex justify-center mb-6">
                    <div className="bg-teal-500/20 p-4 rounded-full">
                        <CheckCircle2 className="text-teal-400 w-16 h-16" />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Feedback <span className="text-teal-400">Received</span></h3>
                <p className="text-slate-400 max-w-sm mx-auto font-medium text-sm leading-relaxed uppercase tracking-widest opacity-60">
                    Your insights help us refine the CureConnect ecosystem. Thank you for your contribution.
                </p>
            </div>
        );
    }

    return (
        <section className="bg-slate-900 border border-white/5 rounded-[3.5rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden relative group">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full -mr-48 -mt-48 blur-[120px] group-hover:bg-teal-500/10 transition-all duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-32 -mb-32 blur-[100px]"></div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-teal-400">
                        <MessageSquare size={14} />
                        User Experience
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight uppercase tracking-tighter">
                        Help us <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">improve</span><br/>
                        the future.
                    </h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md opacity-80">
                        We value your perspective. Share your thoughts on how we can make healthcare more accessible for everyone.
                    </p>
                    
                    <div className="mt-12 flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                                    <Star size={14} className="text-amber-400 fill-amber-400" />
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trusted by 2k+ contributors</p>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Select a Rating</label>
                            <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                {ratings.map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => {
                                            console.log(`⭐ Selected rating: ${r.value}`);
                                            setRating(r.value);
                                        }}
                                        className={`group relative flex flex-col items-center transition-all duration-500 hover:scale-125 focus:outline-none ${
                                            rating === null 
                                            ? 'opacity-80 scale-100' 
                                            : rating === r.value 
                                                ? 'opacity-100 scale-125' 
                                                : 'opacity-20 grayscale scale-90'
                                        }`}
                                    >
                                        <span className={`text-5xl transition-all duration-300 drop-shadow-sm ${rating === r.value ? 'drop-shadow-[0_0_20px_rgba(45,212,191,0.8)]' : 'group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'}`}>
                                            {r.label}
                                        </span>
                                        <span className={`absolute -bottom-8 text-[9px] font-black uppercase tracking-widest text-teal-400 transition-all duration-300 ${rating === r.value ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                            {r.text}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {rating === null && !isSubmitting && (
                                <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest mt-4 text-center animate-pulse">
                                    ↑ Please select an emoji to unlock the submit button
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Your Thoughts</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tell us about your experience..."
                                className="w-full h-40 bg-slate-800/40 border border-white/5 rounded-3xl p-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none font-medium leading-relaxed"
                            ></textarea>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest text-center animate-bounce">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || rating === null}
                            className={`w-full h-16 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all duration-500 shadow-xl transform active:scale-[0.98] group ${
                                rating === null 
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
                                : 'bg-white hover:bg-teal-500 text-slate-900 hover:text-white shadow-teal-500/20 hover:shadow-teal-500/40'
                            }`}
                        >
                            {isSubmitting ? (
                                <div className="w-6 h-6 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>{rating === null ? 'Select Rating First' : 'Send Feedback'}</span>
                                    <Send size={18} className={`${rating === null ? 'opacity-20' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500'}`} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};
