import React, { useState } from 'react';
import { menuCategories, getItemsByCategory } from './data/menuData';
import Model3DViewer from './components/3d/Model3DViewer';
import './App.css';
import './styles/custom.css';

/**
 * Componente principal de la aplicación
 */
function App() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [current3DModel, setCurrent3DModel] = useState(null);
  const [current3DItemName, setCurrent3DItemName] = useState('');

  // Función para manejar la selección de categoría
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedItem(null);
  };

  // Función para volver a las categorías
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedItem(null);
  };

  // Función para ver detalles de un plato
  const handleViewDetails = (item) => {
    setSelectedItem(item);
  };

  // Función para ver en AR/3D
  const handleViewAR = (item) => {
    if (item.model3d) {
      setCurrent3DModel(`/assets/models/${item.model3d}`);
      setCurrent3DItemName(item.name);
      setShow3DViewer(true);
    } else {
      alert(`El modelo 3D para ${item.name} no está disponible`);
    }
  };

  // Función para cerrar el visor 3D
  const handleClose3DViewer = () => {
    setShow3DViewer(false);
    setCurrent3DModel(null);
    setCurrent3DItemName('');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar simple */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-playfair font-bold text-neutral-950">
              The Gilded Fork
            </h1>
            <div className="hidden md:flex space-x-8">
              <a href="#home" className="text-neutral-700 hover:text-primary-500 font-poppins transition-colors duration-200">Inicio</a>
              <a href="#menu" className="text-neutral-700 hover:text-primary-500 font-poppins transition-colors duration-200">Menú</a>
              <a href="#gallery" className="text-neutral-700 hover:text-primary-500 font-poppins transition-colors duration-200">Galería</a>
              <a href="#contact" className="text-neutral-700 hover:text-primary-500 font-poppins transition-colors duration-200">Contacto</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="pt-16">
        {/* Hero Section */}
        <section id="home" className="relative min-h-screen flex items-center justify-center gradient-hero overflow-hidden">
          {/* Partículas decorativas */}
          <div className="hero-particles">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
          </div>
          
          <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in-up">
            <h1 className="hero-title text-5xl md:text-7xl font-playfair font-bold text-neutral-950 mb-6">
              The Gilded Fork
            </h1>
            <p className="hero-subtitle text-xl md:text-2xl font-poppins text-neutral-700 mb-8 leading-relaxed">
              Una experiencia culinaria donde la tradición se encuentra con la innovación.
              <br />
              <span className="text-gradient">Descubre nuestros platos únicos con tecnología de realidad aumentada.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                className="btn-primary hover-lift"
                onClick={() => document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })}
              >
                Explorar Menú
              </button>
              <button 
                className="border border-primary-500 text-primary-500 hover:bg-primary-50 font-poppins font-medium px-8 py-3 rounded-md transition-all duration-300 hover-lift"
              >
                Hacer Reservación
              </button>
            </div>
          </div>
        </section>

        {/* Menú Section */}
        <section id="menu" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Título de la sección */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-playfair font-bold text-neutral-950 mb-4">
                Nuestro Menú
              </h2>
              <p className="text-lg font-poppins text-neutral-600 max-w-2xl mx-auto">
                Explora nuestras deliciosas categorías y descubre cada plato en realidad aumentada
              </p>
            </div>

            {/* Vista de detalle de un plato específico */}
            {selectedItem && (
              <div className="mb-8">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="mb-6 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-poppins px-4 py-2 rounded-md transition-colors duration-200"
                >
                  ← Volver a {menuCategories.find(cat => cat.id === selectedCategory)?.name}
                </button>

                <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden max-w-4xl mx-auto">
                  <div className="md:flex">
                    {/* Imagen del plato */}
                    <div className="md:w-1/2 h-64 md:h-auto bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center">
                      <span className="text-8xl">
                        {menuCategories.find(cat => cat.id === selectedCategory)?.icon}
                      </span>
                    </div>

                    {/* Información detallada */}
                    <div className="md:w-1/2 p-8">
                      <h3 className="text-3xl font-playfair font-bold text-neutral-950 mb-4">
                        {selectedItem.name}
                      </h3>
                      <p className="text-lg font-poppins text-neutral-600 mb-6 leading-relaxed">
                        {selectedItem.description}
                      </p>
                      
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-poppins font-medium text-neutral-700">Precio:</span>
                          <span className="text-3xl font-playfair font-bold text-primary-600">
                            ${selectedItem.price.toFixed(2)}
                          </span>
                        </div>
                        
                        {selectedItem.allergens.length > 0 && (
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-poppins font-medium text-neutral-700">Alérgenos:</span>
                            <span className="text-sm font-poppins text-neutral-600 text-right">
                              {selectedItem.allergens.join(', ')}
                            </span>
                          </div>
                        )}

                        {selectedItem.model3d && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-poppins font-medium text-neutral-700">Vista 3D:</span>
                            <span className="text-sm font-poppins text-primary-600">Disponible</span>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-3">
                        {selectedItem.model3d && (
                          <button
                            onClick={() => handleViewAR(selectedItem)}
                            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-poppins font-medium px-6 py-3 rounded-md transition-colors duration-200 flex items-center justify-center"
                          >
                            <span className="mr-2">🥽</span>
                            Ver en AR
                          </button>
                        )}
                        <button
                          className="flex-1 border border-primary-500 text-primary-500 hover:bg-primary-50 font-poppins font-medium px-6 py-3 rounded-md transition-colors duration-200"
                        >
                          Agregar al Pedido
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navegación de categorías */}
            {!selectedCategory && !selectedItem && (
              <div className="category-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {menuCategories.map((category, index) => (
                  <div
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="category-card bg-white rounded-xl shadow-elegant hover:shadow-luxury transition-all duration-300 cursor-pointer group border border-neutral-200 hover:border-primary-300 hover-lift"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="p-8 text-center">
                      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 animate-float">
                        {category.icon}
                      </div>
                      <h3 className="text-xl font-playfair font-semibold text-neutral-950 mb-2">
                        {category.name}
                      </h3>
                      <p className="text-sm font-poppins text-neutral-600">
                        {category.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vista de platos por categoría */}
            {selectedCategory && !selectedItem && (
              <div>
                {/* Botón de regreso */}
                <button
                  onClick={handleBackToCategories}
                  className="mb-8 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-poppins px-4 py-2 rounded-md transition-colors duration-200"
                >
                  ← Volver a Categorías
                </button>

                {/* Título de la categoría */}
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-playfair font-bold text-neutral-950 mb-2">
                    {menuCategories.find(cat => cat.id === selectedCategory)?.name}
                  </h3>
                  <p className="text-lg font-poppins text-neutral-600">
                    {menuCategories.find(cat => cat.id === selectedCategory)?.description}
                  </p>
                </div>

                {/* Grid de platos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {getItemsByCategory(selectedCategory).map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-neutral-200 overflow-hidden group"
                    >
                      {/* Imagen del plato */}
                      <div className="h-48 bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <span className="text-6xl">
                          {menuCategories.find(cat => cat.id === selectedCategory)?.icon}
                        </span>
                      </div>

                      {/* Información del plato */}
                      <div className="p-6">
                        <h4 className="text-xl font-playfair font-semibold text-neutral-950 mb-2">
                          {item.name}
                        </h4>
                        <p className="text-sm font-poppins text-neutral-600 mb-4 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-playfair font-bold text-primary-600">
                            ${item.price.toFixed(2)}
                          </span>
                          {item.model3d && (
                            <span className="text-xs font-poppins text-primary-500 bg-primary-50 px-2 py-1 rounded-full">
                              3D Disponible
                            </span>
                          )}
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="flex-1 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-poppins text-sm px-3 py-2 rounded-md transition-colors duration-200 flex items-center justify-center"
                          >
                            <span className="mr-2">👁️</span>
                            Ver Detalles
                          </button>
                          {item.model3d && (
                            <button
                              onClick={() => handleViewAR(item)}
                              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-poppins text-sm px-3 py-2 rounded-md transition-colors duration-200 flex items-center justify-center"
                            >
                              <span className="mr-2">🥽</span>
                              Ver en AR
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Galería Section (placeholder) */}
        <section id="gallery" className="py-16 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-playfair font-bold text-neutral-950 mb-4">
              Galería
            </h2>
            <p className="text-lg font-poppins text-neutral-600">
              Próximamente: Galería de imágenes del restaurante
            </p>
          </div>
        </section>

        {/* Contacto Section (placeholder) */}
        <section id="contact" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-playfair font-bold text-neutral-950 mb-4">
              Contacto
            </h2>
            <p className="text-lg font-poppins text-neutral-600">
              Próximamente: Formulario de contacto y reservaciones
            </p>
          </div>
        </section>
      </main>

      {/* Footer simple */}
      <footer className="bg-neutral-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo y descripción */}
            <div>
              <h2 className="text-2xl font-playfair font-bold mb-4">The Gilded Fork</h2>
              <p className="text-neutral-300 font-poppins text-sm leading-relaxed">
                Una experiencia culinaria donde la tradición se encuentra con la innovación.
              </p>
            </div>

            {/* Información de contacto */}
            <div>
              <h3 className="text-lg font-poppins font-semibold mb-4">Contacto</h3>
              <div className="space-y-2 text-neutral-300 font-poppins text-sm">
                <p>📍 123 Main Street, Anytown, USA</p>
                <p>📞 (555) 123-4567</p>
                <p>✉️ info@thegildedfork.com</p>
              </div>
            </div>

            {/* Horarios */}
            <div>
              <h3 className="text-lg font-poppins font-semibold mb-4">Horarios</h3>
              <div className="space-y-1 text-neutral-300 font-poppins text-sm">
                <p>Lun - Jue: 11:00 AM - 10:00 PM</p>
                <p>Vie - Sáb: 11:00 AM - 11:00 PM</p>
                <p>Dom: 12:00 PM - 9:00 PM</p>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800 mt-8 pt-8 text-center">
            <p className="text-neutral-400 font-poppins text-sm">
              © 2024 The Gilded Fork. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Visor 3D */}
      <Model3DViewer
        modelPath={current3DModel}
        isOpen={show3DViewer}
        onClose={handleClose3DViewer}
        itemName={current3DItemName}
      />
    </div>
  );
}

export default App;

