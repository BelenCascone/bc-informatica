import React from 'react';
import { siteConfig } from '../data/content';
import { UserCheck, Sparkles, MessageSquare, Wrench, ShieldCheck, MapPin } from 'lucide-react';

export default function About() {
  return (
    <section id="quien-soy" className="py-24 relative bg-[#090c0a] border-t border-brand-border/60">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Tag */}
        <div className="flex items-center justify-between mb-8 border-b border-brand-border/40 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand-card border border-brand-lime/30 text-brand-lime font-mono text-xs tracking-wider">
            // QUIÉN_SOY
          </div>
          <span className="font-mono text-xs text-brand-lime font-semibold">
            [02/04]
          </span>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Bio & Presentation */}
          <div className="lg:col-span-7">
            <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight uppercase mb-2">
              HOLA, SOY <span className="text-brand-lime">BELÉN</span>
            </h2>
            <div className="font-mono text-brand-lime tracking-widest text-lg sm:text-xl font-bold uppercase mb-6">
              ANALISTA EN SISTEMAS
            </div>

            <p className="text-xl sm:text-2xl text-gray-200 leading-relaxed font-normal mb-8">
              Detrás de <span className="font-semibold text-white">BC Informática</span> hay una persona, no un call center. Arreglo, enseño, asesoro y desarrollo sistemas hechos a la medida de cómo trabaja cada cliente.
            </p>

            {/* Badges / Info */}
            <div className="flex flex-wrap gap-4 font-mono text-xs text-gray-300 mb-8">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-brand-card border border-brand-border">
                <MapPin className="w-4 h-4 text-brand-lime" />
                <span>Paraná, Entre Ríos</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-brand-card border border-brand-border">
                <UserCheck className="w-4 h-4 text-brand-lime" />
                <span>Trato directo sin intermediarios</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-brand-card border border-brand-border">
                <ShieldCheck className="w-4 h-4 text-brand-lime" />
                <span>Garantía y seguimiento</span>
              </div>
            </div>

          </div>

          {/* Right: Method Pill Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            <div className="text-xs font-mono text-gray-400 mb-1 flex items-center justify-between">
              <span>// MI MÉTODO DE TRABAJO</span>
              <span className="text-brand-lime">@bc.informatica</span>
            </div>

            {/* Pillar 1 */}
            <div className="p-5 rounded-xl bg-brand-card border border-brand-border hover:border-brand-lime/60 transition-all group">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-brand-lime/10 text-brand-lime group-hover:bg-brand-lime group-hover:text-black transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-xs text-brand-lime block mb-1">metodo.explicar =</span>
                  <h3 className="font-display font-bold text-lg text-white mb-1">
                    "Sin tecnicismos"
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Te explico qué tiene tu equipo o cómo usar tu sistema en tu idioma cotidiano, sin rodeos ni palabras complicadas.
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 rounded-xl bg-brand-card border border-brand-border hover:border-brand-lime/60 transition-all group">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-brand-lime/10 text-brand-lime group-hover:bg-brand-lime group-hover:text-black transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-xs text-brand-lime block mb-1">metodo.responder =</span>
                  <h3 className="font-display font-bold text-lg text-white mb-1">
                    "Rápido"
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Atención ágil por WhatsApp. Sé lo importante que es tu computadora o sistema para tu trabajo diario.
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-xl bg-brand-card border border-brand-border hover:border-brand-lime/60 transition-all group">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-brand-lime/10 text-brand-lime group-hover:bg-brand-lime group-hover:text-black transition-colors">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-xs text-brand-lime block mb-1">metodo.resolver =</span>
                  <h3 className="font-display font-bold text-lg text-white mb-1">
                    "De verdad"
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Diagnósticos precisos y soluciones definitivas de raíz, sin parches momentáneos ni sorpresas en la cuenta.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
