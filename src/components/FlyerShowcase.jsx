import React, { useState } from 'react';
import { carouselSlides } from '../data/content';
import { ChevronLeft, ChevronRight, Maximize2, X, Eye } from 'lucide-react';

export default function FlyerShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalImage, setModalImage] = useState(null);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? carouselSlides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
  };

  return (
    <section id="flyers" className="py-24 relative bg-[#0a0d0b] border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 border-b border-brand-border/40 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand-card border border-brand-lime/30 text-brand-lime font-mono text-xs mb-3 tracking-wider">
              // IDENTIDAD_VISUAL
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase">
              POSTS & <span className="text-brand-lime">CARRUSEL OFICIAL</span>
            </h2>
          </div>
          <p className="font-mono text-xs sm:text-sm text-gray-400 max-w-md">
            Deslizá para ver las piezas gráficas oficiales diseñadas para redes y la presentación de marca.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-3xl mx-auto">
          
          {/* Main Display Slide */}
          <div className="relative rounded-2xl overflow-hidden border border-brand-border bg-brand-card shadow-2xl aspect-[4/5] sm:aspect-[1/1] max-h-[600px] flex items-center justify-center group">
            
            <img 
              src={carouselSlides[currentIndex].src} 
              alt={carouselSlides[currentIndex].title}
              className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-[1.01]"
            />

            {/* Quick zoom button */}
            <button
              onClick={() => setModalImage(carouselSlides[currentIndex])}
              className="absolute bottom-4 right-4 bg-black/80 hover:bg-black text-brand-lime p-2.5 rounded-lg border border-brand-lime/30 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Ver en grande"
            >
              <Maximize2 className="w-5 h-5" />
            </button>

            {/* Slide Index Badge */}
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded-md border border-brand-border font-mono text-xs text-brand-lime">
              [{String(currentIndex + 1).padStart(2, '0')}/{String(carouselSlides.length).padStart(2, '0')}] {carouselSlides[currentIndex].title}
            </div>

            {/* Nav Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:text-brand-lime border border-brand-border hover:border-brand-lime transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:text-brand-lime border border-brand-border hover:border-brand-lime transition-all"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Thumbnails Row */}
          <div className="flex gap-2.5 mt-6 overflow-x-auto pb-2 justify-center">
            {carouselSlides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(index)}
                className={`relative rounded-lg overflow-hidden flex-shrink-0 w-14 h-16 border-2 transition-all ${
                  currentIndex === index
                    ? 'border-brand-lime scale-105 shadow-lime-sm'
                    : 'border-brand-border/60 opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={slide.src} 
                  alt={slide.title}
                  className="w-full h-full object-cover" 
                />
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Fullscreen Lightbox Modal */}
      {modalImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setModalImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-brand-lime font-mono text-sm flex items-center gap-1"
            >
              <X className="w-6 h-6" />
              <span>Cerrar</span>
            </button>
            <img 
              src={modalImage.src} 
              alt={modalImage.title}
              className="max-h-[85vh] w-auto object-contain rounded-xl border border-brand-border"
            />
          </div>
        </div>
      )}
    </section>
  );
}
