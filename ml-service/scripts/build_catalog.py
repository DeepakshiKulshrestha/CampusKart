"""Build data/product_catalog.json (v3) aligned to the marketplace's eight categories.

Tuple: (itemType, brands, variants, (min_inr, max_inr), decay_months, resale_factor, weight)
"""
import json
from pathlib import Path

G = ["Generic"]
CAT = {
 "Books": [
  ("Engineering Mathematics textbook", ["Generic","Wiley","Pearson","Khanna"], ["Vol 1","Vol 2","Complete"], (350,900), 120, .60, 7),
  ("Physics textbook HC Verma", ["Bharati Bhawan","Generic"], ["Part 1","Part 2"], (350,700), 120, .62, 4),
  ("Programming textbook C C++ Java Python", ["Generic","Pearson","McGraw Hill","Oxford"], ["Standard"], (300,900), 90, .58, 6),
  ("GATE JEE competitive exam guide", ["Arihant","MTG","Made Easy","Generic"], ["Latest edition"], (400,1500), 36, .45, 5),
  ("Previous year question papers", G, ["Set"], (100,350), 24, .40, 3),
  ("Novel fiction paperback", ["Penguin","HarperCollins","Generic"], ["Paperback"], (150,500), 120, .50, 4),
  ("Engineering Drawing book", ["Generic","NS Bhatt"], ["Standard"], (250,600), 120, .55, 3),
  ("Circuit theory electronics textbook", ["Generic","Pearson","Tata McGraw Hill"], ["Standard"], (400,1100), 100, .58, 4)],
 "Electronics": [
  ("Scientific calculator", ["Casio","Generic"], ["fx-991EX","fx-82MS","fx-991MS"], (700,1700), 72, .72, 8),
  ("Laptop", ["Dell","HP","Lenovo","Asus","Apple","Acer"], ["8GB 256GB","16GB 512GB","8GB 512GB"], (28000,95000), 48, .70, 5),
  ("Smartphone mobile phone", ["Apple","Samsung","OnePlus","Redmi","Realme","Vivo"], ["64GB","128GB","256GB"], (9000,80000), 36, .70, 6),
  ("Tablet iPad", ["Apple","Samsung","Lenovo"], ["64GB","128GB"], (15000,60000), 48, .70, 2),
  ("Wired earphones", ["boAt","Sony","JBL","Generic"], ["Standard"], (299,1800), 24, .45, 5),
  ("Bluetooth headphones", ["boAt","Sony","JBL","Noise","Generic"], ["Over ear","On ear"], (1200,9000), 30, .55, 4),
  ("Wireless earbuds TWS", ["boAt","Apple","OnePlus","Noise","Realme"], ["Standard"], (1000,12000), 24, .50, 4),
  ("Power bank", ["Mi","Anker","Ambrane","Realme"], ["10000mAh","20000mAh"], (700,2800), 30, .55, 5),
  ("Smartwatch", ["Apple","Noise","boAt","Fire-Boltt","Samsung"], ["Standard"], (1500,35000), 30, .55, 2),
  ("Wireless mouse", ["Logitech","HP","Dell","Zebronics"], ["Standard"], (400,2500), 36, .55, 4),
  ("Keyboard", ["Logitech","HP","Dell","Zebronics"], ["Wired","Wireless","Mechanical"], (500,5000), 48, .55, 3),
  ("External hard drive pen drive", ["WD","Seagate","SanDisk","HP"], ["500GB","1TB","2TB","64GB","128GB"], (500,6500), 48, .62, 4),
  ("Arduino Raspberry Pi electronics kit", ["Arduino","Raspberry Pi","Generic"], ["Starter kit","Uno","Pi 4"], (600,7500), 48, .60, 4),
  ("Monitor display", ["Dell","LG","Samsung","HP","Acer"], ["22 inch","24 inch","27 inch"], (6000,22000), 60, .62, 2),
  ("Bluetooth speaker", ["JBL","boAt","Sony","Mi"], ["Portable"], (800,9000), 36, .55, 3),
  ("Camera DSLR", ["Canon","Nikon","Sony"], ["Standard"], (15000,70000), 72, .72, 1)],
 "Furniture": [
  ("Study table desk", G+["Nilkamal","Godrej"], ["Wooden","Foldable","Metal"], (1500,8000), 96, .50, 6),
  ("Study chair", ["Nilkamal","Godrej","Generic","Featherlite"], ["Plastic","Ergonomic","Wooden"], (800,7000), 72, .48, 6),
  ("Bookshelf rack", ["Nilkamal","Generic","Godrej"], ["3 shelf","4 shelf","5 shelf"], (1200,6000), 96, .50, 4),
  ("Mattress", ["Sleepwell","Kurlon","Wakefit","Generic"], ["Single","Double"], (2500,14000), 60, .40, 5),
  ("Folding bed cot", ["Generic","Nilkamal"], ["Single"], (1500,5500), 72, .50, 3),
  ("Storage cabinet wardrobe", ["Godrej","Nilkamal","Generic"], ["Small","Medium"], (3500,16000), 120, .50, 2),
  ("Bean bag", ["Generic","Wakefit"], ["XL","XXL"], (900,3500), 48, .45, 2),
  ("Plastic stool", ["Nilkamal","Generic"], ["Standard"], (250,900), 60, .45, 3),
  ("Laptop table", ["Generic","Nilkamal"], ["Foldable","Adjustable"], (500,3000), 48, .50, 4)],
 "Cycles": [
  ("Geared cycle", ["Hero","Hercules","Firefox","Btwin","Giant"], ["21 speed","18 speed","7 speed"], (8000,35000), 96, .62, 5),
  ("Non-geared cycle", ["Hero","Atlas","Hercules","Avon"], ["Single speed","26T","24T"], (3500,9500), 96, .58, 6),
  ("Electric scooter", ["Ola","Ather","Hero Electric"], ["Standard"], (35000,110000), 60, .62, 1),
  ("Cycle helmet", ["Btwin","Vega","Generic"], ["Adult"], (400,2500), 36, .40, 3),
  ("Cycle lock chain", ["Generic","Btwin"], ["Standard"], (150,900), 48, .45, 3),
  ("Cycle accessories pump light basket", G, ["Set"], (200,1500), 48, .40, 3)],
 "Stationery": [
  ("Mini drafter", ["Omega","Camlin","Generic"], ["Standard"], (250,800), 72, .50, 5),
  ("Geometry box", ["Camlin","Faber-Castell","Classmate"], ["Standard"], (100,350), 60, .40, 4),
  ("Lab notebook record file", ["Classmate","Navneet","Generic"], ["Set of 3","Single"], (80,450), 24, .35, 4),
  ("Drawing board A3", ["Omega","Generic"], ["A3","A2"], (300,900), 72, .45, 3),
  ("Art supplies paint colour set", ["Camlin","Faber-Castell","Generic"], ["Standard"], (150,1200), 36, .35, 3),
  ("Pen set and highlighters", ["Parker","Pilot","Reynolds","Cello"], ["Set"], (100,1500), 36, .35, 4),
  ("Sketchbook notebook diary", ["Classmate","Camlin","Generic"], ["A4","A5"], (80,500), 24, .30, 3),
  ("Clipboard file folder", G, ["Standard"], (50,350), 36, .35, 2)],
 "Accessories": [
  ("Backpack", ["Wildcraft","Skybags","American Tourister","Generic"], ["25L","30L","35L"], (700,4500), 48, .55, 7),
  ("Lab coat", ["Generic","Campus","Manpro"], ["S","M","L","XL"], (350,1100), 60, .45, 6),
  ("Wrist watch", ["Casio","Titan","Fastrack","Fossil"], ["Analog","Digital"], (800,9000), 84, .60, 3),
  ("Sunglasses", ["Ray-Ban","Fastrack","Generic"], ["Standard"], (400,6500), 48, .45, 2),
  ("Laptop bag sleeve", ["Dell","HP","Wildcraft","Generic"], ["14 inch","15.6 inch"], (500,3000), 48, .50, 4),
  ("Water bottle flask", ["Milton","Cello","Generic"], ["1L","750ml"], (200,1200), 36, .40, 4),
  ("Jacket hoodie", ["Nike","Adidas","Puma","Generic"], ["M","L","XL"], (800,5000), 36, .45, 4),
  ("Sports shoes sneakers", ["Nike","Adidas","Puma","Campus","Bata"], ["UK 7","UK 8","UK 9","UK 10"], (1000,9000), 24, .50, 4),
  ("Wallet belt", G+["Wildcraft","Fastrack"], ["Leather"], (200,1500), 48, .40, 2)],
 "Appliances": [
  ("Electric kettle", ["Prestige","Philips","Pigeon","Havells"], ["1L","1.5L","1.8L"], (500,2500), 48, .50, 7),
  ("Induction cooktop", ["Prestige","Philips","Pigeon","Bajaj"], ["1600W","2000W"], (1500,4500), 60, .52, 5),
  ("Room cooler", ["Symphony","Bajaj","Orient","Crompton"], ["Personal","Tower"], (3500,12000), 72, .52, 4),
  ("Table fan pedestal fan", ["Usha","Havells","Orient","Bajaj"], ["Table","Pedestal"], (900,3800), 72, .50, 6),
  ("Electric iron", ["Philips","Bajaj","Usha"], ["Dry","Steam"], (400,2200), 60, .50, 4),
  ("Mini fridge refrigerator", ["Haier","Godrej","Whirlpool","LG"], ["50L","90L","190L"], (7000,19000), 96, .55, 3),
  ("Rice cooker", ["Prestige","Philips","Pigeon"], ["1.8L","2.8L"], (900,3500), 60, .50, 3),
  ("Hair dryer straightener", ["Philips","Havells","Nova"], ["Standard"], (500,2800), 48, .45, 3),
  ("Immersion rod water heater", ["Bajaj","Havells","Generic"], ["1500W"], (250,1500), 48, .45, 4),
  ("Microwave oven", ["IFB","LG","Samsung"], ["20L","25L"], (4500,12000), 96, .55, 2),
  ("Study lamp LED desk lamp", ["Philips","Wipro","Syska","Generic"], ["Standard"], (300,2000), 48, .45, 5),
  ("Extension board", ["Anchor","Havells","Generic"], ["4 socket","6 socket"], (200,900), 60, .40, 4),
  ("Room heater", ["Bajaj","Havells","Usha"], ["Fan heater","Oil radiator"], (1200,6500), 72, .50, 2)],
 "Other": [
  ("Badminton racket", ["Yonex","Li-Ning","Cosco","Generic"], ["Standard"], (500,5500), 48, .45, 5),
  ("Cricket bat kit", ["SG","SS","MRF","Kookaburra"], ["Kashmir willow","English willow"], (700,12000), 60, .50, 3),
  ("Football basketball volleyball", ["Nivia","Cosco","Spalding"], ["Size 5","Size 7"], (400,2500), 48, .40, 3),
  ("Acoustic guitar", ["Yamaha","Fender","Givson","Kadence"], ["Standard"], (3500,25000), 120, .60, 3),
  ("Musical keyboard", ["Casio","Yamaha"], ["61 keys"], (6000,30000), 96, .60, 1),
  ("Dumbbell gym set", ["Generic","Kore","Cosco"], ["10kg","20kg"], (800,5000), 120, .55, 3),
  ("Yoga mat", G+["Decathlon"], ["Standard"], (250,1500), 36, .40, 3),
  ("Suitcase trolley bag", ["American Tourister","Safari","Skybags","VIP"], ["Cabin","Medium","Large"], (1500,9000), 72, .50, 4),
  ("Board game chess carrom", ["Generic","Funskool"], ["Standard"], (200,2500), 72, .45, 3),
  ("Bucket mug storage box set", G, ["Set"], (150,1200), 48, .35, 3)],
}

items = []
for cat, rows in CAT.items():
    for name, brands, variants, (lo, hi), decay, resale, weight in rows:
        items.append({"itemType": name, "category": cat, "brands": brands, "variants": variants,
                      "packQuantities": [1], "priceRangeInr": [lo, hi], "kind": "reusable",
                      "decayMonths": decay, "resaleFactor": resale, "weight": weight})
out = Path(__file__).resolve().parents[1] / "data" / "product_catalog.json"
out.write_text(json.dumps({"catalogVersion": "campuskart-marketplace-v3", "currency": "INR", "items": items}, indent=1), encoding="utf-8")
print(len(items), "items", {c: len(r) for c, r in CAT.items()})
