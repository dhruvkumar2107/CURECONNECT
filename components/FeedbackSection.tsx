import React, { useState } from 'react';
import { Send, Star, CheckCircle2 } from 'lucide-react';
import { addFeedback } from '../services/firebase';

export const FeedbackSection = () => {
    const [rating, setRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === null) {
            setError('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await addFeedback(rating, comment);
            setIsSubmitted(true);
            // Reset form after 3 seconds
            setTimeout(() => {
                setIsSubmitted(false);
                setRating(null);
                setComment('');
            }, 3000);
        } catch (err) {
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const ratings = [
        { value: 1, label: '😠' },
        { value: 2, label: '☹️' },
        { value: 3, label: '😐' },
        { value: 4, label: '🙂' },
        { value: 5, label: '🤩' },
    ];

    if (isSubmitted) {
        return (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center mb-4">
                    <CheckCircle2 className="text-teal-400 w-16 h-16" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-teal-100">Your feedback helps us make CureConnect better.</p>
            </div>
        );
    }

    return (
        <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-teal-500/20 transition-all duration-500"></div>

            <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">How's your experience?</h2>
                <p className="text-slate-400 mb-8">We value your thoughts on how we can improve CureConnect.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-4">Select a Rating</label>
                        <div className="flex justify-between max-w-sm">
                            {ratings.map((r) => (
                                <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setRating(r.value)}
                                    className={`text-4xl transition-all duration-200 hover:scale-125 focus:outline-none ${rating === r.value ? 'filter-none drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                                        }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Anything else you'd like to share?</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell us what you liked or how we can improve..."
                            className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all resize-none"
                        ></textarea>
                    </div>

                    {error && <p className="text-rose-400 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting || rating === null}
                        className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Send size={18} />
                                Submit Feedback
                            </>
                        )}
                    </button>
                </form>
            </div>
        </section>
    );
};
