# Data Relationships & Handoff Notes (for Deepakshi)

```
User 1──* Product        (Product.sellerId)
User 1──* Interest       (as buyer: Interest.buyerId · as seller: Interest.sellerId)
Product 1──* Interest    (Interest.productId)        unique (productId, buyerId)
User 1──* Transaction    (buyerId, sellerId)
Product 1──1 Transaction (productId)                 unique while PENDING/COMPLETED
User 1──* Report         (Report.reportedBy)
Product 1──* Report      (Report.productId)          unique (productId, reportedBy)
User 1──* Settings       (Settings.updatedBy, admin only)
```

All refs are `ObjectId` with `ref: '<Model>'`, so use `.populate()`:
```js
Product.findById(id).populate('sellerId', 'name email profileImage');
Interest.find({ sellerId: req.user.id }).populate('productId', 'title price images').populate('buyerId', 'name email');
```

## Rules the API must keep
- **Passwords**: store a bcrypt hash in `passwordHash`. It is `select: false`, so login needs `User.findOne({ email }).select('+passwordHash')`. `toJSON` strips it anyway.
- **Email** is lowercased and unique. On duplicate, catch `err.code === 11000` and return 409.
- **sellerId on Interest/Transaction**: copy it from the product (`product.sellerId`), never from the request body.
- **Commission**: create transactions with `commissionRate: await Settings.get('commissionRate', 5)`. The model computes `commissionAmount` and `sellerAmount` in `pre('validate')`. Don't send those from the client.
- **Images**: only Cloudinary `https://res.cloudinary.com/...` URLs are accepted (schema validator). 1–5 per product.
- **Soft delete**: set `status: 'REMOVED'`; don't hard-delete products (transactions/reports reference them).
- Enums live in `models/constants.js`. Share them with the frontend/Zod schemas so values stay in sync.

## Upload flow (Week 3)
```js
import { uploadProductImages, handleUploadErrors } from '../middleware/upload.js';
import { uploadImages } from '../services/cloudinary.js';

router.post('/products', protect, uploadProductImages, handleUploadErrors, async (req, res) => {
  const images = await uploadImages(req.files);               // → ['https://res.cloudinary.com/...']
  const product = await Product.create({ ...req.body, images, sellerId: req.user.id });
  res.status(201).json({ success: true, product });
});
```
Frontend must send `multipart/form-data` with field name **`images`** (max 5 files, 5MB each, jpg/png/webp).
On delete or image replace, call `deleteImages(oldUrls)` to free Cloudinary storage.

## Query patterns that hit the indexes (Week 3)
| Use case | Query shape | Index |
|---|---|---|
| Marketplace feed | `{status:'AVAILABLE'}` sort `{createdAt:-1}` | `status_1_createdAt_-1` |
| Category + price | `{status, category, price:{$gte,$lte}}` | `status_1_category_1_price_1` |
| Condition + location | `{status, condition, location}` | `status_1_condition_1_location_1` |
| Keyword search | `{$text:{$search:q}, status}` sort by `textScore` | `product_text_search` (title×10, brand×5, desc×1) |
| My Listings | `{sellerId}` sort `{createdAt:-1}` | `sellerId_1_status_1_createdAt_-1` |

Always include `status` in marketplace queries so they use these indexes. Paginate with `.skip((page-1)*limit).limit(limit)` (limit ≤ 50). That's fine at this scale; switch to cursor (`createdAt < lastSeen`) pagination if listings go past ~10k.
