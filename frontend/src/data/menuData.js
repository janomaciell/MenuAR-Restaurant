/**
 * Datos del menú del restaurante
 * 
 * Estructura:
 * - Categorías de comida (Bebidas, Carnes, Pastas, etc.)
 * - Platos con información detallada
 * - Referencias a modelos 3D disponibles
 * - Precios y descripciones
 */

export const menuCategories = [
  {
    id: 'bebidas',
    name: 'Bebidas',
    description: 'Refrescantes bebidas para acompañar tu comida',
    icon: '🥤'
  },
  {
    id: 'hamburguesas',
    name: 'Hamburguesas',
    description: 'Deliciosas hamburguesas gourmet',
    icon: '🍔'
  },
  {
    id: 'pastas',
    name: 'Pastas',
    description: 'Pastas frescas hechas en casa',
    icon: '🍝'
  },
  {
    id: 'pizzas',
    name: 'Pizzas',
    description: 'Pizzas artesanales con ingredientes frescos',
    icon: '🍕'
  },
  {
    id: 'sandwiches',
    name: 'Sandwiches',
    description: 'Sandwiches gourmet y tostados',
    icon: '🥪'
  },
  {
    id: 'postres',
    name: 'Postres',
    description: 'Dulces tentaciones para finalizar',
    icon: '🧁'
  },
  {
    id: 'pollo',
    name: 'Pollo',
    description: 'Especialidades de pollo preparadas al momento',
    icon: '🍗'
  },
  {
    id: 'panaderia',
    name: 'Panadería',
    description: 'Pan fresco y productos horneados',
    icon: '🥐'
  }
];

