"use client";

import React, { useCallback, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 0.61, 0.36, 1] as const;

/** Sarlavha so'zlari ketma-ket ko'tarilib chiqadi. */
export const SplitWords: React.FC<{ text: string; delay?: number; className?: string }> = ({ text, delay = 0, className }) => {
  const reduce = useReducedMotion();
  const words = text.split(" ").filter(Boolean);
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={cn("inline", className)} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.1em] -mb-[0.1em]">
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.7, delay: delay + i * 0.06, ease }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </span>
  );
};

/** Scroll bilan yumshoq parallaks (faqat translateY). */
export const ParallaxY: React.FC<{ children: React.ReactNode; from?: number; to?: number; className?: string }> = ({
  children,
  from = 40,
  to = -40,
  className,
}) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : from, reduce ? 0 : to]);
  return (
    <motion.div ref={ref} style={{ y }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
};

/** Sahifa scroll-progress chizig'i. */
export const ScrollProgress: React.FC = () => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.25 });
  if (reduce) return null;
  return <motion.div aria-hidden="true" style={{ scaleX }} className="absolute inset-x-0 bottom-[-1px] h-[3px] origin-left bg-[var(--l-blue)]" />;
};

/**
 * 3D egilish: sichqoncha holatiga qarab rotateX/rotateY (spring bilan yumshoq).
 * Ichidagi elementlar translateZ orqali chuqurlik oladi (preserve-3d).
 */
export const Tilt3D: React.FC<{
  children: React.ReactNode;
  className?: string;
  max?: number;
  perspective?: number;
  scale?: number;
}> = ({ children, className, max = 10, perspective = 1200, scale = 1.02 }) => {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const s = useMotionValue(1);
  const srx = useSpring(rx, { stiffness: 160, damping: 20, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 160, damping: 20, mass: 0.4 });
  const ss = useSpring(s, { stiffness: 200, damping: 22 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce) return;
      const r = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry.set(px * max * 2);
      rx.set(-py * max * 2);
      s.set(scale);
    },
    [reduce, max, scale, rx, ry, s],
  );
  const onLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
    s.set(1);
  }, [rx, ry, s]);

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, scale: ss, transformPerspective: perspective, transformStyle: "preserve-3d" }}
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
};

/** Chuqurlikdagi qatlam (Tilt3D ichida ishlatiladi). */
export const Depth: React.FC<{ z?: number; children?: React.ReactNode; className?: string }> = ({ z = 40, children, className }) => (
  <div style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }} className={className}>
    {children}
  </div>
);

/** 3D bilan ko'tarilib chiqadigan blok (perspektiva + rotateX). */
export const Rise3D: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("will-change-transform", className)}
      style={{ transformPerspective: 1400 }}
      initial={reduce ? false : { opacity: 0, y: 70, rotateX: 16, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{ duration: 1, delay, ease }}
    >
      {children}
    </motion.div>
  );
};

/** Gorizontal chiziq scroll bilan "chiziladi". */
export const DrawLineX: React.FC<{ className?: string }> = ({ className }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "start 35%"] });
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div ref={ref} className={cn("relative h-[3px] w-full rounded-full bg-[var(--l-line)]", className)} aria-hidden="true">
      <motion.div style={{ scaleX: reduce ? 1 : scaleX }} className="absolute inset-0 origin-left rounded-full bg-[var(--l-blue)]" />
    </div>
  );
};

/** Sichqoncha ortidan yuradigan yorug'lik. */
export const SpotlightCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);
  return (
    <div onMouseMove={onMove} className={cn("spotlight relative overflow-hidden", className)}>
      {children}
    </div>
  );
};

/** Sarlavha so'zlari — ko'rinish maydoniga kirganda ketma-ket chiqadi. */
export const WordsInView: React.FC<{ text: string; className?: string; stagger?: number }> = ({ text, className, stagger = 0.05 }) => {
  const reduce = useReducedMotion();
  const words = text.split(" ").filter(Boolean);
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={cn("inline", className)} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.1em] -mb-[0.1em]">
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: "110%", opacity: 0 }}
            whileInView={{ y: "0%", opacity: 1 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.65, delay: i * stagger, ease }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </span>
  );
};

