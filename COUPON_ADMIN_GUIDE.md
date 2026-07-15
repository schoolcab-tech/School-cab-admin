# Coupon Code Management System - Admin Guide

## Overview

The School Cab app now supports a flexible coupon code system that allows admins to create and manage discount codes for different subscription periods. This system replaces the static discount model with a dynamic, coupon-driven approach.

## Database Schema

### Table: `coupon_codes`

```sql
CREATE TABLE coupon_codes (
  coupon_id BIGSERIAL PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  applicable_months INTEGER NOT NULL CHECK (applicable_months = ANY (ARRAY[1, 3, 6, 12])),
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type = ANY (ARRAY['percentage', 'fixed_amount'])),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_admin UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Coupon Code System Features

### 1. Payment Plan Options
The system supports these subscription periods:
- **1 Month** - Monthly payment
- **3 Months** - Quarterly payment
- **6 Months** - Semi-annual payment  
- **12 Months** - Annual payment

### 2. Discount Types
- **Percentage Discount**: Percentage off the total amount (e.g., 33.33% = 1 month free for quarterly)
- **Fixed Amount**: Fixed rupee amount off (e.g., ₹500 off)

### 3. Coupon Code Examples

#### Current Sample Data:
```sql
-- Quarterly Payment (3 months) - 1 month free equivalent
INSERT INTO coupon_codes (code, name, description, applicable_months, discount_type, discount_value) 
VALUES ('QuarterlyPay', 'Quarterly Payment Discount', 'Save 33.33% on 3-month subscription payments (equivalent to 1 month free)', 3, 'percentage', 33.33);

-- Semi-Annual Payment (6 months) - 1 month free equivalent  
INSERT INTO coupon_codes (code, name, description, applicable_months, discount_type, discount_value)
VALUES ('SemiAnnualSave', 'Semi-Annual Savings', 'Save 16.67% on 6-month subscription payments (equivalent to 1 month free)', 6, 'percentage', 16.67);

-- Annual Payment (12 months) - 1 month free equivalent
INSERT INTO coupon_codes (code, name, description, applicable_months, discount_type, discount_value)
VALUES ('YearlyDiscount', 'Annual Payment Discount', 'Save 8.33% on 12-month subscription payments (equivalent to 1 month free)', 12, 'percentage', 8.33);

