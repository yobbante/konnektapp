-- Populate price_s/m/l/xl from price_per_kg for existing routier offers
-- Using multipliers: S=1x, M=1.5x, L=2.5x, XL=4x based on weight tiers
UPDATE gp_offers
SET 
  price_s = CASE 
    WHEN price_per_kg < 100 THEN price_per_kg * 5000  -- low price_per_kg means it was per-kg, multiply by avg S weight
    ELSE price_per_kg  -- already in FCFA absolute
  END,
  price_m = CASE 
    WHEN price_per_kg < 100 THEN price_per_kg * 8000
    ELSE ROUND(price_per_kg * 1.5)
  END,
  price_l = CASE 
    WHEN price_per_kg < 100 THEN price_per_kg * 15000
    ELSE ROUND(price_per_kg * 2.5)
  END,
  price_xl = CASE 
    WHEN price_per_kg < 100 THEN price_per_kg * 25000
    ELSE ROUND(price_per_kg * 4)
  END
WHERE transport_type = 'routier'
  AND price_s IS NULL;