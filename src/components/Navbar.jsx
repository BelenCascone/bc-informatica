import React, { useState, useEffect } from 'react';
import { siteConfig } from '../data/content';
import { MessageSquareCode, Menu, X, Send } from 'lucide-react';

export default function Navbar({ onSelectTopic }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const whatsappUrl = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(siteConfig.whatsapp.defaultMessage)}`;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-brand-dark/90 backdrop-blur-md border-b border-brand-border py-3 shadow-lg' 
        : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="flex items-center gap-1 font-display font-extrabold text-2xl tracking-tighter">
            <span className="text-brand-lime group-hover:scale-105 transition-transform inline-block">
              &lt;/BC&gt;
            </span>
            <span className="text-white text-xl tracking-tight hidden sm:inline">
              INFORMÁTICA
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-brand-lime/10 border border-brand-lime/30 text-brand-lime font-mono hidden md:inline-block">
            // Paraná · E.R.
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-sm">
          <a 
            href="#servicios" 
            className="text-gray-300 hover:text-brand-lime transition-colors flex items-center gap-1.5"
          >
            <span className="text-brand-lime/60">//</span> Servicios
          </a>
          <a 
            href="#quien-soy" 
            className="text-gray-300 hover:text-brand-lime transition-colors flex items-center gap-1.5"
          >
            <span className="text-brand-lime/60">//</span> Quién Soy
          </a>
          <a 
            href="#flyers" 
            className="text-gray-300 hover:text-brand-lime transition-colors flex items-center gap-1.5"
          >
            <span className="text-brand-lime/60">//</span> Galería
          </a>
          <a 
            href="#contacto" 
            className="text-gray-300 hover:text-brand-lime transition-colors flex items-center gap-1.5"
          >
            <span className="text-brand-lime/60">//</span> Contacto
          </a>
        </nav>

        {/* WhatsApp Fast CTA */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-lime text-black font-semibold px-4 py-2 rounded-md hover:bg-brand-lime-light transition-all shadow-lime-sm hover:shadow-lime-glow text-sm"
          >
            <Send className="w-4 h-4" />
            <span>Consultar por WhatsApp</span>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-brand-lime text-black rounded-md"
            aria-label="WhatsApp"
          >
            <Send className="w-4 h-4" />
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-brand-card border-b border-brand-border px-6 py-5 flex flex-col gap-4 font-mono text-sm">
          <a 
            href="#servicios" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-gray-300 hover:text-brand-lime py-1"
          >
            // 01. Servicios
          </a>
          <a 
            href="#quien-soy" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-gray-300 hover:text-brand-lime py-1"
          >
            // 02. Quién Soy (Belén)
          </a>
          <a 
            href="#flyers" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-gray-300 hover:text-brand-lime py-1"
          >
            // 03. Galería de Flyers
          </a>
          <a 
            href="#contacto" 
            onClick={() => setMobileMenuOpen(false)} 
            className="text-gray-300 hover:text-brand-lime py-1"
          >
            // 04. Contame qué necesitás
          </a>
        </div>
      )}
    </header>
  );
}
