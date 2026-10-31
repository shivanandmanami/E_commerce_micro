// ============================================================================
// SAMPLE PRODUCT CATALOG (250 PRODUCTS ACROSS 10 CATEGORIES)
// Keeps the 4 core products first, then generates 246 more realistic products
// across 10 different departments using a simple, easy-to-read loop.
// ============================================================================

import { ProductDTO } from './types';

// 1. Core 4 products (used by automated verification tests)
const CORE_PRODUCTS: ProductDTO[] = [
  {
    id: 'prod-101',
    sku: 'SKU-LAPTOP-PRO-16',
    name: 'ProBook Studio 16 M3 Max',
    description: '16-inch Liquid Retina XDR workstation laptop with 64GB RAM and 2TB SSD.',
    category: 'Laptops',
    brand: 'AetherTech',
    price: 2499,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80'],
    tags: ['laptop', 'workstation', 'deal'],
    attributes: { processor: 'M3 Max 16-Core', ramGb: 64, storageTb: 2, warranty: '2 Years' },
    inStock: true,
    availableQuantity: 25,
    rating: 4.9,
    reviewCount: 142,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'prod-102',
    sku: 'SKU-HEADPHONES-ANC',
    name: 'AeroSonic Wireless ANC Headphones',
    description: 'Studio over-ear spatial audio headphones with active noise cancellation and 40h battery.',
    category: 'Audio',
    brand: 'AeroSonic',
    price: 349,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'],
    tags: ['headphones', 'wireless', 'anc'],
    attributes: { batteryLife: '40 Hours', noiseCancellation: 'Hybrid ANC', bluetooth: '5.4' },
    inStock: true,
    availableQuantity: 80,
    rating: 4.7,
    reviewCount: 318,
    createdAt: '2026-01-16T10:00:00.000Z',
    updatedAt: '2026-01-16T10:00:00.000Z',
  },
  {
    id: 'prod-103',
    sku: 'SKU-MECH-KB-RGB',
    name: 'KeyChronos Q1 Mechanical Keyboard',
    description: 'CNC aluminum 75% custom mechanical keyboard with hot-swappable tactile switches.',
    category: 'Peripherals',
    brand: 'KeyChronos',
    price: 189,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&q=80'],
    tags: ['keyboard', 'mechanical', 'rgb', 'deal'],
    attributes: { layout: '75%', switchType: 'Tactile', connectivity: 'Wireless + USB-C' },
    inStock: true,
    availableQuantity: 45,
    rating: 4.8,
    reviewCount: 209,
    createdAt: '2026-01-17T10:00:00.000Z',
    updatedAt: '2026-01-17T10:00:00.000Z',
  },
  {
    id: 'prod-104',
    sku: 'SKU-MONITOR-4K-OLED',
    name: 'UltraView 32" 4K QD-OLED Display',
    description: '32-inch 4K UHD 240Hz OLED reference monitor with 0.03ms response time and USB-C.',
    category: 'Monitors',
    brand: 'AetherTech',
    price: 1199,
    currency: 'USD',
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'],
    tags: ['monitor', 'oled', '4k'],
    attributes: { panelType: 'QD-OLED', resolution: '4K UHD', refreshRate: '240Hz' },
    inStock: true,
    availableQuantity: 15,
    rating: 4.9,
    reviewCount: 87,
    createdAt: '2026-01-18T10:00:00.000Z',
    updatedAt: '2026-01-18T10:00:00.000Z',
  },
];

