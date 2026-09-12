"use client";

import React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
  once?: boolean;
  as?: "div" | "section" | "li" | "span";
}

const offset = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up":
      return { y: distance };
    case "down":
      return { y: -distance };
    case "left":
      return { x: distance };
    case "right":
      return { x: -distance };
    default:
      return {};
  }
};

/**
 * Element ko'rinish maydoniga kirganda paydo bo'ladi (IntersectionObserver).
 * Faqat transform/opacity animatsiya qilinadi — GPU, layout'ga tegmaydi.
 */
const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 28,
  once = true,
  as = "div",
}) => {
  const reduce = useReducedMotion();
  const Tag = motion[as];

  if (reduce) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag
      className={cn("will-change-transform", className)}
      initial={{ opacity: 0, ...offset(direction, distance) }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;

/** Bolalar ketma-ket (stagger) paydo bo'ladigan konteyner. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] } },
};

export const Stagger: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={cn("will-change-transform", className)} variants={staggerItem}>
      {children}
    </motion.div>
  );
};
