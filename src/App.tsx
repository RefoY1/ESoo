/* =====================================================================
   ملف المنطق والمكونات الكامل (ما يعادل script.js)
   نسخة السرعة العالية — مُحسَّنة للجوال (تعمل بسلاسة على آيفون)
   التحسينات:
   - كل الجزيئات تُرسم مرة واحدة في Sprites جاهزة بدل shadowBlur الحي
   - دقة الكانفس 1× على الجوال + ٣٠ إطاراً بالثانية
   - الخلفية تتوقف تماماً خلف شاشة القفل المغلقة
   جميع النصوص والتواريخ والصور تُعدَّل من ملف: src/loveConfig.ts
   ===================================================================== */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Lock, Heart, HeartPulse, Sparkles, Music, ChevronDown, ChevronLeft, ChevronRight,
  X, Quote, CalendarHeart, Images, Gift, Footprints, Feather, ScrollText,
  Hourglass, MessageCircle, Coffee, Laugh, Infinity as InfinityIcon,
} from "lucide-react";
import { love, toArabicDigits } from "./loveConfig";
import "./romance.css";

/* هل الجهاز باللمس؟ (لتخفيف الحمل على الجوال) */
const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/* =====================================================================
   ١) مشغل الموسيقى — بيانو داخلي مُولَّد برمجياً أو ملف MP3 خاص
   ===================================================================== */
function useRomanticAudio(musicUrl: string) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const seqRef = useRef({ nextTime: 0, chord: 0, step: 0 });

  // توزيعة لحنية هادئة: Dm – Bbsus – F – C (بالمفاتيح الموسيقية MIDI)
  const CHORDS = useMemo(
    () => [
      [50, 53, 57, 62],
      [46, 50, 53, 58],
      [45, 48, 53, 57],
      [43, 48, 52, 55],
    ],
    []
  );
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  const STEP = 0.46;

  const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

  const buildEngine = () => {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    master.connect(comp);
    comp.connect(ctx.destination);

    // صدى ناعم يضيف حلماً للنغمات
    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.34;
    const wet = ctx.createGain(); wet.gain.value = 0.24;
    master.connect(delay); delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(comp);

    ctxRef.current = ctx; masterRef.current = master; delayRef.current = delay;
  };

  // نغمة بيانو واحدة: موجة جيبية + هارمونيك ناعم مع تلاشٍ أسّي
  const pluck = (t: number, m: number, vol: number, dur = 1.5) => {
    const ctx = ctxRef.current!, master = masterRef.current!;
    const f = midi(m);
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = f;
    const osc2 = ctx.createOscillator(); osc2.type = "triangle"; osc2.frequency.value = f * 2;
    const g = ctx.createGain(); const g2 = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200; lp.Q.value = 0.4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g2.gain.value = vol * 0.22;
    osc.connect(g); osc2.connect(g2); g2.connect(g);
    g.connect(lp); lp.connect(master);
    osc.start(t); osc2.start(t);
    osc.stop(t + dur + 0.1); osc2.stop(t + dur + 0.1);
  };

  const schedule = () => {
    const ctx = ctxRef.current; if (!ctx) return;
    const s = seqRef.current;
    while (s.nextTime < ctx.currentTime + 1.1) {
      const chord = CHORDS[s.chord % 4];
      const st = s.step % 8;
      const t = s.nextTime;
      if (st === 0) pluck(t, chord[0] - 12, 0.34, 2.4);
      pluck(t, chord[ARP[st]] + (st === 3 ? 12 : 0), 0.16, 1.4);
      if (st === 4) pluck(t, chord[3] + 12, 0.13, 2.0);
      if (st === 6 && Math.random() > 0.5) pluck(t, chord[2] + 19, 0.07, 2.2);
      s.nextTime += STEP;
      s.step++;
      if (s.step % 8 === 0) s.chord++;
    }
  };

  const unlock = useCallback(() => {
    if (musicUrl) return;
    if (!ctxRef.current) buildEngine();
    ctxRef.current?.resume().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl]);

  const start = useCallback(() => {
    if (musicUrl) {
      if (!audioElRef.current) {
        const el = new Audio(musicUrl);
        el.loop = true; el.volume = 0.6;
        audioElRef.current = el;
      }
      audioElRef.current.play().catch(() => {});
      setPlaying(true);
      return;
    }
    if (!ctxRef.current) buildEngine();
    const ctx = ctxRef.current!, master = masterRef.current!;
    ctx.resume().catch(() => {});
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 3.2);
    seqRef.current.nextTime = ctx.currentTime + 0.15;
    if (!timerRef.current) timerRef.current = window.setInterval(schedule, 220);
    setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl]);

  const stop = useCallback(() => {
    if (musicUrl) { audioElRef.current?.pause(); setPlaying(false); return; }
    const ctx = ctxRef.current, master = masterRef.current;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPlaying(false);
  }, [musicUrl]);

  const toggle = useCallback(() => (playing ? stop() : start()), [playing, start, stop]);

  return { playing, toggle, unlock, start };
}

/* =====================================================================
   ٢) رسم شكل القلب على Canvas (يُستخدم مرة واحدة لصنع الـ Sprites)
   ===================================================================== */
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const top = h * 0.3;
  ctx.beginPath();
  ctx.moveTo(x, y + top);
  ctx.bezierCurveTo(x, y, x - w / 2, y, x - w / 2, y + top);
  ctx.bezierCurveTo(x - w / 2, y + (h + top) / 2, x, y + (h + top) / 1.4, x, y + h);
  ctx.bezierCurveTo(x, y + (h + top) / 1.4, x + w / 2, y + (h + top) / 2, x + w / 2, y + top);
  ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + top);
  ctx.closePath();
  ctx.fill();
}