export const menuItems = {
  bebidas: [
    {
      id: 'lemon-iced-tea',
      name: 'Té Helado de Limón',
      description: 'Refrescante té helado con un toque de limón',
      price: 3.50,
      image: '/api/placeholder/300/200',
      model3d: null, 
      allergens: ['Sin gluten'],
      category: 'bebidas'
    },
    {
      id: 'cola',
      name: 'Cola Clásica',
      description: 'Cola clásica con un sabor crujiente',
      price: 2.00,
      image: '/api/placeholder/300/200',
      model3d: null,
      allergens: [],
      category: 'bebidas'
    },
    {
      id: 'sparkling-water',
      name: 'Agua con Gas de Lima',
      description: 'Agua con gas con un sabor natural de lima',
      price: 2.50,
      image: '/api/placeholder/300/200',
      model3d: null,
      allergens: ['Sin gluten'],
      category: 'bebidas'
    }
  ],
  
  hamburguesas: [
    {
      id: 'big-mac',
      name: 'Big Mac Clásica',
      description: 'Hamburguesa con salsa especial, lechuga, queso, pepinillos, cebolla en pan con semillas de sésamo',
      price: 25.00,
      image: '/api/placeholder/300/200',
      model3d: 'BigMac.glb',
      allergens: ['Gluten', 'Lácteos', 'Sésamo'],
      category: 'hamburguesas'
    },
    {
      id: 'burger-kfc',
      name: 'Burger Especial KFC',
      description: 'Hamburguesa crujiente con pollo frito y salsa especial',
      price: 18.00,
      image: '/api/placeholder/300/200',
      model3d: 'BurgerKFC.glb',
      allergens: ['Gluten', 'Lácteos'],
      category: 'hamburguesas'
    },
    {
      id: 'cheeseburger',
      name: 'Cheeseburger Deluxe',
      description: 'Hamburguesa con queso cheddar, lechuga fresca y tomate',
      price: 15.00,
      image: '/api/placeholder/300/200',
      model3d: 'Cheeseburger.glb',
      allergens: ['Gluten', 'Lácteos'],
      category: 'hamburguesas'
    },

    {
      id: 'burger-simple',
      name: 'Burger Clásica',
      description: 'Hamburguesa tradicional con los ingredientes esenciales',
      price: 12.00,
      image: '/api/placeholder/300/200',
      model3d: 'burguer.glb',
      allergens: ['Gluten'],
      category: 'hamburguesas'
    }
  ],

  pastas: [
    {
      id: 'spaghetti',
      name: 'Spaghetti Boloñesa',
      description: 'Pasta fresca con salsa boloñesa tradicional y queso parmesano',
      price: 14.00,
      image: '/api/placeholder/300/200',
      model3d: 'Food - Spaghetti - Tallarín - Noodles - Pasta - 🍝.glb',
      allergens: ['Gluten', 'Lácteos'],
      category: 'pastas'
    },
    {
      id: 'instant-noodles',
      name: 'Fideos Instantáneos Gourmet',
      description: 'Fideos instantáneos elevados con ingredientes premium',
      price: 12.00,
      image: '/api/placeholder/300/200',
      model3d: 'instant noodle block 麵餅.glb',
      allergens: ['Gluten', 'Soja'],
      category: 'pastas'
    }
  ],

  pizzas: [
    {
      id: 'pepperoni-pizza',
      name: 'Pizza Pepperoni',
      description: 'Pizza clásica con pepperoni y queso mozzarella',
      price: 16.00,
      image: '/api/placeholder/300/200',
      model3d: 'PepperoniPizza.glb',
      allergens: ['Gluten', 'Lácteos'],
      category: 'pizzas'
    },
    {
      id: 'frozen-pizza',
      name: 'Pizza Artesanal',
      description: 'Pizza artesanal con ingredientes frescos del día',
      price: 18.00,
      image: '/api/placeholder/300/200',
      model3d: 'Disembodied frozen pizza.glb',
      allergens: ['Gluten', 'Lácteos'],
      category: 'pizzas'
    }
  ],

  sandwiches: [
    {
      id: 'grilled-cheese',
      name: 'Sandwich de Queso Grillado',
      description: 'Sandwich tostado con queso derretido y mantequilla',
      price: 8.00,
      image: '/api/placeholder/300/200',
      model3d: 'Grilled-Cheese-Sandwich.glb',
      allergens: ['Gluten', 'Lácteos'],
      category: 'sandwiches'
    },
    {
      id: 'sandwich-deluxe',
      name: 'Sandwich Deluxe',
      description: 'Sandwich gourmet con múltiples capas de ingredientes frescos',
      price: 15.00,
      image: '/api/placeholder/300/200',
      model3d: 'Sandwich.glb',
      allergens: ['Gluten', 'Lácteos'],
      category: 'sandwiches'
    }
  ],

  postres: [
    {
      id: 'cookie',
      name: 'Cookie Artesanal',
      description: 'Cookie recién horneada con chips de chocolate',
      price: 4.00,
      image: '/api/placeholder/300/200',
      model3d: 'cookie.glb',
      allergens: ['Gluten', 'Lácteos', 'Huevos'],
      category: 'postres'
    },
    {
      id: 'muffin',
      name: 'Muffin de Arándanos',
      description: 'Muffin esponjoso con arándanos frescos',
      price: 5.00,
      image: '/api/placeholder/300/200',
      model3d: 'muffin.glb',
      allergens: ['Gluten', 'Lácteos', 'Huevos'],
      category: 'postres'
    }
  ],

  pollo: [
    {
      id: 'pollo-entero',
      name: 'Pollo Entero Asado',
      description: 'Pollo entero asado con hierbas y especias especiales',
      price: 22.00,
      image: '/api/placeholder/300/200',
      model3d: 'polloentero.glb',
      allergens: [],
      category: 'pollo'
    },
    {
      id: 'crispy-kitchen',
      name: 'Pollo Crujiente de la Casa',
      description: 'Pollo crujiente con nuestra receta secreta',
      price: 16.00,
      image: '/api/placeholder/300/200',
      model3d: 'crispykitchen.glb',
      allergens: ['Gluten'],
      category: 'pollo'
    }
  ],

  panaderia: [
    {
      id: 'croissant',
      name: 'Croissant Francés',
      description: 'Croissant mantecoso recién horneado',
      price: 3.50,
      image: '/api/placeholder/300/200',
      model3d: 'Croissant.glb',
      allergens: ['Gluten', 'Lácteos', 'Huevos'],
      category: 'panaderia'
    },
    {
      id: 'masa-madre',
      name: 'Pan de Masa Madre',
      description: 'Pan artesanal de masa madre con corteza crujiente',
      price: 6.00,
      image: '/api/placeholder/300/200',
      model3d: 'MasaMadre.glb',
      allergens: ['Gluten'],
      category: 'panaderia'
    },
    {
      id: 'frietje',
      name: 'Papas Fritas Especiales',
      description: 'Papas fritas crujientes con sal marina',
      price: 4.50,
      image: '/api/placeholder/300/200',
      model3d: 'Frietje waterfiets.glb',
      allergens: [],
      category: 'panaderia'
    }
  ]
};

// Función helper para obtener todos los platos
export const getAllMenuItems = () => {
  return Object.values(menuItems).flat();
};

// Función helper para obtener platos por categoría
export const getItemsByCategory = (categoryId) => {
  return menuItems[categoryId] || [];
};

// Función helper para obtener un plato específico
export const getItemById = (itemId) => {
  const allItems = getAllMenuItems();
  return allItems.find(item => item.id === itemId);
};