// 2. Templates for 10 different product categories to generate 246 more items (Total = 250)
const CATEGORY_TEMPLATES = [
  {
    category: 'Laptops',
    brands: ['AetherTech', 'ZenithPC', 'NovaBook'],
    baseNames: ['UltraBook Air', 'CreatorBook Pro', 'Titan Gaming Laptop', 'FlexConvertible 2-in-1', 'CloudBook Slim'],
    basePrice: 699,
    priceStep: 140,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80',
    makeAttributes: (i: number) => ({
      ramGb: i % 2 === 0 ? 16 : 32,
      storage: i % 3 === 0 ? '1TB NVMe SSD' : '512GB SSD',
      screenSize: i % 2 === 0 ? '14 inch' : '15.6 inch',
      color: i % 2 === 0 ? 'Space Gray' : 'Silver',
    }),
  },
  {
    category: 'Smartphones',
    brands: ['NovaMobile', 'AetherTech', 'ApexPhone'],
    baseNames: ['NovaPhone Ultra 5G', 'AetherPhone Pro Max', 'Apex Fold 5G', 'NovaPhone Lite', 'PocketMax Mini'],
    basePrice: 399,
    priceStep: 95,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
    makeAttributes: (i: number) => ({
      storage: i % 2 === 0 ? '256GB' : '512GB',
      network: '5G Unlocked',
      camera: '108MP Triple Camera',
      battery: '5000mAh Fast Charge',
    }),
  },
  {
    category: 'Audio',
    brands: ['AeroSonic', 'PulseAudio', 'SoundWave'],
    baseNames: ['Studio Buds Pro', 'BassBoom Bluetooth Speaker', 'Cinema Atmos Soundbar', 'Hi-Fi Turntable', 'Podcast Condenser Mic'],
    basePrice: 59,
    priceStep: 45,
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80',
    makeAttributes: (i: number) => ({
      batteryLife: `${20 + (i % 5) * 6} Hours`,
      connectivity: 'Bluetooth 5.3 + AUX',
      waterproof: i % 2 === 0 ? 'IPX7 Waterproof' : 'Splash Resistant',
    }),
  },
  {
    category: 'Peripherals',
    brands: ['KeyChronos', 'HyperGlide', 'LogiCraft'],
    baseNames: ['Ergonomic Vertical Mouse', 'RGB Gaming Mousepad XL', 'Thunderbolt 4 Dock', '4K Streaming Webcam', 'Low-Profile Wireless Keyboard'],
    basePrice: 35,
    priceStep: 28,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80',
    makeAttributes: (i: number) => ({
      connection: i % 2 === 0 ? '2.4GHz Wireless + Bluetooth' : 'Braided USB-C',
      compatibility: 'Windows, macOS, Linux',
      warranty: '2 Years',
    }),
  },
  {
    category: 'Monitors',
    brands: ['AetherTech', 'UltraView', 'PixelDisplay'],
    baseNames: ['Curved Ultrawide 34"', 'ProArt 27" 4K IPS', 'Esports 24" 360Hz Monitor', 'Portable 16" USB-C Monitor', 'Studio 5K Retina Display'],
    basePrice: 229,
    priceStep: 110,
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&q=80',
    makeAttributes: (i: number) => ({
      refreshRate: i % 2 === 0 ? '144Hz' : '240Hz',
      panelType: i % 3 === 0 ? 'OLED' : 'Fast IPS',
      ports: 'HDMI 2.1 + DisplayPort + USB-C',
    }),
  },
  {
    category: 'Gaming',
    brands: ['HyperPlay', 'AeroGaming', 'KeyChronos'],
    baseNames: ['Pro Hall-Effect Controller', 'Spatial VR Headset', 'SimRacing Force Steering Wheel', 'Handheld Gaming Console', 'RGB Capture Card 4K60'],
    basePrice: 69,
    priceStep: 75,
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80',
    makeAttributes: (i: number) => ({
      platform: 'PC / Console / Cloud',
      latency: 'Ultra-Low 1ms',
      vibration: 'Dual Haptic Feedback',
    }),
  },
  {
    category: 'Cameras',
    brands: ['PixelOptics', 'CineLens', 'AeroCam'],
    baseNames: ['Mirrorless 4K60 Camera', 'ActionCam 5K Waterproof', 'Prime 50mm f/1.4 Lens', 'Foldable 4K GPS Drone', '3-Axis Gimbal Stabilizer'],
    basePrice: 199,
    priceStep: 160,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80',
    makeAttributes: (i: number) => ({
      sensorResolution: i % 2 === 0 ? '33 Megapixels' : '45 Megapixels',
      videoCapture: '4K 60fps 10-bit HDR',
      stabilization: '5-Axis In-Body IBIS',
    }),
  },
  {
    category: 'Smart Home',
    brands: ['LumaHome', 'EcoSense', 'SafeGuard'],
    baseNames: ['Smart Wi-Fi Thermostat', '2K Video Doorbell', 'Robot Vacuum & Mop LiDAR', 'Matter Smart LED Light Strip', 'HEPA Smart Air Purifier'],
    basePrice: 45,
    priceStep: 55,
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80',
    makeAttributes: (i: number) => ({
      voiceControl: 'Alexa, Google Home, Apple HomeKit',
      wirelessProtocol: 'Wi-Fi 6 + Matter',
      energyRating: 'Energy Star Certified',
    }),
  },
  {
    category: 'Wearables',
    brands: ['PulseFit', 'AetherTech', 'ChronoSmart'],
    baseNames: ['Titanium GPS Smartwatch', 'Sleep & Recovery Smart Ring', 'AMOLED Fitness Tracker', 'Solar Adventure Watch', 'Smart Audio Sunglasses'],
    basePrice: 79,
    priceStep: 50,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    makeAttributes: (i: number) => ({
      healthSensors: 'Heart Rate, SpO2, ECG, Sleep',
      waterResistance: '50 Meters (5 ATM)',
      batteryLife: `${7 + (i % 10)} Days`,
    }),
  },
  {
    category: 'Accessories',
    brands: ['UrbanEdge', 'VoltCharge', 'TravelPro'],
    baseNames: ['140W GaN Fast Charger', '24000mAh Airline Power Bank', 'Waterproof Tech Backpack', 'MagSafe Aluminum Stand', 'RFID Carbon Wallet'],
    basePrice: 24,
    priceStep: 18,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    makeAttributes: (i: number) => ({
      material: i % 2 === 0 ? 'Aircraft Aluminum' : 'Ballistic Nylon',
      travelFriendly: 'TSA Carry-On Approved',
      warranty: 'Lifetime Limited',
    }),
  },
];

