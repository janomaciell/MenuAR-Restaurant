import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Componente Layout - Estructura principal de la aplicación
 * 
 * Características:
 * - Incluye Navbar fijo en la parte superior
 * - Contenido principal con padding apropiado
 * - Footer en la parte inferior
 * - Estructura responsive
 */
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar fijo */}
      <Navbar />
      
      {/* Contenido principal */}
      <main className="flex-grow pt-16">
        {children}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;

