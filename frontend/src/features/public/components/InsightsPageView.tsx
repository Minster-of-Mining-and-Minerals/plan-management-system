"use client";

import { Calendar } from "lucide-react";
import { INSIGHT_POSTS } from "@/features/public/config/pagesContent";
import { CTASection } from "./CTASection";
import { PublicPageHero } from "./PublicPageHero";

export function InsightsPageView() {
  return (
    <>
      <PublicPageHero
        eyebrow="Insights"
        title="Healthcare technology perspectives"
        description="Thought leadership on digital health, AI in medicine, and enterprise hospital transformation."
      />
      <section className="pb-20">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          {INSIGHT_POSTS.map((post) => (
            <article
              key={post.title}
              className="flex flex-col rounded-xl border border-border/60 bg-card/70 p-6 transition-colors hover:border-primary/30"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {post.date}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{post.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
              <span className="mt-4 text-sm font-semibold text-primary">Read more →</span>
            </article>
          ))}
        </div>
      </section>
      <CTASection
        title="Stay informed"
        description="Request a demo to see how NovaCure is shaping the future of connected healthcare."
      />
    </>
  );
}
