import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import config from "@/lib/config";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Social Post — Premium Social Media Post Generator",
  description:
    "Generate highly optimized, engaging social media posts with AI. Adapt descriptions, hooks, and call-to-actions specifically for LinkedIn, Twitter, Facebook, and Instagram instantly.",
  keywords:
    "AI social media, post generator, LinkedIn generator, tweet generator, copywriter, digital marketing",
  openGraph: {
    title: "AI Social Post — Premium Social Media Post Generator",
    description:
      "Generate highly optimized, engaging social media posts with AI.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  const theme = config?.theme || "slate-indigo";

  return (
    <html lang="en" className="h-full w-full" data-theme={theme} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var PREFIX="__processed_";function skip(n){return n==="bis_skin_checked"||n==="bis_register"||n.indexOf(PREFIX)===0;}function strip(el){if(!el||!el.attributes)return;for(var i=el.attributes.length-1;i>=0;i--){if(skip(el.attributes[i].name))el.removeAttribute(el.attributes[i].name);}}function stripAll(root){strip(root);for(var j=0;j<root.children.length;j++)stripAll(root.children[j]);}var obs=new MutationObserver(function(rs){for(var k=0;k<rs.length;k++){var r=rs[k];if(r.type==="attributes"&&skip(r.attributeName))strip(r.target);else if(r.type==="childList")for(var c=0;c<r.addedNodes.length;c++)if(r.addedNodes[c].nodeType===1)stripAll(r.addedNodes[c]);}});obs.observe(document.documentElement,{attributes:true,childList:true,subtree:true});function cleanup(){stripAll(document.documentElement);}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",cleanup);window.addEventListener("load",cleanup);}else cleanup();})();`,
          }}
        />
        <link
          rel="icon"
          href="https://newoaks.s3.us-west-1.amazonaws.com/AutoDev/11407/5272b774-1dec-479f-9b03-bb7eeb892b80.jpg"
        />
      </head>
      <body
        className={`${inter.className} antialiased min-h-screen bg-bg-page text-primary-text flex flex-col`}
        suppressHydrationWarning
      >
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
