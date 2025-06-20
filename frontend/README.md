# The Gilded Fork - Menú AR Interactivo

Este proyecto es una aplicación web moderna y profesional para un restaurante, construida con React y Vite, que incorpora visualización 3D de platos de comida utilizando Three.js y React Three Fiber. El diseño es minimalista, elegante y completamente responsive, adaptándose a diferentes dispositivos.

## Características Principales ✨

-   **Estilo Visual Moderno y Atractivo**: Estética minimalista con una paleta de colores elegante (negro, blanco, beige, dorado, grises suaves).
-   **Navegación Intuitiva**: Navbar superior con logo y secciones (Inicio, Menú, Galería, Contacto) y un footer completo con redes sociales, dirección, contacto y derechos reservados.
-   **Menú Interactivo por Categorías**: Visualización de categorías de platos (bebidas, carnes, pastas, etc.) y al seleccionar una categoría, se muestran los platos correspondientes.
-   **Visualización 3D/AR de Platos**: Cada plato incluye opciones para "Ver detalles" y "Ver en AR", permitiendo visualizar modelos 3D de los platos como si estuvieran sobre una mesa. Utiliza Three.js y React Three Fiber para la renderización 3D.
-   **Tecnologías Modernas**: Desarrollado con React + Vite para un rendimiento óptimo y estilizado con Tailwind CSS y CSS personalizado para una fácil personalización.
-   **Diseño Responsive**: La aplicación es completamente adaptable a dispositivos móviles y tablets, asegurando una excelente experiencia de usuario en cualquier pantalla.
-   **Fuentes Elegantes**: Integración de fuentes de Google Fonts (Playfair Display y Poppins) para una tipografía sofisticada.
-   **Código Comentado y Modular**: La estructura del código está bien organizada y extensamente comentada para facilitar la comprensión y futuras modificaciones.

## Estructura del Proyecto 📂

```
restaurant-ar-web/
├── public/
├── src/
│   ├── assets/             # Modelos 3D (GLB) y otros assets
│   │   └── models/         # Aquí se encuentran los modelos 3D
│   ├── components/
│   │   ├── 3d/             # Componentes relacionados con la visualización 3D
│   │   │   └── Model3DViewer.jsx
│   │   ├── layout/         # Componentes de layout (Navbar, Footer, Layout principal)
│   │   │   ├── Footer.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Navbar.jsx
│   │   └── ui/             # Componentes UI (shadcn/ui)
│   │       └── button.jsx
│   ├── data/               # Datos de la aplicación (ej. menuData.js)
│   │   └── menuData.js
│   ├── styles/             # Estilos CSS personalizados
│   │   └── custom.css
│   ├── App.css
│   ├── App.jsx             # Componente principal de la aplicación
│   ├── main.jsx
│   └── index.css
├── .gitignore
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.js      # Configuración de Tailwind CSS
├── vite.config.js
└── README.md               # Este archivo
```

## Guía de Personalización 🛠️

El proyecto ha sido diseñado para ser fácilmente personalizable. Aquí te mostramos cómo puedes modificar los elementos clave:

### 🎨 Colores Principales y Secundarios

Los colores de la marca están definidos en `tailwind.config.js` y en `src/styles/custom.css` como variables CSS. Puedes modificarlos directamente:

**`tailwind.config.js`**:
```javascript
// ...
theme: {
  extend: {
    colors: {
      primary: {
        50: '#fef7ee',
        100: '#fdecd3',
        200: '#fbd5a5',
        300: '#f8b86d',
        400: '#f59332',
        500: '#d97706', // Color principal
        600: '#c2610c',
        700: '#a1480c',
        800: '#83390f',
        900: '#6c2e0f',
      },
      secondary: {
        50: '#f8f7f4',
        100: '#f0ede6',
        200: '#e1dbc9',
        300: '#cfc4a3',
        400: '#bba67d',
        500: '#a89063', // Color secundario
        600: '#9a7f57',
        700: '#80694a',
        800: '#695640',
        900: '#564637',
      },
      neutral: {
        50: '#fafaf9',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917',
        950: '#0c0a09', // Negro casi puro
      },
    },
  },
},
// ...
```

**`src/styles/custom.css`**:
```css
/* Variables CSS para colores personalizados */
:root {
  --primary-500: #d97706;
  --secondary-500: #a89063;
  --neutral-950: #0c0a09;
  /* ... otros tonos ... */
}
```

### 🖼️ Logo del Restaurante