function buildCatalogProducts(): ProductDTO[] {
  const allProducts: ProductDTO[] = [...CORE_PRODUCTS];
  let counter = 105;

  // Create ~25 products per category -> 250 total products
  for (const tpl of CATEGORY_TEMPLATES) {
    for (let i = 1; i <= 25; i++) {
      if (allProducts.length >= 250) break;

      const brand = tpl.brands[i % tpl.brands.length];
      const baseName = tpl.baseNames[i % tpl.baseNames.length];
      const edition = ['Gen 2', 'Pro', 'SE', 'Plus', 'Elite'][i % 5];
      const price = tpl.basePrice + (i % 7) * tpl.priceStep;
      const rating = Number((3.8 + (i % 12) * 0.1).toFixed(1));
      const isDeal = i % 3 === 0;

      allProducts.push({
        id: `prod-${counter}`,
        sku: `SKU-${tpl.category.slice(0, 4).toUpperCase()}-${counter}`,
        name: `${brand} ${baseName} ${edition} (${2025 + (i % 2)})`,
        description: `High-performance ${tpl.category.toLowerCase()} engineered by ${brand}. Includes fast Prime delivery and full manufacturer warranty.`,
        category: tpl.category,
        brand,
        price,
        currency: 'USD',
        images: [tpl.image],
        tags: [tpl.category.toLowerCase(), brand.toLowerCase(), ...(isDeal ? ['deal'] : [])],
        attributes: {
          ...tpl.makeAttributes(i),
          dealBadge: isDeal ? 'Limited Time Deal (15% Off)' : 'Standard Price',
        },
        inStock: i % 11 !== 0, // ~90% in stock, ~10% out of stock so "In Stock Only" filter is useful
        availableQuantity: i % 11 === 0 ? 0 : 10 + (i * 3) % 60,
        rating: Math.min(5.0, rating),
        reviewCount: 18 + (i * 23) % 450,
        createdAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:00:00.000Z',
      });

      counter++;
    }
  }

  return allProducts;
}

export const INITIAL_PRODUCTS: ProductDTO[] = buildCatalogProducts();
