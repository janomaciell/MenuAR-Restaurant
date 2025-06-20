import React from 'react';
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from 'lucide-react';

/**
 * Componente Footer - Pie de página
 * 
 * Características:
 * - Información de contacto (dirección, teléfono, email)
 * - Enlaces a redes sociales
 * - Derechos reservados
 * - Diseño responsive y elegante
 * - Colores personalizables
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Información de contacto (personalizable)
  const contactInfo = {
    address: "123 Main Street, Anytown, USA",
    phone: "(555) 123-4567",
    email: "info@thegildedfork.com"
  };

  // Enlaces de redes sociales (personalizables)
  const socialLinks = [
    { name: 'Instagram', icon: Instagram, href: '#', color: 'hover:text-pink-500' },
    { name: 'Facebook', icon: Facebook, href: '#', color: 'hover:text-blue-600' },
    { name: 'Twitter', icon: Twitter, href: '#', color: 'hover:text-blue-400' }
  ];

  return (
    <footer className="bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Logo y descripción */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-playfair font-bold text-white mb-4">
              Restaurante
            </h2>
            <p className="text-neutral-300 font-poppins text-sm leading-relaxed max-w-md">
              Una experiencia culinaria donde la tradición se encuentra con la innovación. 
              Descubre nuestros platos únicos con tecnología de realidad aumentada.
            </p>
          </div>

          {/* Información de contacto */}
          <div>
            <h3 className="text-lg font-poppins font-semibold text-white mb-4">
              Contacto
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-primary-500 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-300 font-poppins text-sm">
                  {contactInfo.address}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary-500 flex-shrink-0" />
                <a 
                  href={`tel:${contactInfo.phone}`}
                  className="text-neutral-300 hover:text-primary-500 font-poppins text-sm transition-colors duration-200"
                >
                  {contactInfo.phone}
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-500 flex-shrink-0" />
                <a 
                  href={`mailto:${contactInfo.email}`}
                  className="text-neutral-300 hover:text-primary-500 font-poppins text-sm transition-colors duration-200"
                >
                  {contactInfo.email}
                </a>
              </div>
            </div>
          </div>

          {/* Redes sociales */}
          <div>
            <h3 className="text-lg font-poppins font-semibold text-white mb-4">
              Síguenos
            </h3>
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className={`text-neutral-400 ${social.color} transition-colors duration-200 p-2 rounded-full hover:bg-neutral-800`}
                    aria-label={`Seguir en ${social.name}`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
            
            {/* Horarios de atención */}
            <div className="mt-6">
              <h4 className="text-sm font-poppins font-medium text-white mb-2">
                Horarios
              </h4>
              <div className="text-neutral-300 font-poppins text-sm space-y-1">
                <p>Lun - Jue: 11:00 AM - 10:00 PM</p>
                <p>Vie - Sáb: 11:00 AM - 11:00 PM</p>
                <p>Dom: 12:00 PM - 9:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-neutral-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            
            {/* Derechos reservados */}
            <p className="text-neutral-400 font-poppins text-sm">
              © {currentYear} Restaurante. Todos los derechos reservados.
            </p>

            {/* Enlaces legales */}
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a 
                href="#privacy" 
                className="text-neutral-400 hover:text-primary-500 font-poppins text-sm transition-colors duration-200"
              >
                Política de Privacidad
              </a>
              <a 
                href="#terms" 
                className="text-neutral-400 hover:text-primary-500 font-poppins text-sm transition-colors duration-200"
              >
                Términos de Servicio
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

