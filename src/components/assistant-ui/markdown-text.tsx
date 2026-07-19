"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md max-w-none leading-7 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_ol]:my-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_ul]:my-4 [&_ul]:ml-6 [&_ul]:list-disc"
    />
  );
}
