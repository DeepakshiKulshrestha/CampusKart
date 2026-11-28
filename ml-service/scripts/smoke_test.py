"""Behavioural checks for the deployed models. Run: python -m scripts.smoke_test (exit 1 on failure)."""
import sys
import warnings

warnings.filterwarnings("ignore")

from fraud_detection.predict import score_listing
from price_prediction.predict import predict_price
from semantic_search.search import LOCAL_ENGINE, _local_scores

failures = []


def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok:
        failures.append(msg)


def price(cat, title, brand, orig, age, cond="Good"):
    return predict_price(dict(category=cat, itemType=title, brand=brand, originalPrice=orig, age=age, condition=cond))["predictedPrice"]


# 1. Every marketplace category is understood and priced sensibly (between 10% and 95% of original).
for cat, title, brand, orig in [("Books", "Engineering Mathematics by Kreyszig", "Wiley", 700), ("Electronics", "Casio fx-991EX calculator", "Casio", 1500),
        ("Furniture", "Wooden study table", "Nilkamal", 4000), ("Cycles", "Hero Sprint 21 speed cycle", "Hero", 12000), ("Stationery", "Mini drafter", "Omega", 500),
        ("Accessories", "Wildcraft 30L backpack", "Wildcraft", 2000), ("Appliances", "Prestige electric kettle 1.5L", "Prestige", 1200), ("Other", "Yonex badminton racket", "Yonex", 2500)]:
    p = price(cat, title, brand, orig, 12)
    check(0.10 * orig < p < 0.95 * orig, f"{cat:12s} {title[:32]:32s} orig {orig} -> {p}")
vals = {c: price(c, "item", "Unknown", 5000, 12) for c in ["Furniture", "Appliances", "Accessories", "Other"]}
check(len(set(vals.values())) > 1, f"category matters: {vals}")
check(price("Electronics", "Laptop Dell", "Dell", 50000, 6) > price("Electronics", "Laptop Dell", "Dell", 50000, 48), "older laptop is cheaper")
check(price("Appliances", "Electric kettle", "Prestige", 1500, 12, "Like New") > price("Appliances", "Electric kettle", "Prestige", 1500, 12, "Poor"), "poor condition is cheaper")
check(price("Gadgets", "thing", "Unknown", 1000, 3) > 0, "unknown category falls back to Other")
check(price("Daily Essentials", "Study table", "Unknown", 3000, 12) == price("Furniture", "Study table", "Unknown", 3000, 12), "legacy label 'Daily Essentials' maps to Furniture")
check(price("Electronics", "Apple iPhone 12 128GB", "Apple", 60000, 24) > 15000, "iPhone priced like a phone, not a calculator")

# 2. New honest sellers must not be flagged; real abuse must be.
base = dict(listingId="x", listedPrice=1000, predictedFairPrice=1000, accountAgeInDays=0, totalListings=1, listingsLast7Days=1,
            previousReports=0, completedSalesCount=0, rejectedListingsCount=0, averagePriceDeviation=0)


def s(**kw):
    return score_listing({**base, **kw})


for label, kw in [("brand-new seller, fair price", {}), ("brand-new seller, 12% under", dict(listedPrice=880, averagePriceDeviation=.12)),
                  ("new seller, 3 listings", dict(totalListings=3, listingsLast7Days=3)), ("same seller aged 400 days", dict(accountAgeInDays=400))]:
    r = s(**kw)
    check(r["riskLevel"] == "LOW", f"{label}: {r['suspicionScore']} {r['riskLevel']}")
check(s(accountAgeInDays=0)["suspicionScore"] == s(accountAgeInDays=900)["suspicionScore"], "account age has zero influence on the score")
check(not any(f["feature"] == "accountAgeInDays" for f in s()["riskFactors"]), "no 'account is new' risk factor is ever reported")
bad = s(listedPrice=150, totalListings=40, listingsLast7Days=20, previousReports=4, rejectedListingsCount=5)
check(bad["riskLevel"] == "HIGH", f"spam/scam profile: {bad['suspicionScore']} {bad['riskLevel']}")
check(s(listedPrice=100, averagePriceDeviation=.9)["decision"] == "FLAG_FOR_REVIEW", "new seller at 90% below fair price is still flagged for review")

# 3. Semantic search: free local embeddings + typo correction, and the keyword-only fallback.
from semantic_search.search import search_products

products = [dict(id=i, title=t, category="Other", price=100, condition="Good") for i, t in enumerate(
    ["Casio fx-991EX scientific calculator", "Hero Sprint 21 speed cycle", "Prestige electric kettle 1.5L", "Kurlon single mattress",
     "Dell Inspiron laptop 8GB", "Engineering Mathematics Kreyszig", "Wildcraft backpack 30L", "boAt wireless earbuds", "Yonex badminton racket"])]
for q, want in [("calculator for exams", 0), ("bike to ride around campus", 1), ("something to boil water", 2), ("somewhere to sleep", 3),
                ("computer for coding", 4), ("maths textbook", 5), ("bag to carry books", 6), ("music on the go", 7), ("play sports", 8), ("kettel", 2), ("cyle", 1)]:
    result = search_products(q, products, {}, 3)
    check(bool(result["results"]) and result["results"][0]["id"] == want, f"search '{q}' -> {products[want]['title']} [{result['engine'][-26:]}]")
docs = [p["title"] for p in products]
check(int(_local_scores("something to boil water", docs).argmax()) == 2, "keyword-only fallback still ranks 'boil water' -> kettle")
sys.exit(1 if failures else 0)
