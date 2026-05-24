import React, { useState } from 'react';
import { Send, CheckCircle2, MessageSquare, Star, Sparkles } from 'lucide-react';
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
      <div
        className="rounded-3xl p-14 text-center"
        style={{ background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)' }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.28)', boxShadow: '0 0 40px rgba(13,148,136,0.15)' }}
        >
          <CheckCircle2 className="text-teal-400" size={36} />
        </div>
        <h3 className="text-2xl font-black text-white mb-3 font-jakarta">Feedback Received!</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
          Thank you — your insights help us improve healthcare access for everyone.
        </p>
      </div>
    );
  }

  return (
    <section
      className="relative rounded-3xl overflow-hidden"
      style={{ background: 'rgba(8,15,34,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.07) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-20%] left-[-5%] w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="relative z-10 grid lg:grid-cols-2 gap-0">
        {/* Left — Copy */}
        <div
          className="p-10 lg:p-12 flex flex-col justify-center"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="section-label mb-6 self-start">
            <MessageSquare size={11} /> User Experience
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4 font-jakarta">
            Help us <span className="text-gradient-teal">improve</span> the future.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-10">
            We value your perspective. Share your experience to help us make healthcare more accessible for everyone.
          </p>

          {/* Avatars + trust */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {['A', 'B', 'C'].map((l, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white"
                  style={{
                    background: `hsl(${170 + i * 35}, 55%, 32%)`,
                    border: '2px solid rgba(8,15,34,1)',
                    zIndex: 3 - i,
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-0.5 mb-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-xs text-slate-500 font-medium">Trusted by 2,000+ users</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[{ label: 'Avg Rating', value: '4.8★' }, { label: 'Reviews', value: '2,000+' }].map(s => (
              <div
                key={s.label}
                className="p-4 rounded-2xl text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.055)' }}
              >
                <p className="text-xl font-black text-teal-400">{s.value}</p>
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
              <div
                className="flex justify-between items-center p-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(r.value)}
                    className="flex flex-col items-center gap-2 transition-all duration-300 focus:outline-none"
                    style={{
                      transform: rating === r.value ? 'scale(1.25)' : rating !== null ? 'scale(0.82)' : 'scale(1)',
                      opacity:   rating !== null && rating !== r.value ? 0.3 : 1,
                      filter:    rating !== null && rating !== r.value ? 'grayscale(0.9)' : 'none',
                    }}
                  >
                    <span
                      className="text-4xl leading-none"
                      style={{
                        filter: rating === r.value ? 'drop-shadow(0 0 14px rgba(13,148,136,0.8))' : 'none',
                        transition: 'filter 0.3s ease',
                      }}
                    >
                      {r.label}
                    </span>
                    {rating === r.value && (
                      <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{r.text}</span>
                    )}
                  </button>
                ))}
              </div>
              {rating === null && (
                <p className="text-[11px] text-amber-500/60 font-medium mt-2 text-center">
                  ↑ Select an emoji to continue
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                Your thoughts (optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Tell us what you loved or what we can improve..."
                rows={4}
                className="w-full rounded-xl p-4 text-sm text-white placeholder-slate-600 resize-none outline-none transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(13,148,136,0.45)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.08)';
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div
                className="p-3 rounded-xl text-xs font-bold text-rose-400 text-center"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.18)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || rating === null}
              className="w-full h-14 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98]"
              style={{
                background:  rating === null ? 'rgba(255,255,255,0.035)' : 'linear-gradient(135deg, #0d9488, #0f766e)',
                color:       rating === null ? '#4a5878' : 'white',
                cursor:      rating === null ? 'not-allowed' : 'pointer',
                boxShadow:   rating !== null ? '0 0 30px rgba(13,148,136,0.28)' : 'none',
              }}
              onMouseEnter={e => { if (rating !== null) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(13,148,136,0.45)'; }}
              onMouseLeave={e => { if (rating !== null) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(13,148,136,0.28)'; }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{rating === null ? 'Select a Rating First' : 'Send Feedback'}</span>
                  {rating !== null && <Send size={15} />}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
