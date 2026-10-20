# CampusKart Synthetic Dataset Notes

## Files and reproducibility

`product_catalog.json` defines the configurable student marketplace catalog. The generator writes `synthetic/campuskart_listings_v2.csv` and an adjacent `.manifest.json`. The CSV is local and Git-ignored; the manifest records catalog version, row count, seed, schema, and SHA-256. Current default: 1,050,000 rows, seed `20261020`, in 50,000-row chunks.

From `ml-service/` run:

```powershell
python data/generate_synthetic.py --rows 1050000 --seed 20261020 --chunk-size 50000
```

The catalog includes lab coats and Manpro coats in XS–XXXL; lab safety equipment; stationery; textbooks; personal care; packaged snacks and drinks; laptops, accessories, calculators; bicycles in 24–29 inch wheel sizes; and hostel/daily essentials. Items are weighted so low-cost frequently purchased goods occur more often than expensive durable goods. Category, brand, item, variant, pack-size, item kind, and price bounds are editable in the catalog JSON.

## Schema

| Column | Meaning |
| --- | --- |
| `listing_id` | Synthetic sequential row identifier. |
| `category`, `item_type`, `brand`, `variant` | Product catalog identity and selected catalog attributes. |
| `pack_quantity` | Number of units in the listing; `original_price_inr` represents the total pack/listing retail estimate. |
| `item_kind` | `reusable`, `consumable`, or `perishable` as defined in the catalog. |
| `original_price_inr` | Synthetic total replacement/retail price in INR. |
| `age_months`, `condition` | Listing age and selected condition. Non-reusables are generated mostly New/Like New. |
| `is_perishable`, `days_until_expiry`, `opened` | Perishability and synthetic remaining shelf-life/sealed state. Non-perishables have zero expiry days. |
| `listed_price_inr` | Generated seller ask, including modest variation or an intentionally extreme pricing scenario. Fraud model feature only. |
| `completed_sale` | Generated 0/1 sale indicator. |
| `sale_price_inr` | Generated negotiated amount for sold listings; blank otherwise. This is the price model target when sold. |
| `fair_reference_price_inr` | Latent generator reference used for auditing and to create a fraud price-deviation feature; excluded from price-model features. |
| `account_age_days`, `total_listings`, `listings_last_7_days`, `previous_reports`, `completed_sales_count`, `rejected_listings_count`, `average_price_deviation` | Synthetic seller history fields used by the anomaly detector. |
| `synthetic_suspicious_label` | Generated risk scenario marker for diagnostics; never confirmed fraud truth. |

## Generation assumptions and limitations

Catalog price ranges are per unit; a random price inside the range is multiplied by pack quantity. Reusable items depreciate with age and condition. Consumables get a category-level resale factor; perishable items additionally vary with expiry and opened state. Prices, item weights, sale likelihood, negotiation, seller profiles, and 4.5% suspicious scenario prevalence are hand-designed assumptions, not observed campus data. The catalog should be reviewed against local prices before educational demos that imply market realism.

This dataset contains no personal data, real students, real transactions, campus demand observations, or verified fraud labels. It is suitable for pipeline development and load testing, not for claims about production model accuracy. Generated price targets follow the same formula used to create input context, so holdout scores are synthetic pipeline diagnostics.

## Model use

The price model trains on completed-sale rows with `category`, `item_type`, `brand`, `variant`, `item_kind`, `condition`, `original_price_inr`, `age_months`, `pack_quantity`, `is_perishable`, `days_until_expiry`, and `opened`. It excludes the generated fair reference, listed price, synthetic risk label, and seller fields to prevent leakage. The fraud model's generated diagnostics compare anomaly ranking with the synthetic scenario label only. Production outputs require time-separated real sale validation and human-reviewed fraud outcomes.

Semantic search calls Hugging Face Inference Providers to obtain embeddings from the pretrained `sentence-transformers/all-MiniLM-L6-v2` model. Product listings are search inputs, not rows used to train or fine-tune the encoder. The query and supplied product text are sent to Hugging Face; do not include private student information.
