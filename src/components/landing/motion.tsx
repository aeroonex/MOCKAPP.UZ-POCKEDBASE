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