/* =====================================================================
   ٣) الخلفية التفاعلية — محرك Sprites فائق السرعة
   التوهج يُرسم مرة واحدة في صور جاهزة ثم نعيد استخدامها آلاف المرات
   ===================================================================== */
const HEART_COLORS = ["#e1789c", "#e8c07a", "#a41e4e", "#f3b7c7", "#c72c5c"];

function RomanticCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // خلف البوابة المغلقة الخلفية غير مرئية إطلاقاً — لا نستهلك أي طاقة
    if (!active) return;

    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = isCoarse ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    const FRAME_MS = isCoarse ? 33 : 0; // ٣٠ إطاراً/ثانية على الجوال

    /* --- صناعة الـ Sprites (مرة واحدة فقط) --- */
    const mkSprite = (cssSize: number, draw: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = c.height = Math.ceil(cssSize * dpr);
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);
      draw(g);
      return c;
    };
    const HEART_S = 84; // قلب بتوهج داخل صورة 84×84
    const heartSprites = HEART_COLORS.map((color) =>
      mkSprite(HEART_S, (g) => {
        g.fillStyle = color;
        g.shadowColor = color; g.shadowBlur = 18;
        drawHeart(g, HEART_S / 2, HEART_S / 2 - 15, 34, 30);
        g.shadowBlur = 0;
        drawHeart(g, HEART_S / 2, HEART_S / 2 - 15, 34, 30);
      })
    );
    const STAR_S = 26;
    const starSprite = mkSprite(STAR_S, (g) => {
      g.fillStyle = "#f6e3c5";
      g.shadowColor = "rgba(232,192,122,0.95)"; g.shadowBlur = 9;
      g.beginPath(); g.arc(STAR_S / 2, STAR_S / 2, 2, 0, Math.PI * 2); g.fill();
    });
    const GLOW_S = 320;
    const glowSprite = mkSprite(GLOW_S, (g) => {
      const gr = g.createRadialGradient(GLOW_S / 2, GLOW_S / 2, 0, GLOW_S / 2, GLOW_S / 2, GLOW_S / 2);
      gr.addColorStop(0, "rgba(225,120,156,0.16)");
      gr.addColorStop(0.5, "rgba(232,192,122,0.09)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, GLOW_S, GLOW_S);
    });

    let w = 0, h = 0, raf = 0, last = 0;
    const mouse = { x: innerWidth / 2, y: innerHeight * 0.35, gx: innerWidth / 2, gy: innerHeight * 0.35 };

    type H = { bx: number; y: number; s: number; v: number; sway: number; sp: number; ph: number; rot: number; rv: number; a: number; spr: HTMLCanvasElement };
    type S = { x: number; y: number; r: number; ph: number; sp: number };
    type B = { x: number; y: number; vx: number; vy: number; s: number; life: number; spr: HTMLCanvasElement; rot: number; rv: number };
    let hearts: H[] = [], stars: S[] = [], bursts: B[] = [];

    const seed = () => {
      hearts = [];
      stars = [];
      const hc = isCoarse ? 16 : 32;   // قلوب أقل على الجوال
      const sc = isCoarse ? 40 : 70;
      for (let i = 0; i < hc; i++)
        hearts.push({
          bx: Math.random() * w, y: Math.random() * h,
          s: 7 + Math.random() * 13, v: 0.18 + Math.random() * 0.45,
          sway: 20 + Math.random() * 45, sp: 0.3 + Math.random() * 0.7, ph: Math.random() * Math.PI * 2,
          rot: (Math.random() - 0.5) * 0.7, rv: (Math.random() - 0.5) * 0.004,
          a: 0.1 + Math.random() * 0.28,
          spr: heartSprites[(Math.random() * heartSprites.length) | 0],
        });
      for (let i = 0; i < sc; i++)
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: 0.5 + Math.random() * 1.4, ph: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() * 1.6 });
    };

    const resize = () => {
      w = innerWidth; h = innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (x: number, y: number) => { mouse.x = x; mouse.y = y; };
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    window.addEventListener("mousemove", mm);
    window.addEventListener("touchmove", tm, { passive: true });

    // نقرة في أي مكان = انطلاق قلوب صغيرة
    const burst = (x: number, y: number) => {
      const n = isCoarse ? 6 : 9;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2.6;
        bursts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6,
          s: 5 + Math.random() * 9, life: 1,
          spr: heartSprites[(Math.random() * heartSprites.length) | 0],
          rot: Math.random() * Math.PI, rv: (Math.random() - 0.5) * 0.2,
        });
      }
    };
    const pd = (e: PointerEvent) => burst(e.clientX, e.clientY);
    window.addEventListener("pointerdown", pd);

    let t = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (FRAME_MS && now - last < FRAME_MS) return; // تخفيف معدل الإطارات
      last = now;
      t += FRAME_MS ? 0.033 : 0.016;

      mouse.gx += (mouse.x - mouse.gx) * 0.06;
      mouse.gy += (mouse.y - mouse.gy) * 0.06;

      ctx.clearRect(0, 0, w, h);

      // التوهج الذي يتبع المؤشر (صورة جاهزة — بلا تكلفة)
      ctx.globalAlpha = 1;
      ctx.drawImage(glowSprite, mouse.gx - 350, mouse.gy - 350, 700, 700);

      // النجوم المتلألئة
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(t * s.sp + s.ph));
        const f = s.r / 2;
        ctx.drawImage(starSprite, s.x - (STAR_S / 2) * f, s.y - (STAR_S / 2) * f, STAR_S * f, STAR_S * f);
      }

      // القلوب الصاعدة
      for (const hrt of hearts) {
        hrt.y -= hrt.v;
        hrt.rot += hrt.rv;
        const x = hrt.bx + Math.sin(t * hrt.sp + hrt.ph) * hrt.sway;
        if (hrt.y < -40) { hrt.y = h + 40; hrt.bx = Math.random() * w; }
        const near = Math.hypot(x - mouse.gx, hrt.y - mouse.gy);
        const boost = near < 170 ? (1 - near / 170) * 0.35 : 0;
        ctx.globalAlpha = hrt.a + boost;
        const f = hrt.s / 34; // حجم القلب الأصلي داخل الـ Sprite كان 34px
        ctx.save();
        ctx.translate(x, hrt.y);
        ctx.rotate(hrt.rot + Math.sin(t * hrt.sp + hrt.ph) * 0.15);
        ctx.drawImage(hrt.spr, -(HEART_S / 2) * f, -(HEART_S / 2) * f, HEART_S * f, HEART_S * f);
        ctx.restore();
      }

      // قلوب النقرات
      bursts = bursts.filter((b) => b.life > 0.02);
      for (const b of bursts) {
        b.x += b.vx; b.y += b.vy; b.vy += 0.05; b.vx *= 0.985; b.life -= 0.014; b.rot += b.rv;
        ctx.globalAlpha = Math.max(0, b.life) * 0.9;
        const f = b.s / 34;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.drawImage(b.spr, -(HEART_S / 2) * f, -(HEART_S / 2) * f, HEART_S * f, HEART_S * f);
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("pointerdown", pd);
    };
  }, [active]);

  return <canvas ref={ref} className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}

