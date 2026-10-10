// -----------------------------------------------------------------------------
// Article Link Card
//
// A card linking to an external language-learning article, with a cover image,
// source, title and short description. Opens in a new tab.
//
// Used by: LearningHub
// -----------------------------------------------------------------------------

import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export type ArticleLink = {
  title: string;
  source: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  accentClassName: string;
  icon: ReactNode;
};

type ArticleLinkCardProps = {
  article: ArticleLink;
};

export default function ArticleLinkCard({ article }: ArticleLinkCardProps) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-32 w-full overflow-hidden">
        <img
          src={article.image}
          alt={article.imageAlt}
          className="block h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span
          className={`absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white ${article.accentClassName}`}
        >
          {article.icon}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {article.source}
        </p>
        <h3 className="mt-1.5 text-sm font-bold leading-snug text-slate-900">{article.title}</h3>
        <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">{article.description}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-700">
          Read more
          <ArrowUpRight
            size={14}
            className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>
    </a>
  );
}
