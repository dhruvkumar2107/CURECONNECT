import React, { useState } from 'react';
import { Send, CheckCircle2, MessageSquare, Star, TrendingUp } from 'lucide-react';
import { addFeedback } from '../services/dbService';
import { analytics } from '../services/posthog';

const RATINGS = [
  { value: 1, label: '😠', text: 'Poor' },
  { value: 2, label: '☹️', text: 'Fair' },
  { value: 3, label: '😐', text: 'Good' },
  { value: 4, label: '🙂', text: 'Great' },
  { value: 5, label: '🤩', text: 'Excellent' },
];

export const FeedbackSection = () => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) { setError('Please select a rating to continue'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      await addFeedback(rating, comment);
      analytics.feedbackSubmitted(rating, comment.trim().length > 0);
      setIsSubmitted(true);
      setTimeout(() => { setIsSubmitted(false); setRating(null); setComment(''); }, 6000);
    } catch {
      setError('System encountered an error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-3xl p-12 text-center"
        style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)' }}>
          <CheckCircle2 className="text-teal-400" size={32} />
        </div>
        <h3 className="text-2xl font-black text-white mb-2">Feedback Received!</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
          Thank you — your insights help us improve healthcare access for everyone.
        </p>
      </div>
    );
  }

  return (
    <section className="relative rounded-3xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-5%] w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 grid lg:grid-cols-2 gap-0">
        {/* Left — Copy */}
        <div className="p-10 lg:p-12 flex flex-col justify-center"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-6 self-start"
            style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', color: '#2dd4bf' }}>
            <MessageSquare size={12} /> User Experience
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
            Help us <span className="text-gradient-teal">improve</span> the future.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            We value your perspective. Share your experience to help us make healthcare more accessible for everyone.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {['A', 'B', 'C'].map((l, i) => (
                <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white"
                  style={{ background: `hsl(${170 + i * 30}, 60%, 35%)`, border: '2px solid rgba(5,12,26,1)', zIndex: 3 - i }}>
                  {l}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-xs text-slate-500 font-medium">Trusted by 2,000+ users</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[{ label: 'Avg Rating', value: '4.8★' }, { label: 'Reviews', value: '2,000+' }].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-lg font-black text-teal-400">{s.value}</p>
                <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div className="p-10 lg:p-12">
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Rating */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">
                How was your experience?
              </label>
              <div className="flex justify-between items-center p-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {RATINGS.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => { setRating(r.value); }}
                    className="flex flex-col items-center gap-2 transition-all duration-300 focus:outline-none group relative"
                    style={{
                      transform: rating === r.value ? 'scale(1.2)' : rating !== null ? 'scale(0.85)' : 'scale(1)',
                      opacity: rating !== null && rating !== r.value ? 0.35 : 1,
                      filter: rating !== null && rating !== r.value ? 'grayscale(0.8)' : 'none',
                    }}>
                    <span className="text-4xl leading-none" style={{
                      filter: rating === r.value ? 'drop-shadow(0 0 12px rgba(13,148,136,0.7))' : 'none',
                      transition: 'filter 0.3s ease',
                    }}>
                      {r.label}
                    </span>
                    {rating === r.value && (
                      <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{r.text}</span>
                    )}
                  </button>
                ))}
              </div>
              {rating === null && (
                <p className="text-[11px] text-amber-500/70 font-medium mt-2 text-center">
                  ↑ Select an emoji to continue
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Your thoughts (optional)
              </label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Tell us what you loved or what we can improve..."
                rows={4}
                className="w-full rounded-xl p-4 text-sm text-white placeholder-slate-600 resize-none outline-none transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(13,148,136,0.4)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.08)';
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }} />
            </div>

            {error && (
              <div className="p-3 rounded-xl text-xs font-bold text-rose-400 text-center"
                style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting || rating === null}
              className="w-full h-14 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98]"
              style={{
                background: rating === null
                  ? 'rgba(255,255,255,0.04)'
                  : 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: rating === null ? '#475569' : 'white',
                cursor: rating === null ? 'not-allowed' : 'pointer',
                boxShadow: rating !== null ? '0 0 25px rgba(13,148,136,0.25)' : 'none',
              }}>
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><span>{rating === null ? 'Select a Rating First' : 'Send Feedback'}</span>
                  {rating !== null && <Send size={16} />}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
