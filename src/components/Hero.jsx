import React, { useState } from 'react';
import { siteConfig, methodCode } from '../data/content';
import { Terminal, Send, ArrowRight, CheckCircle2, Copy, Check } from 'lucide-react';

export default function Hero() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  const copyCode = () => {
    navigator.clipboard.writeText(methodCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(siteConfig.whatsapp.defaultMessage)}`;

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden tech-grid-bg">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-lime/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Flyer Style Card Presentation */}
          <div className="lg:col-span-7 flex flex-col items-start">
            
            {/* Tag // PRESENTACIÓN */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-brand-card/80 border border-brand-lime/40 text-brand-lime font-mono text-xs mb-8 tracking-wider">
              <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse"></span>
              // PRESENTACIÓN
            </div>

            {/* Main Brand Logo & Title */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <span className="font-display font-black text-6xl sm:text-7xl md:text-8xl text-neon-lime tracking-tighter">
                  &lt;/BC&gt;
                </span>
              </div>
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-white tracking-tight mt-1">
                INFORMÁTICA
              </h1>
            </div>

            <div className="w-16 h-1 bg-brand-lime mb-8" />

            {/* Tagline & Subtagline */}
            <p className="text-xl sm:text-2xl text-gray-200 font-light leading-relaxed mb-3">
              Soluciones informáticas para tu casa y tu empresa.
            </p>
            <p className="text-xl sm:text-2xl font-mono text-brand-lime font-medium mb-8">
              Sin vueltas y en tu idioma.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 items-center mb-10">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-brand-lime hover:bg-brand-lime-light text-black font-display font-bold px-7 py-3.5 rounded-lg transition-all shadow-lime-sm hover:shadow-lime-glow group text-base"
              >
                <span>Hablemos por WhatsApp</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#servicios"
                className="inline-flex items-center gap-2 border border-brand-border hover:border-brand-lime/50 bg-brand-card/50 hover:bg-brand-card px-6 py-3.5 rounded-lg text-gray-300 hover:text-white font-mono text-sm transition-all"
              >
                <Terminal className="w-4 h-4 text-brand-lime" />
                <span>Explorar Servicios [04]</span>
              </a>
            </div>

            {/* Location footer from slide [01/04] */}
            <div className="w-full pt-6 border-t border-brand-border/60 flex items-center justify-between font-mono text-xs text-gray-400">
              <span className="tracking-widest uppercase text-gray-300">
                PARANÁ · ENTRE RÍOS
              </span>
              <span className="text-brand-lime font-bold">
                [01/04]
              </span>
            </div>

          </div>

          {/* Right Column: Interactive Code Terminal */}
          <div className="lg:col-span-5">
            <div className="relative rounded-xl bg-brand-card border border-brand-border shadow-2xl overflow-hidden">
              
              {/* Terminal Window Header */}
              <div className="bg-[#161c18] px-4 py-3 border-b border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-brand-lime inline-block shadow-lime-sm"></span>
                  <span className="ml-2 font-mono text-xs text-gray-400">~/bc-informatica/about.ts</span>
                </div>
                <button
                  onClick={copyCode}
                  className="text-gray-400 hover:text-brand-lime transition-colors p-1"
                  title="Copiar código"
                >
                  {copied ? <Check className="w-4 h-4 text-brand-lime" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Terminal Tabs */}
              <div className="flex border-b border-brand-border/50 bg-[#0d120f] text-xs font-mono">
                <button
                  onClick={() => setActiveTab('about')}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    activeTab === 'about'
                      ? 'border-brand-lime text-brand-lime bg-brand-card/40'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  about.ts
                </button>
                <button
                  onClick={() => setActiveTab('commit')}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    activeTab === 'commit'
                      ? 'border-brand-lime text-brand-lime bg-brand-card/40'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  git-status.sh
                </button>
              </div>

              {/* Code Content */}
              <div className="p-6 font-mono text-sm sm:text-base leading-relaxed overflow-x-auto bg-[#0d120f]">
                {activeTab === 'about' ? (
                  <pre className="text-gray-300">
                    <span className="text-gray-500">01 </span><span className="text-brand-lime">// lo que me importa</span>{'\n'}
                    <span className="text-gray-500">02 </span><span className="text-purple-400">const</span> <span className="text-blue-300">metodo</span> = {'{\n'}
                    <span className="text-gray-500">03 </span>  explicar: <span className="text-lime-300 font-semibold">"sin tecnicismos"</span>,{'\n'}
                    <span className="text-gray-500">04 </span>  responder: <span className="text-lime-300 font-semibold">"rápido"</span>,{'\n'}
                    <span className="text-gray-500">05 </span>  resolver: <span className="text-lime-300 font-semibold">"de verdad"</span>{'\n'}
                    <span className="text-gray-500">06 </span>{'};'}
                  </pre>
                ) : (
                  <pre className="text-gray-300">
                    <span className="text-brand-lime">$</span> git status{'\n'}
                    <span className="text-gray-400">On branch main</span>{'\n'}
                    <span className="text-gray-400">Changes to be committed:</span>{'\n'}
                    <span className="text-lime-400">  new file:   servicio-tecnico.ts</span>{'\n'}
                    <span className="text-lime-400">  new file:   sistemas-a-medida.ts</span>{'\n'}
                    <span className="text-lime-400">  new file:   clases-ia-y-pc.ts</span>{'\n'}
                    <span className="text-brand-lime">$</span> git commit -m <span className="text-lime-300">"guardá este post"</span>{'\n'}
                    <span className="text-brand-lime">[main 7d676a0] guardá este post</span>{'\n'}
                    <span className="text-gray-400">Ready to assist: Paraná & Online</span>
                  </pre>
                )}
              </div>

              {/* Terminal status bar */}
              <div className="bg-[#121814] px-4 py-2 border-t border-brand-border flex items-center justify-between text-xs font-mono text-gray-400">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-lime" />
                  Belén · Analista en Sistemas
                </span>
                <span className="text-brand-lime">TypeScript / UTF-8</span>
              </div>

            </div>

            {/* Quick highlight cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-brand-card border border-brand-border/70 text-left">
                <div className="font-mono text-xs text-brand-lime">// Diagnóstico</div>
                <div className="text-sm font-semibold text-white mt-0.5">Antes de cobrarte nada</div>
              </div>
              <div className="p-3 rounded-lg bg-brand-card border border-brand-border/70 text-left">
                <div className="font-mono text-xs text-brand-lime">// Atención</div>
                <div className="text-sm font-semibold text-white mt-0.5">Directa y personalizada</div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