-- Monthly Special - Fixed amount discount
INSERT INTO coupon_codes (code, name, description, applicable_months, discount_type, discount_value)
VALUES ('MonthlySpecial', 'Monthly Special Offer', 'Save ₹50 on monthly subscription payments', 1, 'fixed_amount', 50);
```

## Admin Panel Requirements

### 1. Coupon Management Interface

#### Create New Coupon
```typescript
interface CreateCouponForm {
  code: string;              // Coupon code (e.g., "SAVE20", "QuarterlyPay")
  name: string;              // Display name
  description?: string;       // Optional description
  applicable_months: 1 | 3 | 6 | 12;  // Which subscription period
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;     // Percentage (0-100) or amount in rupees
  max_uses?: number;         // Optional usage limit
  valid_from?: Date;         // Start date (default: today)
  valid_until?: Date;        // End date (optional)
  is_active: boolean;        // Active/inactive status
}
```

#### List/View Coupons
Display table with columns:
- Code
- Name  
- Applicable Period (1/3/6/12 months)
- Discount Type & Value
- Usage Count / Max Uses
- Valid From - Valid Until
- Status (Active/Inactive)
- Actions (Edit, Delete, Toggle Status)

#### Edit Coupon
Allow editing all fields except:
- `code` (should be immutable once created)
- `used_count` (system managed)

### 2. API Endpoints Needed

#### Get All Coupons
```typescript
GET /api/admin/coupons
// Returns list of all coupons with usage statistics
```

#### Create Coupon
```typescript
POST /api/admin/coupons
{
  "code": "NEWCODE",
  "name": "New Discount",
  "applicable_months": 3,
  "discount_type": "percentage", 
  "discount_value": 25.0,
  "max_uses": 100,
  "valid_until": "2024-12-31"
}
```

#### Update Coupon
```typescript
PUT /api/admin/coupons/:coupon_id
// Update coupon details (except code and used_count)
```

#### Delete/Deactivate Coupon
```typescript
DELETE /api/admin/coupons/:coupon_id
// Soft delete by setting is_active = false
```

#### Get Coupon Usage Statistics
```typescript
GET /api/admin/coupons/:coupon_id/usage
// Returns usage stats, recent transactions, etc.
```

### 3. Validation Rules

#### Coupon Code
- Must be unique
- 3-20 characters
- Alphanumeric + underscore/hyphen only
- Case insensitive

#### Discount Value
- **Percentage**: 0.01 to 100.00
- **Fixed Amount**: Must be positive number (in rupees)

#### Applicable Months
- Must be one of: 1, 3, 6, 12

#### Date Validation
- `valid_from` cannot be in the past (for new coupons)
- `valid_until` must be after `valid_from`

### 4. Business Logic

#### Coupon Application Rules
1. Coupon must be active (`is_active = true`)
2. Current date must be within valid period
3. Must match selected subscription period (`applicable_months`)
4. Must not exceed usage limit (if set)
5. Only one coupon can be applied per transaction

#### Discount Calculation
```typescript
function calculateDiscount(
  baseAmount: number, 
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return (baseAmount * discountValue) / 100;
  } else {
    return Math.min(discountValue, baseAmount); // Don't exceed base amount
  }
}
```

## Mobile App Integration

### User Flow
1. User selects subscription period (1, 3, 6, or 12 months)
2. System shows payment options with automatic discounts
3. User can enter coupon code in dedicated input field
4. System validates coupon for selected period
5. If valid, additional discount is applied on top of plan discount
6. Final amount is calculated and shown in payment summary

### Key Features Implemented
- ✅ Coupon code input field with validation
- ✅ Real-time coupon validation
- ✅ Automatic discount calculation
- ✅ Clear payment summary showing all discounts
- ✅ Coupon reset when changing subscription periods
- ✅ Success/error messages for coupon application

## Recommended Admin Features

### 1. Dashboard Widgets
- Total active coupons
- Most used coupons this month
- Total savings provided to users
- Revenue impact analysis

### 2. Bulk Operations
- Bulk activate/deactivate coupons
- Export coupon usage reports
- Clone existing coupons

### 3. Analytics
- Coupon usage trends
- Conversion rates by coupon type
- Revenue impact per coupon

### 4. Campaign Management
- Schedule coupon activation/deactivation
- Email marketing integration
- Push notification for new coupons

## Implementation Notes

### Security Considerations
- Admin authentication required for all coupon management operations
- Audit trail for coupon creation/modification
- Rate limiting on coupon validation API
- Input sanitization and validation

### Performance
- Cache active coupons for faster validation
- Index on `code` and `applicable_months` columns
- Consider pagination for large coupon lists

### Monitoring
- Track coupon usage patterns
- Monitor for potential abuse (same user, multiple accounts)
- Alert on unusually high usage of specific coupons

## Support Information

### Database Queries

#### Most Used Coupons
```sql
SELECT 
  c.code,
  c.name,
  c.used_count,
  c.discount_type,
  c.discount_value
FROM coupon_codes c 
WHERE c.is_active = true 
ORDER BY c.used_count DESC 
LIMIT 10;
```

#### Revenue Impact
```sql
SELECT 
  sp.coupon_code,
  COUNT(*) as usage_count,
  SUM(sp.discount_applied) as total_discount_given
FROM subscription_payments sp 
WHERE sp.coupon_code IS NOT NULL 
  AND sp.transaction_status = 'completed'
GROUP BY sp.coupon_code
ORDER BY total_discount_given DESC;
```

### Troubleshooting
- If coupon not applying: Check active status, date validity, usage limits
- For discount calculation issues: Verify discount_type and discount_value
- Performance issues: Check database indexes on coupon_codes table

---

**Last Updated**: October 2024  
**Version**: 1.0  
**Contact**: Development Team