/* =====================================================================
   ٤) ألعاب نارية الانتقال — نسخة خفيفة بلا shadowBlur حي
   ===================================================================== */
function FireworksOverlay({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = isCoarse ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    let w = innerWidth, h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";

    const COLORS = ["#f3b7c7", "#e8c07a", "#e1789c", "#f6e3c5", "#c72c5c", "#f2cf9a"];
    // أعداد مضبوطة حسب قوة الجهاز
    const HEART_BIG = isCoarse ? 90 : 150;
    const HEART_N = isCoarse ? 56 : 95;
    const RING_BIG = isCoarse ? 40 : 70;
    const RING_N = isCoarse ? 26 : 48;
    const LAUNCH_MS = isCoarse ? 570 : 430;

    type Rocket = { x: number; y: number; vy: number; hue: string; heart: boolean };
    type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; life: number; dec: number; size: number; c: string; tw: boolean; ph: number };
    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];

    const pick = () => COLORS[(Math.random() * COLORS.length) | 0];

    const explode = (x: number, y: number, heart: boolean, big = false) => {
      if (heart) {
        // انفجار على شكل قلب باستخدام معادلة القلب القطبيّة
        const n = big ? HEART_BIG : HEART_N;
        const sc = big ? 0.24 : 0.12;
        for (let i = 0; i < n; i++) {
          const tt = (i / n) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(tt), 3);
          const hy = -(13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt));
          const sp = 0.9 + Math.random() * 0.55;
          sparks.push({
            x, y, px: x, py: y,
            vx: hx * sc * sp, vy: hy * sc * sp,
            life: 1.15, dec: 0.006 + Math.random() * 0.008,
            size: 1.6 + Math.random() * 2.2, c: Math.random() > 0.4 ? "#e1789c" : "#e8c07a",
            tw: Math.random() > 0.65, ph: Math.random() * 6,
          });
        }
      }
      const n = big ? RING_BIG : RING_N;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * (big ? 5.4 : 3.8);
        sparks.push({
          x, y, px: x, py: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1, dec: 0.007 + Math.random() * 0.011,
          size: 1.3 + Math.random() * 2, c: pick(),
          tw: Math.random() > 0.6, ph: Math.random() * 6,
        });
      }
    };

    const launch = () => {
      rockets.push({
        x: w * (0.16 + Math.random() * 0.68), y: h + 12,
        vy: -(h * (0.011 + Math.random() * 0.004)),
        hue: pick(), heart: Math.random() > 0.55,
      });
    };

    // اللقطة الافتتاحية: قلب عِملاق يتفجر في منتصف الشاشة
    explode(w / 2, h * 0.42, true, true);
    launch(); launch();

    let elapsed = 0, last = performance.now(), raf = 0, launchAcc = 0;

    const frame = (now: number) => {
      const dtMs = Math.min(50, now - last) || 16;
      const k = dtMs / 16.7;
      last = now;
      elapsed += dtMs;
      launchAcc += dtMs;
      if (elapsed < 5200 && launchAcc > LAUNCH_MS) { launchAcc = 0; launch(); }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // الصواريخ الصاعدة (نقطة مضيئة بطبقتين بدل shadowBlur)
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += 0.14 * k;
        r.y += r.vy * k;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = r.hue;
        ctx.beginPath(); ctx.arc(r.x, r.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, Math.PI * 2); ctx.fill();
        if (r.vy > -2.1) {
          explode(r.x, r.y, r.heart);
          rockets.splice(i, 1);
        }
      }

      // الشرارات: خطان (هالة عريضة شفافة + نواة) = توهج رخيص التكلفة
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.px = s.x; s.py = s.y;
        s.vx *= 0.985; s.vy = s.vy * 0.985 + 0.055;
        s.x += s.vx * k; s.y += s.vy * k;
        s.life -= s.dec * k;
        if (s.life <= 0.02) { sparks.splice(i, 1); continue; }
        const a = s.tw ? s.life * (0.55 + 0.45 * Math.sin(now * 0.02 + s.ph)) : s.life;
        ctx.strokeStyle = s.c;
        ctx.globalAlpha = Math.max(0, a) * 0.25;
        ctx.lineWidth = s.size * 2.6;
        ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.globalAlpha = Math.max(0, a);
        ctx.lineWidth = s.size;
        ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      if (elapsed > 6500 && sparks.length === 0 && rockets.length === 0) {
        doneRef.current();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className="fixed inset-0 z-[70] pointer-events-none" aria-hidden="true" />;
}

