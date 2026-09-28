"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getRelatedTools } from "@/lib/tool-catalog";

export function RelatedTools() {
  const pathname = usePathname();
  if (!pathname || !pathname.startsWith("/tools/")) return null;

  const slug = pathname.replace("/tools/", "").replace(/\/$/, "");
  const tools = getRelatedTools(slug);

  if (tools.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-12">
      <div className="relative border-t border-border pt-10">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <ArrowRight size={16} className="text-primary" />
            </span>
            Related Tools
          </h2>
          <Link
            href="/tools"
            className="group text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            All Tools
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Tool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.slice(0, 4).map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                className="group relative p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${tool.color}`}>
                  <Icon size={20} />
                </div>
                {/* Text */}
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors mb-1">
                  {tool.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
                {/* Arrow indicator */}
                <ArrowRight
                  size={14}
                  className="absolute top-5 right-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
