// Seed realistic dummy data (Week 1) + scale mode for load testing (Week 3)
//   npm run db:seed              → 20 users, 60 products, interests, transactions, reports, settings
//   npm run db:seed -- --products=500  (or npm run db:seed:large)
//   add --keep to append instead of wiping collections
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Product, Interest, Transaction, Report, Settings, AiPrediction, AiFlag, ProductEmbedding, SearchLog, constants as C } from '../models/index.js';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const N_PRODUCTS = Number(arg('products', 60));
const N_USERS = Number(arg('users', Math.max(20, Math.ceil(N_PRODUCTS / 10))));
const KEEP = process.argv.includes('--keep');
const DEMO_PASSWORD = 'Password@123';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const FIRST = ['Aarav', 'Ananya', 'Rohan', 'Priya', 'Kabir', 'Isha', 'Arjun', 'Sneha', 'Vivaan', 'Diya', 'Aditya', 'Meera', 'Karan', 'Riya', 'Siddharth', 'Tanvi', 'Yash', 'Neha', 'Dev', 'Kavya'];
const LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Mehta', 'Kapoor', 'Iyer', 'Nair', 'Reddy', 'Joshi', 'Malhotra', 'Bansal'];
const LOCATIONS = ['Boys Hostel A', 'Boys Hostel B', 'Girls Hostel 1', 'Girls Hostel 2', 'Main Library', 'Academic Block', 'Central Canteen', 'Sports Complex', 'Day Scholar Gate'];

// category → [title, brand, minOriginal, maxOriginal]
const CATALOG = {
  Books: [['Engineering Mathematics Vol 1', 'Pearson', 400, 900], ['Data Structures Using C', 'McGraw Hill', 350, 800], ['Concepts of Physics HC Verma', 'Bharati Bhawan', 300, 600], ['Let Us C', 'BPB', 250, 450], ['Operating System Concepts', 'Wiley', 600, 1200]],
  Electronics: [['Casio FX-991EX Calculator', 'Casio', 1200, 1600], ['Wireless Mouse', 'Logitech', 500, 1500], ['Bluetooth Earphones', 'boAt', 1000, 3000], ['Mechanical Keyboard', 'Redragon', 2000, 4500], ['Arduino Uno Kit', 'Arduino', 1500, 3500], ['27" Monitor', 'Dell', 9000, 16000], ['Laptop', 'Lenovo', 35000, 65000]],
  Furniture: [['Study Table', 'Nilkamal', 2500, 6000], ['Plastic Chair', 'Supreme', 600, 1500], ['Bookshelf', 'IKEA', 2000, 5000], ['Bean Bag', 'Sleepyhead', 1500, 3500]],
  Cycles: [['Geared Cycle 21-speed', 'Hercules', 8000, 15000], ['City Bike', 'Btwin', 6000, 12000], ['Mountain Bike', 'Firefox', 12000, 25000]],
  Stationery: [['Engineering Drawing Kit', 'Camlin', 300, 800], ['Scientific Notebook Pack', 'Classmate', 200, 500], ['Drafter', 'Omega', 400, 900]],
  Accessories: [['Laptop Backpack', 'Wildcraft', 1500, 3500], ['Smart Watch', 'Noise', 2000, 5000], ['Power Bank 20000mAh', 'Mi', 1200, 2500]],
  Appliances: [['Electric Kettle', 'Prestige', 800, 1800], ['Table Fan', 'Bajaj', 1200, 2500], ['Mini Fridge', 'Godrej', 8000, 14000], ['Room Heater', 'Orient', 1500, 3000]],
  Other: [['Guitar (Acoustic)', 'Yamaha', 6000, 12000], ['Badminton Racket', 'Yonex', 800, 3000], ['Yoga Mat', 'Decathlon', 500, 1500]],
};
const CONDITION_FACTOR = { New: 0.92, 'Like New': 0.8, Good: 0.65, Fair: 0.5, Poor: 0.35 };
// One real photo per catalogue item, stored in <CLOUDINARY_FOLDER>/demo/ on our Cloudinary account
// (free-licence photos from Wikimedia Commons; credits in docs/DEMO_IMAGE_CREDITS.md).
const DEMO_PHOTO = {
  "Engineering Mathematics Vol 1": 'engineering-mathematics-vol-1',
  "Data Structures Using C": 'data-structures-using-c',
  "Concepts of Physics HC Verma": 'concepts-of-physics-hc-verma',
  "Let Us C": 'let-us-c',
  "Operating System Concepts": 'operating-system-concepts',
  "Casio FX-991EX Calculator": 'casio-fx-991ex-calculator',
  "Wireless Mouse": 'wireless-mouse',
  "Bluetooth Earphones": 'bluetooth-earphones',
  "Mechanical Keyboard": 'mechanical-keyboard',
  "Arduino Uno Kit": 'arduino-uno-kit',
  "27\" Monitor": '27-monitor',
  "Laptop": 'laptop',
  "Study Table": 'study-table',
  "Plastic Chair": 'plastic-chair',
  "Bookshelf": 'bookshelf',
  "Bean Bag": 'bean-bag',
  "Geared Cycle 21-speed": 'geared-cycle-21-speed',
  "City Bike": 'city-bike',
  "Mountain Bike": 'mountain-bike',
  "Engineering Drawing Kit": 'engineering-drawing-kit',
  "Scientific Notebook Pack": 'scientific-notebook-pack',
  "Drafter": 'drafter',
  "Laptop Backpack": 'laptop-backpack',
  "Smart Watch": 'smart-watch',
  "Power Bank 20000mAh": 'power-bank-20000mah',
  "Electric Kettle": 'electric-kettle',
  "Table Fan": 'table-fan',
  "Mini Fridge": 'mini-fridge',
  "Room Heater": 'room-heater',
  "Guitar (Acoustic)": 'guitar',
  "Badminton Racket": 'badminton-racket',
  "Yoga Mat": 'yoga-mat',
};
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const PHOTO_FOLDER = `${process.env.CLOUDINARY_FOLDER || 'campuskart'}/demo`;
// Fallback when the cloud name is unknown: Cloudinary's public demo image (a flower), still a valid Cloudinary URL
const IMG = (w, i) => `https://res.cloudinary.com/demo/image/upload/w_${w},h_${w},c_fill/v1/sample.jpg?seed=${i}`;
const productImage = (title, i) =>
  CLOUD && DEMO_PHOTO[title] ? `https://res.cloudinary.com/${CLOUD}/image/upload/${PHOTO_FOLDER}/${DEMO_PHOTO[title]}.jpg` : IMG(600, i);

