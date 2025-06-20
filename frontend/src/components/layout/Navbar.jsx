import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

/**
 * Componente Navbar - Barra de navegación superior
 * 
 * Características:
 * - Logo del restaurante a la izquierda
 * - Menú de navegación a la derecha (Inicio, Menú, Galería, Contacto)
 * - Diseño responsive con menú hamburguesa en móviles
 * - Estilo minimalista con colores personalizables
 */
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Elementos del menú de navegación
  const menuItems = [
    { name: 'Inicio', href: '#home' },
    { name: 'Menú', href: '#menu' },
    { name: 'Galería', href: '#gallery' },
    { name: 'Contacto', href: '#contact' }
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo del restaurante */}
          <div className="flex-shrink-0">
            <a href="#home" className="flex items-center">
              <h1 className="text-2xl font-playfair font-bold text-neutral-950">
                Restaurante
              </h1>
            </a>
          </div>

          {/* Menú de navegación - Desktop */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {menuItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-neutral-700 hover:text-primary-500 px-3 py-2 text-sm font-poppins font-medium transition-colors duration-200 relative group"
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </div>
          </div>

          {/* Botón menú hamburguesa - Mobile */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-700 hover:text-primary-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors duration-200"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-neutral-200">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-neutral-700 hover:text-primary-500 hover:bg-neutral-50 block px-3 py-2 text-base font-poppins font-medium transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