/** Hero sahnasi scroll bilan orqaga "yotadi" va kichrayadi (rotateX/scale/y). */
export const ScrollScene: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 20%", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 22]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.9]);
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0.35]);
  return (
    <motion.div ref={ref} style={{ rotateX, scale, y, opacity, transformPerspective: 1400, transformOrigin: "50% 100%" }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
};

/** 3D flip bilan kirish (rotateY + siljish), ko'rinish maydonida. */
export const FlipIn: React.FC<{ children: React.ReactNode; className?: string; delay?: number; from?: "left" | "right" }> = ({
  children,
  className,
  delay = 0,
  from = "left",
}) => {
  const reduce = useReducedMotion();
  const sign = from === "left" ? -1 : 1;
  return (
    <motion.div
      className={cn("will-change-transform", className)}
      style={{ transformPerspective: 1200 }}
      initial={reduce ? false : { opacity: 0, x: sign * 40, rotateY: sign * 18, scale: 0.96 }}
      whileInView={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
};

/** Sahifa scroll'iga bog'liq dekorativ shakl (translateY + rotate). */
export const DriftShape: React.FC<{ className?: string; speed?: number; rotate?: number; children?: React.ReactNode }> = ({
  className,
  speed = 120,
  rotate = 30,
  children,
}) => {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1600], [0, reduce ? 0 : -speed]);
  const r = useTransform(scrollY, [0, 1600], [0, reduce ? 0 : rotate]);
  return (
    <motion.div aria-hidden="true" style={{ y, rotate: r }} className={cn("pointer-events-none absolute will-change-transform", className)}>
      {children}
    </motion.div>
  );
};

/** Gorizontal parallaks (translateX) — scroll bilan chapga/o'ngga siljiydi. */
export const ParallaxX: React.FC<{ children: React.ReactNode; from?: number; to?: number; className?: string }> = ({
  children,
  from = -60,
  to = 60,
  className,
}) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : from, reduce ? 0 : to]);
  return (
    <motion.div ref={ref} style={{ x }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
};

/** Kattalashib kiruvchi blok (scale + opacity), ko'rinish maydonida. */
export const ScaleIn: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("will-change-transform", className)}
      initial={reduce ? false : { opacity: 0, scale: 0.92, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
};

/** Katta kinetik matn — scroll bilan gorizontal suzadi (fon bezagi). */
export const KineticText: React.FC<{
  text: string;
  className?: string;
  from?: number;
  to?: number;
  outline?: boolean;
  light?: boolean;
}> = ({ text, className, from = 120, to = -240, outline = false, light = false }) => (
  <ParallaxX
    from={from}
    to={to}
    className={cn(
      "pointer-events-none absolute left-0 select-none whitespace-nowrap font-black leading-none tracking-[-0.06em]",
      outline ? (light ? "outline-text-light" : "outline-text") : light ? "text-white/[0.09]" : "text-[var(--l-ink)]/[0.05]",
      className,
    )}
  >
    {text}
  </ParallaxX>
);

/** Ikki qatorli kinetik lenta — qatorlar qarama-qarshi yo'nalishda suzadi. */
export const KineticStrip: React.FC<{ rowA: string; rowB: string; light?: boolean; className?: string }> = ({ rowA, rowB, light = false, className }) => (
  <div aria-hidden="true" className={cn("relative overflow-hidden py-6 sm:py-10", className)}>
    <ParallaxX from={0} to={-320} className={cn("whitespace-nowrap text-[3.2rem] font-black leading-none tracking-[-0.05em] sm:text-[6rem]", light ? "text-white/[0.10]" : "text-[var(--l-ink)]/[0.06]")}>
      {rowA} {rowA}
    </ParallaxX>
    <ParallaxX from={-320} to={0} className={cn("-mt-2 whitespace-nowrap text-[3.2rem] font-black leading-none tracking-[-0.05em] sm:-mt-4 sm:text-[6rem]", light ? "outline-text-light" : "outline-text")}>
      {rowB} {rowB}
    </ParallaxX>
  </div>
);