function buildProduct(sellers, i) {
  const category = pick(C.CATEGORIES);
  const [title, brand, minO, maxO] = pick(CATALOG[category]);
  const originalPrice = Math.round(rand(minO, maxO) / 50) * 50;
  const condition = pick(C.CONDITIONS);
  const age = condition === 'New' ? rand(0, 3) : rand(3, 48);
  const depreciation = Math.max(0.25, CONDITION_FACTOR[condition] - age * 0.005);
  const price = Math.max(50, Math.round((originalPrice * depreciation * (0.9 + Math.random() * 0.2)) / 10) * 10);
  const createdAt = new Date(Date.now() - rand(0, 90) * 864e5 - rand(0, 864e5));
  return {
    sellerId: pick(sellers)._id,
    title: `${title}${Math.random() < 0.3 ? ' (barely used)' : ''}`,
    description: `${brand} ${title.toLowerCase()} in ${condition.toLowerCase()} condition, used for about ${age} months. ${pick(['Selling as I graduate.', 'Upgraded to a newer one.', 'No longer needed.', 'Moving out of hostel.'])} Pick up from ${pick(LOCATIONS)}.`,
    category, brand, originalPrice, price, age, condition,
    images: [productImage(title, i)],
    location: pick(LOCATIONS),
    status: Math.random() < 0.85 ? 'AVAILABLE' : 'SOLD',
    suspicionScore: rand(0, 25),
    createdAt, updatedAt: createdAt,
  };
}