/* =====================================================================
   ٥) وهج يلتف حول المؤشر (لأجهزة الماوس فقط — لا يعمل على الجوال إطلاقاً)
   ===================================================================== */
function CursorGlow() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isCoarse) return;
    const el = ref.current!;
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const pos = { ...target };
    let raf = 0;
    const mm = (e: MouseEvent) => { target.x = e.clientX; target.y = e.clientY; };
    window.addEventListener("mousemove", mm);
    const loop = () => {
      pos.x += (target.x - pos.x) * 0.08;
      pos.y += (target.y - pos.y) * 0.08;
      el.style.transform = `translate(${pos.x - 230}px, ${pos.y - 230}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("mousemove", mm); cancelAnimationFrame(raf); };
  }, []);
  if (isCoarse) return null;
  return <div ref={ref} className="cursor-glow hidden md:block" aria-hidden="true" />;
}

/* =====================================================================
   ٦) شاشة القفل — بوابة العشق
   ===================================================================== */
function LockScreen({ leaving, onUnlock, onGatesDone }: {
  leaving: boolean;
  onUnlock: () => void;
  onGatesDone: () => void;
}) {
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "error" | "okay">("idle");
  const [msg, setMsg] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  /* تركيز تلقائي على أول خانة لسهولة الإدخال */
  useEffect(() => {
    const t = setTimeout(() => inputsRef.current[0]?.focus(), 600);
    return () => clearTimeout(t);
  }, []);

  /* بعد فتح البوابة، نزيل شاشة القفل من الصفحة */
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onGatesDone, 2050);
    return () => clearTimeout(t);
  }, [leaving, onGatesDone]);

  const value = pin.join("");

  const check = useCallback((v: string) => {
    if (v.length !== 4) return;
    if (v === love.secretCode) {
      setStatus("okay");
      setMsg("أهلاً بكِ في عالمنا يا " + love.herName);
      setTimeout(onUnlock, 650);
    } else {
      setStatus("error");
      setMsg(love.wrongCodeMessages[(Math.random() * love.wrongCodeMessages.length) | 0]);
      setTimeout(() => {
        setPin(["", "", "", ""]);
        setStatus("idle");
        inputsRef.current[0]?.focus();
      }, 750);
    }
  }, [onUnlock]);

  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[i] = d;
    setPin(next);
    if (d && i < 3) inputsRef.current[i + 1]?.focus();
    const joined = next.join("");
    if (joined.length === 4 && !next.includes("")) setTimeout(() => check(joined), 320);
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
      const next = [...pin]; next[i - 1] = ""; setPin(next);
    }
  };

  return (
    <div className={`lock-wrap ${leaving ? "leaving" : ""}`} role="dialog" aria-label="شاشة القفل الرومانسية">
      {/* جناحا البوابة المنزلقان */}
      <div className="gate gate-l" />
      <div className="gate gate-r" />
      <div className="portal-flash" />

      {/* بطاقة إدخال الرمز */}
      <div className={`lock-card glass gold-frame soft-glow ${status === "okay" ? "success" : ""}`}>
        {/* قلوب النجاح المتطايرة */}
        {status === "okay" &&
          Array.from({ length: 10 }).map((_, i) => (
            <Heart
              key={i}
              className="burst-h"
              size={i % 3 === 0 ? 26 : 18}
              fill="currentColor"
              style={{
                "--dx": `${(Math.random() - 0.5) * 320}px`,
                "--dy": `${130 + Math.random() * 200}px`,
                "--rot": `${(Math.random() - 0.5) * 90}deg`,
                animationDelay: `${i * 0.07}s`,
                color: i % 2 ? "#e8c07a" : "#e1789c",
              } as React.CSSProperties}
            />
          ))}

        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full grid place-items-center border border-[rgba(232,192,122,0.45)] bg-[rgba(127,21,55,0.35)] soft-glow">
            {status === "okay" ? (
              <Heart size={28} className="text-[#e1789c] heartbeat" fill="currentColor" />
            ) : (
              <Lock size={26} className="text-[#e8c07a]" />
            )}
          </div>
        </div>

        <p className="text-[#cba9ab] text-sm tracking-widest mb-2 font-medium">بوابة لا تُفتح إلا لقلبٍ واحد</p>
        <h1 className="font-amiri text-4xl md:text-[2.6rem] gold-text mb-1 leading-snug">مملكة القلوب</h1>
        <p className="font-ruqaa text-[#f3b7c7] text-lg mb-7">همسة: هذا العالم صُنع لأجلكِ أنتِ يا {love.herName}</p>

        {/* خانات الرمز الأربع */}
        <div className={`pin-row ${status === "error" ? "error" : ""} ${status === "okay" ? "okay" : ""}`}>
          {pin.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              value={d}
              inputMode="numeric"
              autoComplete="off"
              aria-label={`الخانة ${i + 1} من الرمز السري`}
              disabled={status === "okay"}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        {/* التلميح / رسالة التنبيه */}
        <p className={`mt-5 text-sm transition-colors duration-300 min-h-[1.6em] font-ruqaa text-base ${
          status === "error" ? "text-[#e1789c]" : status === "okay" ? "text-[#e8c07a]" : "text-[#cba9ab]"
        }`}>
          {msg || love.secretHint}
        </p>

        <button
          type="button"
          className="btn-gold mt-6"
          disabled={status === "okay"}
          onClick={() => check(value)}
        >
          <Heart size={18} fill="currentColor" />
          افتحي بوّابة قلبي
        </button>

        <div className="flex items-center gap-3 mt-7">
          <span className="ornament-line" />
          <Sparkles size={14} className="text-[#e8c07a] twinkle" />
          <span className="ornament-line" />
        </div>
        <p className="text-xs text-[#8f6f77] mt-3">كل ضغطة على الشاشة تطلق قلباً… جرّبي</p>
      </div>
    </div>
  );
}

/* =====================================================================
   ٧) عناصر مشتركة: عنوان القسم + الفاصل الزخرفي
   ===================================================================== */
function Divider() {
  return (
    <div className="flex items-center gap-4 my-6 justify-center">
      <span className="ornament-line max-w-[120px]" />
      <Heart size={15} className="text-[#e8c07a] twinkle" fill="currentColor" />
      <span className="ornament-line max-w-[120px]" />
    </div>
  );
}

function SectionHead({ icon: Icon, kicker, title }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  kicker: string;
  title: string;
}) {
  return (
    <div className="sec-head text-center mb-14" data-reveal>
      <div className="flex justify-center mb-4">
        <div className="badge"><Icon size={26} /></div>
      </div>
      <p className="text-[#cba9ab] text-sm tracking-[0.3em] mb-2">{kicker}</p>
      <h2 className="font-amiri text-4xl md:text-5xl gold-text leading-snug">{title}</h2>
      <Divider />
    </div>
  );
}

/* =====================================================================
   ٨) الشريط العلوي + واجهة البطل
   ===================================================================== */
function TopNav() {
  const links = [
    { href: "#home", label: "البداية" },
    { href: "#counter", label: "عمر حبنا" },
    { href: "#letter", label: "همسة" },
    { href: "#reasons", label: "لماذا أحبكِ" },
    { href: "#gallery", label: "ذكرياتنا" },
    { href: "#notes", label: "غزل" },
    { href: "#story", label: "حكايتنا" },
  ];
  return (
    <nav className="top-nav glass" aria-label="التنقل الرئيسي">
      {links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
    </nav>
  );
}

function Hero() {
  return (
    <header id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* خلفية سينمائية (حركتها تتوقف تلقائياً على الجوال) */}
      <img
        src="/images/hero-bg.jpg"
        alt=""
        aria-hidden="true"
        className="kenburns absolute inset-0 w-full h-full object-cover opacity-55"
      />
      <div className="hero-veil absolute inset-0" />

      <div className="hero-enter relative z-10 text-center px-6 py-28">
        <p className="text-[#f3b7c7] tracking-[0.35em] text-xs md:text-sm mb-6 font-medium">{love.heroKicker}</p>
        <h1 className="hero-title font-amiri gold-text">{love.heroTitle}</h1>

        <div className="flex items-center justify-center gap-4 md:gap-6 mt-8">
          <span className="font-rakkas text-2xl md:text-3xl text-[#f5ebe6]">{love.hisName}</span>
          <span className="relative grid place-items-center">
            <span className="heartbeat grid place-items-center">
              <Heart size={34} className="text-[#c72c5c]" fill="currentColor" style={isCoarse ? undefined : { filter: "drop-shadow(0 0 18px rgba(225,120,156,0.8))" }} />
            </span>
            <InfinityIcon size={14} className="absolute text-[#f6e3c5]" />
          </span>
          <span className="font-rakkas text-2xl md:text-3xl rose-text">{love.herName}</span>
        </div>

        <p className="font-ruqaa text-xl md:text-2xl text-[#f3b7c7] mt-8 max-w-2xl mx-auto leading-relaxed">
          {love.heroSubtitle}
        </p>

        <a href="#counter" className="btn-gold mt-10">
          <ChevronDown size={18} />
          ابدئي الرحلة
        </a>
      </div>

      {/* مؤشر التمرير */}
      <div className="scroll-cue absolute bottom-7 left-1/2 -translate-x-1/2 z-10 text-[#e8c07a] flex flex-col items-center gap-1">
        <span className="text-xs tracking-[0.3em] text-[#cba9ab]">اكتشفي</span>
        <ChevronDown size={22} />
      </div>
    </header>
  );
}

/* =====================================================================
   ٩) عداد الحب التفاعلي
   ===================================================================== */
function LoveCounter() {
  const start = useMemo(() => new Date(love.startDate).getTime(), []);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, now - start);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const minutes = Math.floor(diff / 60000) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  const items = [
    { v: days, l: "يوماً من العشق" },
    { v: hours, l: "ساعة من الشوق" },
    { v: minutes, l: "دقيقة من الحنين" },
    { v: seconds, l: "ثانية من النبض" },
  ];

  return (
    <section id="counter" className="relative max-w-5xl mx-auto px-6 py-28">
      <SectionHead icon={Hourglass} kicker="يفيض ولا ينتهي" title="عُمر حكايتنا" />
      <p className="text-center text-[#cba9ab] font-ruqaa text-lg max-w-xl mx-auto -mt-6 mb-10" data-reveal>
        منذ اللحظة التي دخلتِ فيها حياتي… والقلب يعدّ
      </p>
      <div className="flex flex-wrap justify-center gap-4 md:gap-6">
        {items.map((it, i) => (
          <div key={it.l} className="counter-card glass gold-frame" data-reveal style={{ "--rd": `${i * 0.12}s` } as React.CSSProperties}>
            <div className="num gold-text" dir="ltr">
              <span key={it.v}>{toArabicDigits(it.v)}</span>
            </div>
            <div className="text-[#cba9ab] text-sm mt-2">{it.l}</div>
          </div>
        ))}
      </div>
      <p className="text-center mt-10 text-[#f3b7c7] font-ruqaa text-lg" data-reveal>
        أيّ ما يعادل <span className="gold-text font-amiri text-2xl mx-1">{toArabicDigits(Math.floor(diff / 1000).toLocaleString("en-US"))}</span> نبضة قلب… وكلها لكِ
      </p>
    </section>
  );
}

/* =====================================================================
   ١٠) رسالة الآلة الكاتبة — تُكتب أمام عينيها حرفاً حرفاً
   ===================================================================== */
function Typewriter() {
  const msgs = love.typewriterMessages;
  const [mi, setMi] = useState(0);
  const [txt, setTxt] = useState("");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const msg = msgs[mi % msgs.length];
    let i = 0;
    let holdT = 0, fadeT = 0;
    const t = setInterval(() => {
      i++;
      setTxt(msg.slice(0, i));
      if (i >= msg.length) {
        clearInterval(t);
        holdT = window.setTimeout(() => {
          setFading(true);
          fadeT = window.setTimeout(() => {
            setMi((m) => (m + 1) % msgs.length);
            setTxt("");
            setFading(false);
          }, 700);
        }, 4200);
      }
    }, 60);
    return () => { clearInterval(t); clearTimeout(holdT); clearTimeout(fadeT); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mi, msgs]);

  return (
    <section id="letter" className="relative max-w-3xl mx-auto px-6 py-28">
      <SectionHead icon={ScrollText} kicker="تُكتب الآن من أجلكِ" title="همسة القلب" />
      <div className="letter-paper gold-frame soft-glow" data-reveal>
        <Quote size={30} className="text-[#e8c07a] opacity-40 mb-4 rotate-180" />
        <p className="type-text text-[#f5ebe6]" style={{ opacity: fading ? 0 : 1, transition: "opacity 0.65s ease" }}>
          {txt}
          <span className="type-caret" />
        </p>
        <div className="flex items-center gap-3 mt-6 justify-end">
          <span className="text-sm text-[#cba9ab]">توقيع القلب</span>
          <Heart size={16} className="text-[#c72c5c] heartbeat" fill="currentColor" />
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   ١١) بطاقات "لماذا أحبكِ؟" — ثلاثية الأبعاد تنقلب عند اللمس
   ===================================================================== */
function WhyCards() {
  const [flipped, setFlipped] = useState<boolean[]>(() => love.reasons.map(() => false));
  const toggle = (i: number) => setFlipped((f) => f.map((v, j) => (j === i ? !v : v)));

  return (
    <section id="reasons" className="relative max-w-6xl mx-auto px-6 py-28">
      <SectionHead icon={HeartPulse} kicker="ستة أسباب من ألف" title="لماذا أحبكِ؟" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {love.reasons.map((r, i) => (
          <div
            key={i}
            className={`flip-card cursor-pointer select-none ${flipped[i] ? "flipped" : ""}`}
            onClick={() => toggle(i)}
            data-reveal
            style={{ "--rd": `${(i % 3) * 0.12}s` } as React.CSSProperties}
            role="button"
            aria-label={`سبب الحب: ${r.title}`}
          >
            <div className="flip-card-inner">
              {/* الوجه الأمامي */}
              <div className="flip-face flip-front">
                <span className="ghost">{toArabicDigits(i + 1)}</span>
                <div className="w-12 h-12 rounded-full grid place-items-center border border-[rgba(232,192,122,0.4)] mb-4 text-[#f3b7c7]">
                  <Heart size={20} fill="currentColor" />
                </div>
                <h3 className="font-amiri text-3xl gold-text">{r.title}</h3>
                <p className="text-xs text-[#cba9ab] mt-4 tracking-widest">المسي البطاقة لتقرئي السرّ</p>
              </div>
              {/* الوجه الخلفي */}
              <div className="flip-face flip-back">
                <Quote size={18} className="text-[#e8c07a] opacity-50 mb-3 rotate-180" />
                <p className="font-ruqaa text-lg leading-loose text-[#f5ebe6]">{r.text}</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="ornament-line w-8" />
                  <Heart size={12} className="text-[#c72c5c]" fill="currentColor" />
                  <span className="ornament-line w-8" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   ١٢) معرض الذكريات الفاخر + نافذة التكبير (Lightbox)
   ===================================================================== */
function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const photos = love.gallery;

  const next = useCallback(() => setOpen((o) => (o === null ? null : (o + 1) % photos.length)), [photos.length]);
  const prev = useCallback(() => setOpen((o) => (o === null ? null : (o - 1 + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const kd = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [open, next, prev]);

  return (
    <section id="gallery" className="relative max-w-6xl mx-auto px-6 py-28">
      <SectionHead icon={Images} kicker="لحظات خلّدها الضوء" title="معرض ذكرياتنا" />
      <div className="gallery-grid grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {photos.map((p, i) => (
          <figure key={p.src} onClick={() => setOpen(i)} data-reveal style={{ "--rd": `${(i % 3) * 0.1}s` } as React.CSSProperties}>
            <img src={p.src} alt={p.caption} loading="lazy" />
            <figcaption className="gold-text">{p.caption}</figcaption>
          </figure>
        ))}
      </div>

      {/* نافذة التكبير السوداء الفخمة */}
      {open !== null && (
        <div className="lb" onClick={() => setOpen(null)} role="dialog" aria-label="تكبير الصورة">
          <button className="lb-btn absolute top-5 right-5 z-10" onClick={() => setOpen(null)} aria-label="إغلاق">
            <X size={22} />
          </button>
          <button
            className="lb-btn absolute right-[3%] top-1/2 -translate-y-1/2 z-10"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="السابقة"
          >
            <ChevronRight size={24} />
          </button>
          <button
            className="lb-btn absolute left-[3%] top-1/2 -translate-y-1/2 z-10"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="التالية"
          >
            <ChevronLeft size={24} />
          </button>
          <figure className="text-center px-16" onClick={(e) => e.stopPropagation()}>
            <img key={photos[open].src} src={photos[open].src} alt={photos[open].caption} className="lb-img" />
            <figcaption className="mt-5">
              <span className="font-amiri text-xl gold-text">{photos[open].caption}</span>
              <span className="block text-xs text-[#cba9ab] mt-2 tracking-widest">
                {toArabicDigits(open + 1)} من {toArabicDigits(photos.length)}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}

/* =====================================================================
   ١٣) صندوق الغزل — كل ضغطة رسالة حب جديدة
   ===================================================================== */
function LoveNotes() {
  const [idx, setIdx] = useState(0);
  const [bursts, setBursts] = useState<{ id: number; dx: number; dy: number; rot: number }[]>([]);

  const draw = () => {
    let n = idx;
    while (n === idx) n = (Math.random() * love.loveNotes.length) | 0;
    setIdx(n);
    setBursts(Array.from({ length: isCoarse ? 4 : 7 }).map((_, i) => ({
      id: Date.now() + i,
      dx: (Math.random() - 0.5) * 220,
      dy: 90 + Math.random() * 150,
      rot: (Math.random() - 0.5) * 120,
    })));
  };

  return (
    <section id="notes" className="relative max-w-3xl mx-auto px-6 py-28">
      <SectionHead icon={Gift} kicker="مفاجأة في كل ضغطة" title="صندوق الغزل" />
      <div className="note-card glass gold-frame soft-glow relative rounded-3xl p-10 md:p-14 text-center" data-reveal>
        <Quote size={26} className="text-[#e8c07a] opacity-30 absolute top-6 right-6 rotate-180" />
        <Quote size={26} className="text-[#e8c07a] opacity-30 absolute bottom-6 left-6" />
        <p key={idx} className="note-body font-ruqaa text-2xl md:text-[1.9rem] leading-loose rose-text">
          {love.loveNotes[idx]}
        </p>
      </div>

      <div className="relative flex flex-col items-center mt-10" data-reveal style={{ "--rd": "0.15s" } as React.CSSProperties}>
        {bursts.map((b) => (
          <Heart
            key={b.id}
            className="pop-heart"
            size={14 + (b.id % 3) * 5}
            fill="currentColor"
            style={{
              "--dx": `${b.dx}px`,
              "--dy": `${b.dy}px`,
              "--rot": `${b.rot}deg`,
              color: b.id % 2 ? "#e8c07a" : "#e1789c",
            } as React.CSSProperties}
          />
        ))}
        <button className="btn-seal" onClick={draw} aria-label="افتحي رسالة حب جديدة">
          <Heart size={34} fill="currentColor" />
        </button>
        <p className="text-[#cba9ab] text-sm mt-5 tracking-widest">اضغطي الخاتم الذهبي… وخذي قبلة مكتوبة</p>
      </div>
    </section>
  );
}

/* =====================================================================
   ١٤) شريط حكايتنا الزمني
   ===================================================================== */
const TL_ICONS = [Sparkles, MessageCircle, Coffee, Laugh, InfinityIcon];

function Timeline() {
  return (
    <section id="story" className="relative max-w-5xl mx-auto px-6 py-28">
      <SectionHead icon={Footprints} kicker="من أول نظرة إلى الأبد" title="محطات حكايتنا" />
      <div className="tl">
        {love.timeline.map((m, i) => {
          const Icon = TL_ICONS[i % TL_ICONS.length];
          return (
            <div key={i} className="tl-item" data-reveal style={{ "--rd": `${i * 0.06}s` } as React.CSSProperties}>
              <span className="tl-dot" />
              <div className="tl-card glass">
                <span className="tl-date">{m.date}</span>
                <h3 className="font-amiri text-2xl gold-text mt-3 flex items-center gap-2">
                  <Icon size={19} className="text-[#e1789c]" />
                  {m.title}
                </h3>
                <p className="text-[#d9c3c0] leading-relaxed mt-2 text-[0.98rem]">{m.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =====================================================================
   ١٥) الرسالة الختامية + التذييل
   ===================================================================== */
function FinalLetter() {
  return (
    <section className="relative max-w-3xl mx-auto px-6 pt-16 pb-24">
      <div className="text-center mb-12" data-reveal>
        <Feather size={30} className="text-[#e8c07a] mx-auto mb-4 twinkle" />
        <h2 className="font-amiri text-3xl md:text-4xl gold-text leading-relaxed">{love.finalLetter.title}</h2>
      </div>
      <div className="final-paper gold-frame soft-glow text-center" data-reveal>
        <p className="font-ruqaa text-xl md:text-2xl leading-[2.3] text-[#f3e4de]">{love.finalLetter.text}</p>
        <Divider />
        <p className="font-amiri text-lg rose-text">{love.finalLetter.signature}</p>
        <p className="font-rakkas text-3xl gold-text mt-2">{love.hisName}</p>
        <div className="mt-6 grid place-items-center">
          <Heart size={40} className="text-[#c72c5c] heartbeat" fill="currentColor" style={isCoarse ? undefined : { filter: "drop-shadow(0 0 22px rgba(225,120,156,0.75))" }} />
        </div>
      </div>

      <footer className="text-center pt-14 pb-6">
        <div className="flex items-center gap-4 justify-center mb-5">
          <span className="ornament-line max-w-[90px]" />
          <Heart size={13} className="text-[#e8c07a]" fill="currentColor" />
          <span className="ornament-line max-w-[90px]" />
        </div>
        <p className="text-[#8f6f77] text-sm">
          صُنعت هذه الصفحة بحبٍّ لا يشيخ، من قلبٍ لا يعرف سواكِ
        </p>
        <p className="text-[#6d555c] text-xs mt-2 flex items-center justify-center gap-1.5">
          <CalendarHeart size={13} />
          {toArabicDigits(new Date().getFullYear())} — وكل عام وأنتِ حبيبتي
        </p>
      </footer>
    </section>
  );
}

/* =====================================================================
   ١٦) زر الموسيقى العائم
   ===================================================================== */
function MusicFab({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      className={`fab-music glass ${playing ? "playing" : ""}`}
      onClick={onToggle}
      aria-label={playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
      title={playing ? "إيقاف موسيقانا" : "تشغيل موسيقانا"}
    >
      {playing && <span className="pulse-ring" />}
      {playing ? (
        <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span>
      ) : (
        <Music size={22} />
      )}
    </button>
  );
}

/* =====================================================================
   ١٧) التجميع النهائي — منطق الدخول والانتقال السينمائي
   ===================================================================== */
export default function App() {
  const [phase, setPhase] = useState<"locked" | "celebrate" | "open">("locked");
  const [showFw, setShowFw] = useState(false);
  const audio = useRomanticAudio(love.musicUrl);
  const mainRef = useRef<HTMLDivElement | null>(null);

  /* قفل التمرير أثناء شاشة القفل */
  useEffect(() => {
    document.body.style.overflow = phase === "locked" ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [phase]);

  /* تفعيل أنيميشن الظهور بالتمرير بعد فتح البوابة */
  useEffect(() => {
    if (phase === "locked" || !mainRef.current) return;
    const els = mainRef.current.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("revealed"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [phase]);

  /* لحظة إدخال الرمز الصحيح: تشتعل الاحتفالية */
  const handleUnlock = useCallback(() => {
    audio.unlock();
    setPhase("celebrate");
    setShowFw(true);
    setTimeout(() => audio.start(), 420);
  }, [audio]);

  return (
    <div className="relative min-h-screen">
      {/* الخلفية تنام تماماً خلف شاشة القفل وتستيقظ عند الانفتاح */}
      <RomanticCanvas active={phase !== "locked"} />

      {/* المحتوى الرئيسي: يولد مع انفتاح البوابة */}
      {phase !== "locked" && (
        <div ref={mainRef} className="main-enter relative z-10">
          <TopNav />
          <Hero />
          <main>
            <LoveCounter />
            <Typewriter />
            <WhyCards />
            <Gallery />
            <LoveNotes />
            <Timeline />
            <FinalLetter />
          </main>
          <MusicFab playing={audio.playing} onToggle={audio.toggle} />
        </div>
      )}

      {/* الألعاب النارية فوق كل شيء أثناء الانتقال */}
      {showFw && <FireworksOverlay onDone={() => setShowFw(false)} />}

      {/* شاشة القفل تبقى حتى تنزلق البوابة بالكامل */}
      {phase !== "open" && (
        <LockScreen
          leaving={phase === "celebrate"}
          onUnlock={handleUnlock}
          onGatesDone={() => setPhase("open")}
        />
      )}

      <CursorGlow />
    </div>
  );
}
