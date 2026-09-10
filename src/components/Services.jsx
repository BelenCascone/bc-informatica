import React from 'react';
import { services, siteConfig } from '../data/content';
import { Play, ArrowUpRight, Check, Laptop, Code2, GraduationCap, Compass } from 'lucide-react';

const serviceIcons = {
  'service-tecnico': Laptop,
  'sistemas-a-medida': Code2,
  'clases-personalizadas': GraduationCap,
  'asesoramiento-tecnico': Compass
};

export default function Services({ onSelectService }) {
  return (
    <section id="servicios" className="py-24 relative tech-grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 border-b border-brand-border/40 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand-card border border-brand-lime/30 text-brand-lime font-mono text-xs mb-3 tracking-wider">
              // SERVICIOS
            </div>
            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl text-white tracking-tight">
              LO QUE HAGO
            </h2>
          </div>
          <div className="font-mono text-xs sm:text-sm text-gray-400">
            <span className="text-brand-lime font-semibold">PRESENCIAL Y A DISTANCIA</span>
            <span className="ml-3 text-brand-lime">[03/04]</span>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service) => {
            const Icon = serviceIcons[service.id] || Laptop;
            const isCream = service.theme === 'cream';

            return (
              <div 
                key={service.id}
                className={`relative rounded-2xl p-7 sm:p-9 transition-all duration-300 flex flex-col justify-between overflow-hidden group border ${
                  isCream
                    ? 'cream-grid-bg text-[#122016] border-[#cfcdbe] shadow-xl hover:-translate-y-1'
                    : 'bg-brand-card/90 tech-grid-bg text-gray-200 border-brand-border hover:border-brand-lime/60 shadow-xl hover:-translate-y-1'
                }`}
              >
                {/* Giant background number like in the flyers */}
                <div className={`absolute top-4 right-6 font-display font-black text-7xl sm:text-8xl select-none pointer-events-none opacity-20 sm:opacity-25 transition-transform group-hover:scale-105 ${
                  isCream ? 'text-[#1c3022]' : 'text-brand-lime'
                }`}>
                  {service.num}
                </div>

                <div>
                  {/* Tag and icon */}
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <span className={`font-mono text-xs tracking-widest px-2.5 py-1 rounded ${
                      isCream 
                        ? 'bg-[#18281d] text-[#f4f3ea]' 
                        : 'bg-brand-dark border border-brand-lime/30 text-brand-lime'
                    }`}>
                      {service.tag}
                    </span>
                    <div className={`p-2 rounded-lg ${
                      isCream ? 'bg-[#18281d] text-[#c8ff00]' : 'bg-brand-lime/10 text-brand-lime'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title & Punchline */}
                  <h3 className={`font-display font-black text-2xl sm:text-3xl uppercase tracking-tight mb-2 ${
                    isCream ? 'text-[#0f1d14]' : 'text-white'
                  }`}>
                    {service.title}
                  </h3>

                  <div className={`w-12 h-1 mb-4 ${
                    isCream ? 'bg-[#1b3122]' : 'bg-brand-lime'
                  }`} />

                  {/* Description */}
                  <p className={`text-sm sm:text-base mb-6 ${
                    isCream ? 'text-[#2a3c2f]' : 'text-gray-400'
                  }`}>
                    {service.description}
                  </p>

                  {/* Bullet Points */}
                  <ul className="space-y-3 mb-8">
                    {service.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm sm:text-base">
                        <span className={`mt-1 font-mono text-xs ${
                          isCream ? 'text-[#18281d]' : 'text-brand-lime'
                        }`}>
                          ▶
                        </span>
                        <span className={isCream ? 'text-[#142017] font-medium' : 'text-gray-300'}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer of Card with CTA */}
                <div className={`pt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 ${
                  isCream ? 'border-[#cfcdbe]' : 'border-brand-border/60'
                }`}>
                  <span className={`font-mono text-xs tracking-wider uppercase font-semibold ${
                    isCream ? 'text-[#284030]' : 'text-brand-lime'
                  }`}>
                    {service.punchline}
                  </span>

                  <button
                    onClick={() => onSelectService(service)}
                    className={`inline-flex items-center justify-center gap-2 font-mono text-xs font-bold px-4 py-2 rounded transition-all ${
                      isCream
                        ? 'bg-[#132318] text-[#f4f3ea] hover:bg-black'
                        : 'bg-brand-lime text-black hover:bg-brand-lime-light shadow-lime-sm'
                    }`}
                  >
                    <span>Consultar</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
