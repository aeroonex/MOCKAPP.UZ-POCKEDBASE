"use client";

import React from "react";
import { motion } from "framer-motion";
import { Globe, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const TrustSection: React.FC = () => {
  const { t } = useTranslation();

  const items = [
    {
      Icon: ShieldCheck,
      title: t("landing_page.trust_section.guaranteed_title"),
      desc: t("landing_page.trust_section.guaranteed_desc"),
    },
    {
      Icon: Users,
      title: t("landing_page.trust_section.collaborative_title"),
      desc: t("landing_page.trust_section.collaborative_desc"),
    },
    {
      Icon: Globe,
      title: t("landing_page.trust_section.localized_title"),
      desc: t("landing_page.trust_section.localized_desc"),
    },
  ];

  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 text-foreground shadow-2xl dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/30 dark:text-white">
        {/* decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.18) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        {/* subtle glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px] dark:bg-emerald-500/20" />

        <div className="relative px-5 py-10 sm:px-8 sm:py-12">
          <div className="grid items-center gap-8 lg:grid-cols-1">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                {t("landing_page.trust_section.title_line1")} <br />
                <span className="text-primary">{t("landing_page.trust_section.title_line2")}</span>
              </h2>

              <div className="mt-6 space-y-4">
                {items.map(({ Icon, title, desc }, i) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="flex gap-3"
                  >
                    <div className="shrink-0 rounded-2xl bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold sm:text-base">{title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="relative"
            >
              <div className="absolute -inset-10 rounded-full bg-primary/10 blur-[100px] dark:bg-emerald-500/15" />

              <div className="relative overflow-hidden rounded-[2.25rem] border border-border/60 bg-background/60 p-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <img
                  src="https://av.sc.com/corp-en/nr/content/images/Uzbekistan-skyline-insights-article-in-text.jpg"
                  alt={t("landing_page.trust_section.image_alt")}
                  className="aspect-[16/10] w-full rounded-[1.9rem] bg-black/5 object-cover shadow-2xl dark:bg-black/20"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;