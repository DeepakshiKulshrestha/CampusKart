// Seed realistic dummy data (Week 1) + scale mode for load testing (Week 3)
//   npm run db:seed              → 20 users, 60 products, interests, transactions, reports, settings
//   npm run db:seed -- --products=500  (or npm run db:seed:large)
//   add --keep to append instead of wiping collections
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Product, Interest, Transaction, Report, Settings, constants as C } from '../models/index.js';

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
// Public Cloudinary demo-cloud images — real Cloudinary URLs, so they pass the URL validator
const IMG = (w, i) => `https://res.cloudinary.com/demo/image/upload/w_${w},h_${w},c_fill/v1/sample.jpg?seed=${i}`;

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
    images: Array.from({ length: rand(1, 3) }, (_, k) => IMG(600, `${i}-${k}`)),
    location: pick(LOCATIONS),
    status: Math.random() < 0.85 ? 'AVAILABLE' : 'SOLD',
    suspicionScore: rand(0, 25),
    createdAt, updatedAt: createdAt,
  };
}

(async () => {
  await connectDB();
  await Promise.all(Object.values({ User, Product, Interest, Transaction, Report, Settings }).map((m) => m.syncIndexes()));
  if (!KEEP) {
    await Promise.all([User, Product, Interest, Transaction, Report, Settings].map((m) => m.deleteMany({})));
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

  await Settings.set('commissionRate', 5, users[0]._id);
  const rate = 5;

  const interests = [], txns = [], reports = [], seen = new Set();
  for (const p of products) {
    const buyer = pick(students.filter((s) => !s._id.equals(p.sellerId)));
    const key = `${p._id}-${buyer._id}`;
    if (p.status === 'SOLD') {
      interests.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, message: 'Is this still available?', status: 'ACCEPTED' });
      txns.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, amount: p.price, commissionRate: rate, paymentStatus: 'SUCCESS', transactionStatus: 'COMPLETED', completedAt: new Date() });
      seen.add(key);
    } else if (Math.random() < 0.3 && !seen.has(key)) {
      interests.push({ productId: p._id, buyerId: buyer._id, sellerId: p.sellerId, message: pick(['Can you do a lower price?', 'Interested! When can I see it?', '']), status: 'PENDING' });
    }
    if (Math.random() < 0.05) reports.push({ productId: p._id, reportedBy: buyer._id, reason: pick(C.REPORT_REASONS), details: 'Looks off compared to similar listings.' });
  }
  await Interest.insertMany(interests, { ordered: false });
  // .create runs pre('validate') hooks so commission fields are computed
  for (const t of txns) await Transaction.create(t);
  await Report.insertMany(reports, { ordered: false });

  console.log(`[seed] users=${users.length} products=${products.length} interests=${interests.length} transactions=${txns.length} reports=${reports.length}`);
  console.log(`[seed] login: admin@campuskart.edu / ${DEMO_PASSWORD}  (all users share this password)`);
  await disconnectDB();
})().catch(async (e) => { console.error('[seed] failed:', e.message); await disconnectDB(); process.exit(1); });
