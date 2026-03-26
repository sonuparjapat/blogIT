"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";



/* ================= DATA ================= */
const PLANS = [
  {
    id: "monthly" as const,
    label: "Monthly",
    price: "₹1",
    per: "per month",
    annual: "₹2,388 billed monthly",
    badge: null,
    features: [
      "Unlimited premium articles",
      "Ad-free reading experience",
      "Early access to new content",
      "Comment on all posts",
      "Email newsletter",
    ],
  },
  {
    id: "yearly" as const,
    label: "Yearly",
    price: "₹1",
    per: "per year",
    annual: "Just ₹166/month — save 17%",
    badge: "Best value",
    features: [
      "Everything in Monthly",
      "Priority support",
      "Exclusive creator updates",
      "Download articles offline",
      "Invite 2 friends free",
    ],
  },
];

const PERKS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      </svg>
    ),
    title: "10,000+ Articles",
    desc: "Access every premium post ever published",
  },
  {
    icon: <span>🚫</span>,
    title: "Zero Ads",
    desc: "Clean, distraction-free reading always",
  },
  {
    icon: <span>🛡</span>,
    title: "Cancel Anytime",
    desc: "No lock-in. Cancel anytime",
  },
  {
    icon: <span>⚡</span>,
    title: "Instant Access",
    desc: "Unlocked immediately after payment",
  },
];

/* ================= COMPONENT ================= */
export default function SubscribePage() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [selected, setSelected] = useState<"monthly" | "yearly">("yearly");

  const router = useRouter();
