import React, { useState } from 'react';
import { siteConfig } from '../data/content';
import { Send, Instagram, MessageCircle, Check, Terminal, Sparkles } from 'lucide-react';

const defaultTopics = [
  { id: 'tecnico', label: 'Service Técnico (PC / Notebook)', text: 'Hola Belén! Mi computadora anda lenta / necesita reparación y me gustaría pedirte presupuesto o diagnóstico.' },
  { id: 'sistemas', label: 'Sistema a Medida para mi Negocio', text: 'Hola Belén! Me interesa desarrollar un software / sistema a medida para organizar mi negocio (ventas, stock, turnos).' },
  { id: 'clases', label: 'Clases Personalizadas', text: 'Hola Belén! Quisiera consultar por clases particulares de computación / tecnología / IA.' },
  { id: 'asesoramiento', label: 'Asesoramiento Técnico', text: 'Hola Belén! Necesito asesoramiento para comprar un equipo / ordenar la tecnología de mi proyecto.' },
  { id: 'otro', label: 'Otra Consulta', text: 'Hola Belén! Te contacto desde la web de BC Informática para hacerte una consulta general.' },
];

export default function InteractiveContact({ preselectedTopic }) {
  const [selectedTopic, setSelectedTopic] = useState(preselectedTopic || defaultTopics[0]);
  const [customNote, setCustomNote] = useState('');

  // Update if prop changes
  React.useEffect(() => {
    if (preselectedTopic) {
      const match = defaultTopics.find(t => t.id === preselectedTopic.id || t.label.includes(preselectedTopic.title));
      if (match) setSelectedTopic(match);
    }
  }, [preselectedTopic]);

  const fullMessage = customNote 
    ? `${selectedTopic.text}\n\nDetalle adicional: ${customNote}`
    : selectedTopic.text;

  const whatsappUrl = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(fullMessage)}`;

  return (
    <section id="contacto" className="py-24 relative bg-[#090c0a] border-t border-brand-border">
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Tag */}
        <div className="flex items-center justify-between mb-8 border-b border-brand-border/40 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand-card border border-brand-lime/30 text-brand-lime font-mono text-xs tracking-wider">
            // HABLEMOS
          </div>
          <span className="font-mono text-xs text-brand-lime font-semibold">
            [04/04]
          </span>
        </div>

        {/* Title & Subtitle from slide */}
        <div className="mb-12">
          <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl text-white tracking-tight uppercase mb-4">
            CONTAME <span className="text-brand-lime">QUÉ NECESITÁS</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 font-normal max-w-2xl leading-relaxed">
            Escribime por WhatsApp o DM de Instagram y lo vemos juntas. <span className="text-brand-lime font-medium">La primera consulta no te cuesta nada.</span>
          </p>
        </div>

        {/* Interactive Message Builder */}
        <div className="rounded-2xl bg-brand-card border border-brand-border p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          
          <div className="font-mono text-xs text-gray-400 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-lime" />
            <span>Seleccioná el motivo de tu consulta para armar tu mensaje:</span>
          </div>

          {/* Topic Pills */}
          <div className="flex flex-wrap gap-2.5 mb-6">
            {defaultTopics.map((topic) => {
              const active = selectedTopic.id === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={`font-mono text-xs px-3.5 py-2 rounded-lg transition-all text-left flex items-center gap-2 ${
                    active
                      ? 'bg-brand-lime text-black font-bold shadow-lime-sm'
                      : 'bg-[#141b16] text-gray-300 border border-brand-border hover:border-brand-lime/50'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  <span>{topic.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Note Input */}
          <div className="mb-6">
            <label className="block font-mono text-xs text-gray-400 mb-2">
              // Detalle o descripción rápida (opcional):
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ej: Tengo una notebook Lenovo que calienta mucho / Necesito controlar el stock de mi tienda..."
              rows={3}
              className="w-full bg-[#0b0f0c] border border-brand-border rounded-lg p-3.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-lime transition-colors font-mono"
            />
          </div>

          {/* Message Preview Box */}
          <div className="mb-8 p-4 rounded-lg bg-[#0b0f0c] border border-brand-border/60">
            <div className="text-xs font-mono text-gray-400 mb-2 flex items-center justify-between">
              <span>Vista previa del mensaje a enviar:</span>
              <span className="text-brand-lime">WhatsApp Directo</span>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap font-sans italic bg-brand-card/40 p-3 rounded border border-brand-border/40">
              "{fullMessage}"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-3 bg-brand-lime hover:bg-brand-lime-light text-black font-display font-bold px-6 py-4 rounded-xl transition-all shadow-lime-sm hover:shadow-lime-glow text-base group"
            >
              <MessageCircle className="w-5 h-5 fill-black" />
              <span>Enviar consulta por WhatsApp</span>
            </a>

            <a
              href={siteConfig.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-brand-border hover:border-brand-lime/50 bg-[#121814] hover:bg-[#18201b] px-6 py-4 rounded-xl text-gray-200 font-mono text-sm transition-all"
            >
              <Instagram className="w-5 h-5 text-brand-lime" />
              <span>Mandame un DM en Instagram</span>
            </a>
          </div>

          {/* Terminal Commit Box like flyer [04/04] */}
          <div className="mt-8 pt-6 border-t border-brand-border/50">
            <div className="rounded-lg bg-[#0d120f] border border-brand-border/60 p-3 font-mono text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Terminal className="w-4 h-4 text-brand-lime" />
                <span>~/bc-informatica</span>
                <span className="text-brand-lime">$ git commit -m "guardá este post"</span>
              </div>
              <span className="text-gray-400 hidden sm:inline">[04/04]</span>
            </div>
          </div>

        </div>

        {/* Footer note */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-gray-400 gap-2">
          <span>{siteConfig.instagram.handle} · PARANÁ, E.R.</span>
          <span className="text-brand-lime">{siteConfig.coverage}</span>
        </div>

      </div>
    </section>
  );
}
