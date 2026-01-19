-- ============================================
-- FLEETZY: Create rental_charges table
-- Run this SQL in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/xmixxqtcgaydasejshwn/sql/new
-- ============================================

-- Create the rental_charges table
CREATE TABLE IF NOT EXISTS rental_charges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id uuid REFERENCES rentals(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    charge_type text NOT NULL,  -- 'toll', 'damage', 'cleaning', 'late_fee', 'deposit_replenish', 'mileage_overage', 'other'
    amount numeric(10,2) NOT NULL,
    description text,
    charge_date date NOT NULL DEFAULT CURRENT_DATE,
    due_with_payment date,  -- Links charge to a specific payment due date
    receipt_url text,  -- URL to uploaded receipt image
    notes text,
    status text NOT NULL DEFAULT 'pending',  -- 'pending', 'applied', 'waived'
    applied_to_payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
    applied_at timestamp,
    waived_at timestamp,
    waived_reason text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rental_charges_rental_id ON rental_charges(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_charges_status ON rental_charges(status);
CREATE INDEX IF NOT EXISTS idx_rental_charges_customer_id ON rental_charges(customer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE rental_charges ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for admin dashboard - adjust as needed)
CREATE POLICY "Allow all operations for anon" ON rental_charges
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE rental_charges IS 'Stores additional charges like tolls, damages, cleaning fees, etc.';

-- ============================================
-- VERIFY TABLE WAS CREATED:
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'rental_charges'
ORDER BY ordinal_position;