const toast=useToast()
  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setLoading(plan);

    try {
      // ✅ FIX 1: correct payload
      const res = await api.post("/subscriptions/create_order", { plan });
console.log(res,"res")
      const data = res?.data;

      // ✅ FIX 2: safe access
      if (!data?.order) throw new Error("Invalid order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY||'',
        amount:1|| data.order.amount,
        currency: "INR",
        order_id: data.order.id,
        name: "BlogHub Premium",
        description:
          plan === "monthly"
            ? "Monthly Subscription"
            : "Yearly Subscription",

        theme: { color: "#6366f1" },

        handler: async function (response: any) {
          try {
          const verifyRes:any =await api.post("/subscriptions/verifyorder",{ ...response, plan })
          console.log(verifyRes,"verify res")
if (verifyRes?.status==200) {
  router.push("/dashboard?subscribed=1")
}else{
toast("Verification Failed")
}


          } catch {
            if (!(window as any).Razorpay) {
  toast("Payment gateway not loaded. Please refresh.");
  return;
}

          }
        },

        modal: {
          ondismiss: () => setLoading(null),
        },
      };
if (!(window as any).Razorpay) {
  toast("Payment gateway not loaded. Please refresh.");
  return;
}
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err:any) {
 if (err?.response?.status === 401) {
  toast("Please login first");
  router.push("/login?redirect=/subscribe");
  return; // ✅ VERY IMPORTANT
}

toast("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="sp">

      {/* JSON-LD (optional trust SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Premium Subscription",
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: "1",
              availability: "https://schema.org/InStock",
            },
          }),
        }}
      />


      {/* ── Background ── */}
      <div className="sp-bg">
        <div className="sp-orb sp-orb--1"/>
        <div className="sp-orb sp-orb--2"/>
        <div className="sp-orb sp-orb--3"/>
        <div className="sp-grid"/>
      </div>

      <div className="sp-container">

        {/* ── Header ── */}
        <div className="sp-header">
          <div className="sp-eyebrow">
            <span className="sp-eyebrow-dot"/>
            Premium membership
          </div>
          <h1 className="sp-h1">
            Unlock Everything.<br/>
            <span className="sp-h1-accent">Read Without Limits.</span>
          </h1>
          <p className="sp-sub">
            Join thousands of readers who get unlimited access to expert articles,
            tutorials and guides — completely ad-free.
          </p>
        </div>

        {/* ── Perks strip ── */}
        <div className="sp-perks">
          {PERKS.map(p => (
            <div key={p.title} className="sp-perk">
              <span className="sp-perk-icon">{p.icon}</span>
              <span className="sp-perk-title">{p.title}</span>
              <span className="sp-perk-desc">{p.desc}</span>
            </div>
          ))}
        </div>

        {/* ── Plan cards ── */}
        <div className="sp-plans">
          {PLANS.map(plan => {
            const isSelected = selected === plan.id;
            const isBusy     = loading === plan.id;
            return (
              <div
                key={plan.id}
                className={`sp-plan ${isSelected ? "sp-plan--selected" : ""} ${plan.badge ? "sp-plan--featured" : ""}`}
                onClick={() => setSelected(plan.id)}
              >
                {plan.badge && (
                  <div className="sp-plan-badge">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    {plan.badge}
                  </div>
                )}

                {/* selected indicator */}
                <div className={`sp-plan-radio ${isSelected ? "sp-plan-radio--on" : ""}`}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>

                <div className="sp-plan-label">{plan.label}</div>
                <div className="sp-plan-price">
                  {plan.price}
                  <span className="sp-plan-per">{plan.per}</span>
                </div>
                <div className="sp-plan-annual">{plan.annual}</div>

                <ul className="sp-plan-features">
                  {plan.features.map(f => (
                    <li key={f} className="sp-plan-feature">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`sp-plan-btn ${isSelected ? "sp-plan-btn--primary" : "sp-plan-btn--ghost"}`}
                  onClick={e => { e.stopPropagation(); handleSubscribe(plan.id); }}
disabled={loading === plan.id}
                >
                  {isBusy ? (
                    <><span className="sp-spin"/>Processing…</>
                  ) : (
                    <>
                      {isSelected ? "Get started" : `Choose ${plan.label}`}
                      {!isBusy && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Trust badges ── */}
        <div className="sp-trust">
          {[
            { icon: "🔒", text: "Secured by Razorpay" },
            { icon: "↩",  text: "Cancel anytime" },
            { icon: "✓",  text: "Instant activation" },
            { icon: "🇮🇳", text: "Made for India" },
          ].map(t => (
            <div key={t.text} className="sp-trust-item">
              <span className="sp-trust-icon">{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="sp-faq">
          <div className="sp-faq-title">Frequently asked</div>
          <div className="sp-faq-grid">
            {[
              { q: "Can I cancel anytime?",       a: "Yes — cancel from your account settings with one click. No questions asked." },
              { q: "What payment methods?",        a: "UPI, cards, net banking, wallets — all major Indian payment methods via Razorpay." },
              { q: "Is my data safe?",             a: "We never store card details. All payments are processed securely by Razorpay." },
              { q: "Can I switch plans?",          a: "Yes, you can upgrade from monthly to yearly at any time from your dashboard." },
            ].map(item => (
              <div key={item.q} className="sp-faq-item">
                <div className="sp-faq-q">{item.q}</div>
                <div className="sp-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #09090e; --s0: #0f0f17; --s1: #141420; --s2: #1a1a28;
          --b0: rgba(255,255,255,0.06); --b1: rgba(255,255,255,0.12);
          --t0: rgba(255,255,255,0.93); --t1: rgba(255,255,255,0.58);
          --t2: rgba(255,255,255,0.30); --t3: rgba(255,255,255,0.12);
          --acc: #6366f1; --acc-l: #a5b4fc;
          --acc-a: rgba(99,102,241,0.14); --acc-b: rgba(99,102,241,0.30);
          --grn: #34d399; --grn-a: rgba(52,211,153,0.12); --grn-b: rgba(52,211,153,0.28);
          --amb: #fbbf24; --amb-a: rgba(251,191,36,0.12);
          --font: 'DM Sans', -apple-system, sans-serif;
          --r: 14px; --tr: 0.18s cubic-bezier(0.4,0,0.2,1);
        }

        .sp {
          font-family: var(--font); color: var(--t0);
          min-height: 100vh; position: relative;
          overflow: hidden;
        }

        /* ── bg ── */
        .sp-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .sp-orb { position: absolute; border-radius: 50%; filter: blur(80px); }
        .sp-orb--1 { width: 600px; height: 600px; top: -200px; left: -150px; background: rgba(99,102,241,0.16); animation: sp-float 16s ease-in-out infinite; }
        .sp-orb--2 { width: 500px; height: 500px; bottom: -180px; right: -120px; background: rgba(52,211,153,0.10); animation: sp-float 20s ease-in-out infinite reverse; }
        .sp-orb--3 { width: 300px; height: 300px; top: 50%; left: 60%; background: rgba(251,191,36,0.06); animation: sp-float 24s ease-in-out infinite 6s; }
        @keyframes sp-float { 0%,100%{transform:translate(0,0)} 33%{transform:translate(20px,-18px)} 66%{transform:translate(-15px,22px)} }
        .sp-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%);
        }

        /* ── container ── */
        .sp-container {
          position: relative; z-index: 1;
          max-width: 960px; margin: 0 auto;
          padding: 72px 24px 100px;
        }

        /* ── header ── */
        .sp-header { text-align: center; margin-bottom: 52px; }
        .sp-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11.5px; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--acc-l);
          margin-bottom: 22px;
        }
        .sp-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--acc-l); box-shadow: 0 0 10px rgba(165,180,252,0.8);
          animation: sp-pulse 2.2s ease-in-out infinite;
        }
        @keyframes sp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.65)} }
        .sp-h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(36px, 6vw, 62px);
          font-weight: 800; letter-spacing: -0.03em;
          line-height: 1.1; color: var(--t0);
          margin-bottom: 18px;
        }
        .sp-h1-accent {
          background: linear-gradient(135deg, #a5b4fc 0%, #34d399 55%, #fbbf24 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200%; animation: sp-grad 5s ease infinite;
        }
        @keyframes sp-grad { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .sp-sub {
          font-size: clamp(15px,2vw,17px); color: var(--t1);
          line-height: 1.75; max-width: 520px; margin: 0 auto;
        }

        /* ── perks ── */
        .sp-perks {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 12px; margin-bottom: 48px;
        }
        .sp-perk {
          display: flex; flex-direction: column; gap: 8px;
          padding: 18px 16px;
          background: var(--s1); border: 1px solid var(--b0);
          border-radius: 14px;
          transition: border-color var(--tr), transform var(--tr);
        }
        .sp-perk:hover { border-color: var(--b1); transform: translateY(-2px); }
        .sp-perk-icon { color: var(--acc-l); }
        .sp-perk-title { font-size: 13.5px; font-weight: 600; color: var(--t0); }
        .sp-perk-desc { font-size: 12px; color: var(--t1); line-height: 1.5; }

        /* ── plans ── */
        .sp-plans {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 18px; margin-bottom: 36px;
        }
        .sp-plan {
          position: relative;
          background: var(--s1); border: 1.5px solid var(--b0);
          border-radius: 20px; padding: 28px;
          cursor: pointer;
          transition: border-color var(--tr), transform var(--tr), box-shadow var(--tr);
          display: flex; flex-direction: column; gap: 14px;
        }
        .sp-plan:hover { border-color: var(--b1); transform: translateY(-2px); }
        .sp-plan--selected {
          border-color: var(--acc) !important;
          box-shadow: 0 0 0 1px var(--acc), 0 16px 40px rgba(99,102,241,0.2);
          background: linear-gradient(160deg, rgba(99,102,241,0.06) 0%, var(--s1) 100%);
        }
        .sp-plan--featured { background: linear-gradient(160deg, rgba(52,211,153,0.05) 0%, var(--s1) 100%); }

        .sp-plan-badge {
          position: absolute; top: -12px; right: 22px;
          display: inline-flex; align-items: center; gap: 5px;
          background: linear-gradient(135deg, var(--grn), #059669);
          color: #042f1e; font-size: 11px; font-weight: 700;
          padding: 4px 12px; border-radius: 20px;
          letter-spacing: 0.03em;
        }

        .sp-plan-radio {
          position: absolute; top: 22px; right: 22px;
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--b1);
          display: flex; align-items: center; justify-content: center;
          transition: all var(--tr);
        }
        .sp-plan-radio--on {
          background: var(--acc); border-color: var(--acc);
          color: #fff; box-shadow: 0 0 0 3px var(--acc-a);
        }

        .sp-plan-label {
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--t2);
        }
        .sp-plan-price {
          display: flex; align-items: baseline; gap: 6px;
          font-family: 'Syne', sans-serif;
          font-size: 38px; font-weight: 800;
          color: var(--t0); letter-spacing: -0.025em;
        }
        .sp-plan-per { font-family: var(--font); font-size: 14px; font-weight: 400; color: var(--t2); }
        .sp-plan-annual { font-size: 12.5px; color: var(--t1); margin-top: -6px; }

        .sp-plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin: 4px 0; }
        .sp-plan-feature {
          display: flex; align-items: center; gap: 9px;
          font-size: 13.5px; color: var(--t1);
        }
        .sp-plan-feature svg { color: var(--grn); flex-shrink: 0; }

        .sp-plan-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          width: 100%; padding: 13px 20px; border-radius: 12px;
          font-family: var(--font); font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; margin-top: auto;
          transition: background var(--tr), transform var(--tr), box-shadow var(--tr), opacity var(--tr);
        }
        .sp-plan-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; }
        .sp-plan-btn--primary {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff; box-shadow: 0 4px 20px rgba(99,102,241,0.4);
        }
        .sp-plan-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(99,102,241,0.5); }
        .sp-plan-btn--ghost {
          background: rgba(255,255,255,0.05);
          color: var(--t1); border: 1px solid var(--b0);
        }
        .sp-plan-btn--ghost:hover:not(:disabled) { background: rgba(255,255,255,0.09); color: var(--t0); border-color: var(--b1); }

        /* ── spinner ── */
        .sp-spin {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: currentColor; border-radius: 50%;
          animation: sp-spin .6s linear infinite; flex-shrink: 0;
        }
        @keyframes sp-spin { to { transform: rotate(360deg); } }

        /* ── trust badges ── */
        .sp-trust {
          display: flex; align-items: center; justify-content: center;
          gap: 28px; flex-wrap: wrap;
          padding: 20px 0 36px;
          border-top: 1px solid var(--b0);
          border-bottom: 1px solid var(--b0);
          margin-bottom: 52px;
        }
        .sp-trust-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px; color: var(--t2); font-weight: 500;
        }
        .sp-trust-icon { font-size: 16px; }

        /* ── FAQ ── */
        .sp-faq { }
        .sp-faq-title {
          font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--t2);
          margin-bottom: 20px;
        }
        .sp-faq-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .sp-faq-item {
          padding: 20px 22px;
          background: var(--s1); border: 1px solid var(--b0);
          border-radius: 14px;
        }
        .sp-faq-q { font-size: 14px; font-weight: 600; color: var(--t0); margin-bottom: 8px; }
        .sp-faq-a { font-size: 13px; color: var(--t1); line-height: 1.65; }

        /* ── responsive ── */
        @media (max-width: 768px) {
          .sp-perks { grid-template-columns: repeat(2, 1fr); }
          .sp-plans { grid-template-columns: 1fr; }
          .sp-faq-grid { grid-template-columns: 1fr; }
          .sp-trust { gap: 16px; }
        }
        @media (max-width: 480px) {
          .sp-container { padding: 48px 16px 80px; }
          .sp-perks { grid-template-columns: 1fr 1fr; }
          .sp-plan-price { font-size: 30px; }
          .sp-trust { flex-direction: column; align-items: flex-start; padding-left: 16px; }
        }
      `}</style>
    </div>
  );
}