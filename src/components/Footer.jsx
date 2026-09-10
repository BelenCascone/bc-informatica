import React from 'react';
import { siteConfig } from '../data/content';
import { Instagram, Github, MessageCircle, ArrowUp, Terminal, Heart } from 'lucide-react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#060806] border-t border-brand-border text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-brand-border/60">
          
          {/* Brand Col */}
          <div className="md:col-span-6 flex flex-col items-start">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-display font-black text-3xl text-neon-lime">
                &lt;/BC&gt;
              </span>
              <span className="font-display font-bold text-xl text-white">
                INFORMÁTICA
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-6 font-normal">
              Soluciones informáticas para tu casa y tu empresa. Sin vueltas y en tu idioma. Paraná, Entre Ríos.
            </p>
            <div className="font-mono text-xs text-brand-lime flex items-center gap-2 bg-brand-card px-3 py-1.5 rounded border border-brand-border">
              <Terminal className="w-3.5 h-3.5" />
              <span>Belén Cascone · Analista en Sistemas</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <div className="font-mono text-xs text-brand-lime mb-4 uppercase tracking-wider">
              // NAVEGACIÓN
            </div>
            <ul className="space-y-2.5 font-mono text-sm">
              <li>
                <a href="#servicios" className="hover:text-white transition-colors">
                  01. Service Técnico
                </a>
              </li>
              <li>
                <a href="#servicios" className="hover:text-white transition-colors">
                  02. Sistemas a Medida
                </a>
              </li>
              <li>
                <a href="#servicios" className="hover:text-white transition-colors">
                  03. Clases Personalizadas
                </a>
              </li>
              <li>
                <a href="#servicios" className="hover:text-white transition-colors">
                  04. Asesoramiento
                </a>
              </li>
            </ul>
          </div>

          {/* Socials & GitHub */}
          <div className="md:col-span-3">
            <div className="font-mono text-xs text-brand-lime mb-4 uppercase tracking-wider">
              // CANALES
            </div>
            <div className="flex flex-col gap-3 font-mono text-sm">
              <a 
                href={siteConfig.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-brand-lime transition-colors"
              >
                <Instagram className="w-4 h-4 text-brand-lime" />
                <span>Instagram: {siteConfig.instagram.handle}</span>
              </a>

              <a 
                href={`https://wa.me/${siteConfig.whatsapp.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-brand-lime transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-brand-lime" />
                <span>WhatsApp Directo</span>
              </a>

              <a 
                href={siteConfig.github.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-brand-lime transition-colors"
              >
                <Github className="w-4 h-4 text-brand-lime" />
                <span>GitHub: /{siteConfig.github.user}</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <span>© {new Date().getFullYear()} BC Informática. Todos los derechos reservados.</span>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 text-gray-400 hover:text-brand-lime transition-colors p-2 rounded hover:bg-brand-card"
          >
            <span>Volver arriba</span>
            <ArrowUp className="w-4 h-4 text-brand-lime" />
          </button>
        </div>

      </div>
    </footer>
  );
}