El logo del restaurante se puede cambiar en el componente `Navbar.jsx`. Actualmente, es un texto simple. Puedes reemplazarlo con una imagen SVG o PNG:

**`src/components/layout/Navbar.jsx`**:
```javascript
// ...
<h1 className="text-2xl font-playfair font-bold text-neutral-950">
  The Gilded Fork
</h1>
// Reemplaza lo anterior con:
// <img src="/path/to/your/logo.svg" alt="Logo del Restaurante" className="h-10" />
// ...
```

### 🍔 Secciones del Menú y Platos

Los datos del menú, incluyendo categorías, platos, precios, descripciones y referencias a modelos 3D, se gestionan en `src/data/menuData.js`:

**`src/data/menuData.js`**:
```javascript
export const menuCategories = [
  {
    id: 'bebidas',
    name: 'Bebidas',
    description: 'Refrescantes bebidas para acompañar tu comida',
    icon: '🥤'
  },
  // ... más categorías
];

export const menuItems = [
  {
    id: 'big-mac-clasica',
    categoryId: 'hamburguesas',
    name: 'Big Mac Clásica',
    description: 'Hamburguesa con salsa especial, lechuga, queso, pepinillos, cebolla en pan con semillas de sésamo',
    price: 25.00,
    allergens: ['Gluten', 'Lácteos', 'Sésamo'],
    model3d: 'big_mac.glb' // Nombre del archivo GLB en src/assets/models/
  },
  // ... más platos
];
```

Para agregar o modificar platos, simplemente edita este archivo. Asegúrate de que los `model3d` referencien correctamente los archivos GLB en `src/assets/models/`.

### 📸 Imágenes de Platos y Galería

Actualmente, las imágenes de los platos son placeholders (emojis). Para agregar imágenes reales, puedes modificar el componente `App.jsx` en la sección de `Vista de platos por categoría`:

**`src/App.jsx`** (línea ~290):
```javascript
// ...
<div className="h-48 bg-gradient-to-br from-secondary-100 to-secondary-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
  <span className="text-6xl">
    {menuCategories.find(cat => cat.id === selectedCategory)?.icon}
  </span>
</div>
// Reemplaza lo anterior con:
// <img src={`/src/assets/images/${item.imageName}`} alt={item.name} className="w-full h-full object-cover" />
// Asegúrate de tener las imágenes en src/assets/images/ y de agregar `imageName` a tu `menuData.js`
// ...
```

Para la sección de Galería, actualmente es un placeholder. Puedes crear un nuevo componente `Gallery.jsx` en `src/components/` y poblarlo con tus imágenes:

**`src/App.jsx`** (línea ~330):
```javascript
// ...
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
// Reemplaza lo anterior con:
// <Gallery />
// ...
```

### 📦 Modelos 3D

Los modelos 3D deben estar en formato GLB y ubicados en `src/assets/models/`. Asegúrate de que el nombre del archivo GLB en `menuData.js` coincida exactamente con el nombre del archivo en esta carpeta.

## Instalación y Ejecución 🚀

Para ejecutar el proyecto localmente, sigue estos pasos:

1.  **Clonar el repositorio (o descomprimir el archivo):**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd restaurant-ar-web
    ```
    (Si recibiste un archivo comprimido, simplemente descomprímelo y navega a la carpeta `restaurant-ar-web`)

2.  **Instalar dependencias:**
    ```bash
    pnpm install
    # o npm install
    # o yarn install
    ```

3.  **Iniciar el servidor de desarrollo:**
    ```bash
    pnpm dev
    # o npm run dev
    # o yarn dev
    ```

    La aplicación se abrirá en `http://localhost:5173/` (o un puerto similar) en tu navegador.

## Comentarios en el Código 📝

Todo el código está extensamente comentado para facilitar su comprensión y mantenimiento. Busca comentarios como `/** ... */` para descripciones de componentes y funciones, y `// ...` para explicaciones de lógica específica.

## Próximos Pasos Sugeridos 💡

-   Implementar la funcionalidad AR real utilizando WebXR para una experiencia inmersiva.
-   Desarrollar un sistema de carrito de compras y proceso de pedido.
-   Crear un formulario de contacto funcional en la sección de Contacto.
-   Expandir la galería de imágenes del restaurante.
-   Integrar un sistema de reservas de mesas.

¡Espero que disfrutes tu nueva página web profesional! Si tienes alguna pregunta o necesitas más ayuda, no dudes en consultarme.

