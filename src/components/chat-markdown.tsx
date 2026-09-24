import React from "react";
import Markdown from "react-markdown";

// Model output is untrusted: no HTML, images, embeds or navigable links.
export function ChatMarkdown({ text }: { text: string }) {
  return <div className="chat-markdown"><Markdown skipHtml unwrapDisallowed
    allowedElements={["p", "strong", "em", "ul", "ol", "li", "code", "pre", "blockquote", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6"]}
    components={{ h1: "h4", h2: "h4", h3: "h4", h4: "h4", h5: "h4", h6: "h4" }}
  >{text}</Markdown></div>;
}