(async () => {
  await connectDB();
  await Promise.all(Object.values({ User, Product, Interest, Transaction, Report, Settings, AiPrediction, AiFlag, ProductEmbedding, SearchLog }).map((m) => m.syncIndexes()));
  if (!KEEP) {
    await Promise.all([User, Product, Interest, Transaction, Report, Settings, AiPrediction, AiFlag, ProductEmbedding, SearchLog].map((m) => m.deleteMany({})));
    console.log('[seed] cleared collections');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userDocs = [{ name: 'Campus Admin', email: 'admin@campuskart.edu', passwordHash, role: 'ADMIN' }];
  for (let i = 0; i < N_USERS; i++) {
    const f = FIRST[i % FIRST.length], l = pick(LAST);
    userDocs.push({ name: `${f} ${l}`, email: `${f}.${l}${i}@campuskart.edu`.toLowerCase(), passwordHash, role: 'STUDENT', isRestricted: i === N_USERS - 1 });
  }
  const users = KEEP ? await User.find({ role: 'STUDENT' }).lean() : await User.insertMany(userDocs);
  const students = users.filter((u) => u.role === 'STUDENT');

  // Batch insert to keep memory flat at 500+ products
  const products = [];
  for (let i = 0; i < N_PRODUCTS; i += 100) {
    const batch = Array.from({ length: Math.min(100, N_PRODUCTS - i) }, (_, k) => buildProduct(students, i + k));
    products.push(...(await Product.insertMany(batch, { ordered: false })));
  }

  await Settings.ensureDefaults();
  await Settings.set('commissionRate', 5, users[0]._id);
  const rate = 5;

  const interests = [], txns = [], reports = [], seen = new Set();
  for (const p of products) {
    const buyer = pick(students.filter((s) => !s._id.equals(p.sellerId)));
    const key = `${p._id}-${buyer._id}`;
    if (p.status === 'SOLD') {
      interests.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, message: 'Is this still available?', status: 'ACCEPTED' });
      txns.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, amount: p.price, commissionRate: rate, paymentStatus: 'SUCCESS', transactionStatus: 'COMPLETED', completedAt: new Date(p.createdAt.getTime() + Math.random() * (Date.now() - p.createdAt.getTime())) });
      seen.add(key);
    } else if (Math.random() < 0.06) {
      // a cancelled or still-pending deal, so "transactions by status" has more than one bar
      const cancelled = Math.random() < 0.6;
      interests.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, message: 'Deal?', status: cancelled ? 'CANCELLED' : 'ACCEPTED' });
      txns.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, amount: p.price, commissionRate: rate, paymentStatus: cancelled ? 'FAILED' : 'PENDING', transactionStatus: cancelled ? 'CANCELLED' : 'PENDING' });
    } else if (Math.random() < 0.3 && !seen.has(key)) {
      interests.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, message: pick(['Can you do a lower price?', 'Interested! When can I see it?', '']), status: 'PENDING' });
    }
    if (Math.random() < 0.05) reports.push({ productId: p._id, reportedBy: buyer._id, sellerId: p.sellerId, reason: pick(C.REPORT_REASONS), details: 'Looks off compared to similar listings.' });
  }
  await Interest.insertMany(interests, { ordered: false });
  // .create runs pre('validate') hooks so commission fields are computed
  for (const t of txns) await Transaction.create(t);
  await Report.insertMany(reports, { ordered: false });

  // Weeks 5–7 demo data (clearly labelled modelVersion "seed-demo"; real rows come from the ML service)
  const predictions = products.filter(() => Math.random() < 0.4).map((p) => {
    const predicted = Math.round(p.price * (0.85 + Math.random() * 0.3));
    return {
      productId: p._id, sellerId: p.sellerId, endpoint: 'predict-price',
      inputFeatures: { category: p.category, brand: p.brand, originalPrice: p.originalPrice, age: p.age, condition: p.condition, location: p.location },
      predictedPrice: predicted, fairPriceRange: { min: Math.round(predicted * 0.9), max: Math.round(predicted * 1.1) },
      modelVersion: 'seed-demo', latencyMs: rand(40, 400), ...(p.status === 'SOLD' ? { actualSalePrice: p.price } : {}),
      createdAt: p.createdAt,
    };
  });
  await AiPrediction.insertMany(predictions, { ordered: false });
  const flags = products.filter((p) => p.status === 'AVAILABLE' && Math.random() < 0.03).map((p) => ({
    productId: p._id, sellerId: p.sellerId, suspicionScore: rand(40, 90), anomalyScore: rand(30, 90), riskLevel: pick(['MEDIUM', 'HIGH']),
    riskFactors: [{ feature: 'priceDeviation', value: rand(60, 150), reason: 'Listed price differs from estimated fair price by at least 60%' }],
    modelDecision: 'FLAG_FOR_REVIEW', model: 'IsolationForest + transparent threshold signals', modelVersion: 'seed-demo',
  }));
  await AiFlag.insertMany(flags, { ordered: false });
  for (const f of flags) await Product.updateOne({ _id: f.productId }, { $set: { suspicionScore: f.suspicionScore } });
  const QUERIES = ['calculator', 'cheap cycle', 'study table', 'laptop under 30000', 'engineering books', 'kettle for hostel', 'gaming mouse', 'something to carry my laptop'];
  await SearchLog.insertMany(Array.from({ length: 150 }, () => {
    const query = pick(QUERIES);
    return { query, mode: pick(['keyword', 'semantic']), category: Math.random() < 0.4 ? pick(C.CATEGORIES) : undefined, resultCount: Math.random() < 0.1 ? 0 : rand(1, 20), createdAt: new Date(Date.now() - rand(0, 30) * 864e5) };
  }));

  console.log(`[seed] users=${users.length} products=${products.length} interests=${interests.length} transactions=${txns.length} reports=${reports.length} ai_predictions=${predictions.length} ai_flags=${flags.length} search_logs=150`);
  console.log('[seed] embeddings are not generated here: run `npm run db:embeddings` next');
  console.log(`[seed] login: admin@campuskart.edu / ${DEMO_PASSWORD}  (all users share this password)`);
  await disconnectDB();
})().catch(async (e) => { console.error('[seed] failed:', e.message); await disconnectDB(); process.exit(1); });
