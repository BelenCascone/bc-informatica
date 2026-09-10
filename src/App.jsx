import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import FlyerShowcase from './components/FlyerShowcase';
import InteractiveContact from './components/InteractiveContact';
import Footer from './components/Footer';

export default function App() {
  const [preselectedTopic, setPreselectedTopic] = useState(null);

  const handleSelectService = (service) => {
    setPreselectedTopic({
      id: service.id,
      title: service.title,
      label: `${service.title} (${service.punchline})`,
      text: `Hola Belén! Te escribo desde la web para consultarte por el servicio de ${service.title} (${service.punchline}).`
    });

    const contactSection = document.getElementById('contacto');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-gray-100 selection:bg-brand-lime selection:text-black">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <Services onSelectService={handleSelectService} />
        <FlyerShowcase />
        <InteractiveContact preselectedTopic={preselectedTopic} />
      </main>
      <Footer />
    </div>
  );
}
