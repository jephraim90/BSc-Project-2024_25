
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

console.log('Environment variables check:');
const envVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID'
];

let missingVars = false;
envVars.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`${varName} is missing`);
    missingVars = true;
  } else {

    const value = process.env[varName];
    const maskedValue = value.substring(0, 3) + '...' + value.substring(value.length - 3);
    console.log(`${varName}: ${maskedValue}`);
  }
});

if (missingVars) {
  console.error('Some environment variables are missing. Please check your .env file.');
  process.exit(1);
}


const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};


console.log('\nVerifying Firebase config:');
let configMissing = false;
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.log(` ${key} is missing in firebaseConfig`);
    configMissing = true;
  } else {
    console.log(`${key} is set`);
  }
});

if (configMissing) {
  console.error('Firebase configuration is incomplete. Check your environment variables.');
  process.exit(1);
}


console.log('\nInitializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('Firebase initialized successfully');

const restaurants = [
  {
    name: 'La Trattoria Italiana',
    rating: 4.8,
    reviews: 342,
    priceRange: '$$$',
    cuisine: 'Italian',
    address: '123 Venice Street, Venice, 30122',
    phone: '+39 123 456 7890',
    hours: [
      { day: 'Monday-Thursday', hours: '12:00 PM - 10:00 PM' },
      { day: 'Friday-Saturday', hours: '12:00 PM - 11:00 PM' },
      { day: 'Sunday', hours: '11:00 AM - 9:00 PM' },
    ],
    description: 'Authentic Italian cuisine with a focus on fresh seafood and homemade pasta. Our recipes have been passed down through generations, bringing the true taste of Italy to Venice.',
    specialties: ['Seafood Risotto', 'Homemade Tagliatelle', 'Tiramisu'],
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
    ],
    menuSections: [
      {
        name: 'Appetizers',
        items: [
          { name: 'Bruschetta', description: 'Toasted bread with fresh tomatoes, garlic and basil', price: '€8' },
          { name: 'Calamari Fritti', description: 'Crispy fried calamari with lemon and marinara sauce', price: '€12' },
          { name: 'Caprese Salad', description: 'Fresh mozzarella, tomatoes, and basil with balsamic glaze', price: '€10' },
        ]
      },
      {
        name: 'Pasta',
        items: [
          { name: 'Spaghetti Carbonara', description: 'Classic carbonara with pancetta, egg, and pecorino cheese', price: '€14' },
          { name: 'Seafood Risotto', description: 'Creamy risotto with fresh seafood and saffron', price: '€18' },
          { name: 'Tagliatelle Bolognese', description: 'Homemade tagliatelle with traditional bolognese sauce', price: '€16' },
        ]
      },
      {
        name: 'Main Courses',
        items: [
          { name: 'Grilled Sea Bass', description: 'Fresh sea bass with lemon, herbs and seasonal vegetables', price: '€24' },
          { name: 'Veal Saltimbocca', description: 'Tender veal with prosciutto and sage in white wine sauce', price: '€22' },
          { name: 'Chicken Marsala', description: 'Chicken breast with mushrooms in marsala wine sauce', price: '€20' },
        ]
      }
    ]
  },
  {
    name: 'Sakura Sushi',
    rating: 4.6,
    reviews: 218,
    priceRange: '$$',
    cuisine: 'Japanese',
    address: '456 Tokyo Avenue, Venice, 30122',
    phone: '+39 987 654 3210',
    hours: [
      { day: 'Monday-Thursday', hours: '11:30 AM - 10:00 PM' },
      { day: 'Friday-Saturday', hours: '11:30 AM - 11:00 PM' },
      { day: 'Sunday', hours: '12:00 PM - 9:00 PM' },
    ],
    description: 'Authentic Japanese sushi and sashimi prepared with the freshest ingredients. Our master sushi chefs bring traditional techniques with a modern twist.',
    specialties: ['Dragon Roll', 'Fatty Tuna Sashimi', 'Tempura Udon'],
    images: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1554502078-ef0fc409efce?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
    ],
    menuSections: [
      {
        name: 'Starters',
        items: [
          { name: 'Edamame', description: 'Steamed soy beans with sea salt', price: '€6' },
          { name: 'Miso Soup', description: 'Traditional Japanese soup with tofu, seaweed, and green onion', price: '€5' },
          { name: 'Gyoza', description: 'Pan-fried dumplings with pork and vegetables', price: '€8' },
        ]
      },
      {
        name: 'Sushi Rolls',
        items: [
          { name: 'California Roll', description: 'Crab, avocado, and cucumber', price: '€12' },
          { name: 'Spicy Tuna Roll', description: 'Fresh tuna with spicy mayo and cucumber', price: '€14' },
          { name: 'Dragon Roll', description: 'Eel, avocado, and cucumber topped with avocado', price: '€16' },
        ]
      },
      {
        name: 'Sashimi',
        items: [
          { name: 'Salmon Sashimi', description: '5 pieces of fresh salmon', price: '€15' },
          { name: 'Tuna Sashimi', description: '5 pieces of premium tuna', price: '€18' },
          { name: 'Assorted Sashimi Platter', description: '15 pieces of chef\'s selection', price: '€30' },
        ]
      }
    ]
  }
 
];


const seedRestaurants = async () => {
  try {
    console.log('\nStarting to seed restaurants...');

    for (const restaurant of restaurants) {
      try {
        console.log(`Adding restaurant: ${restaurant.name}`);
        const docRef = await addDoc(collection(db, "restaurants"), restaurant);
        console.log(`Added restaurant with ID: ${docRef.id}`);
      } catch (error) {
        console.error(`Failed to add restaurant ${restaurant.name}:`, error);
      }
    }

    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};


seedRestaurants();