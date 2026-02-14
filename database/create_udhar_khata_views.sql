-- Create views for Udhar Khata (Credit Book)

-- 1. Customer outstanding balance view
CREATE OR REPLACE VIEW customer_outstanding AS
SELECT 
  c.id as customer_id,
  c.company_name,
  c.contact_person,
  c.phone,
  c.email,
  COALESCE(SUM(s.amount), 0) as total_sales,
  COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.amount ELSE 0 END), 0) as paid_amount,
  COALESCE(SUM(CASE WHEN s.status = 'pending' THEN s.amount ELSE 0 END), 0) as outstanding_amount,
  COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_invoices,
  MAX(CASE WHEN s.status = 'completed' THEN s.sale_date END) as last_payment_date,
  CURRENT_DATE - MAX(CASE WHEN s.status = 'completed' THEN s.sale_date END) as days_since_last_payment
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id
GROUP BY c.id, c.company_name, c.contact_person, c.phone, c.email
HAVING COALESCE(SUM(CASE WHEN s.status = 'pending' THEN s.amount ELSE 0 END), 0) > 0
ORDER BY outstanding_amount DESC;

-- 2. Party-wise ledger view (complete transaction history)
CREATE OR REPLACE VIEW party_ledger AS
SELECT 
  c.id as customer_id,
  c.company_name,
  c.contact_person,
  s.id as transaction_id,
  s.sale_date as transaction_date,
  s.description,
  s.amount,
  s.status as payment_status,
  s.invoice_number,
  CASE 
    WHEN s.status = 'completed' THEN s.amount
    ELSE 0
  END as credit,
  CASE 
    WHEN s.status = 'pending' THEN s.amount
    ELSE 0
  END as debit,
  SUM(CASE 
    WHEN s.status = 'pending' THEN s.amount
    ELSE -s.amount
  END) OVER (
    PARTITION BY c.id 
    ORDER BY s.sale_date, s.id
  ) as running_balance
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id
ORDER BY c.id, s.sale_date DESC, s.id DESC;

-- 3. Top defaulters view (customers with highest overdue amounts)
CREATE OR REPLACE VIEW top_defaulters AS
SELECT 
  c.id as customer_id,
  c.company_name,
  c.contact_person,
  c.phone,
  COALESCE(SUM(s.amount), 0) as overdue_amount,
  COUNT(s.id) as overdue_invoices,
  MIN(s.sale_date) as oldest_invoice_date,
  CURRENT_DATE - MIN(s.sale_date) as days_overdue,
  CASE 
    WHEN CURRENT_DATE - MIN(s.sale_date) > 90 THEN 'Critical'
    WHEN CURRENT_DATE - MIN(s.sale_date) > 60 THEN 'High'
    WHEN CURRENT_DATE - MIN(s.sale_date) > 30 THEN 'Medium'
    ELSE 'Low'
  END as risk_level
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'pending'
GROUP BY c.id, c.company_name, c.contact_person, c.phone
HAVING COALESCE(SUM(s.amount), 0) > 0
ORDER BY overdue_amount DESC;

-- 4. Payment collection trend
CREATE OR REPLACE VIEW payment_collection_trend AS
SELECT 
  DATE_TRUNC('month', s.sale_date) as month,
  COUNT(DISTINCT c.id) as unique_customers,
  COUNT(s.id) as total_transactions,
  SUM(s.amount) as total_amount,
  SUM(CASE WHEN s.status = 'completed' THEN s.amount ELSE 0 END) as collected_amount,
  SUM(CASE WHEN s.status = 'pending' THEN s.amount ELSE 0 END) as pending_amount,
  ROUND(
    (SUM(CASE WHEN s.status = 'completed' THEN s.amount ELSE 0 END)::DECIMAL / 
     NULLIF(SUM(s.amount), 0) * 100), 2
  ) as collection_percentage
FROM customers c
JOIN sales s ON c.id = s.customer_id
WHERE s.sale_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', s.sale_date)
ORDER BY month DESC;

-- 5. Customer credit score view
CREATE OR REPLACE VIEW customer_credit_score AS
SELECT 
  c.id as customer_id,
  c.company_name,
  COUNT(s.id) as total_transactions,
  SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as paid_transactions,
  SUM(CASE WHEN s.status = 'pending' AND s.sale_date < CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) as late_transactions,
  ROUND(
    (SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / 
     NULLIF(COUNT(s.id), 0) * 100), 2
  ) as payment_success_rate,
  COALESCE(AVG(CASE 
    WHEN s.status = 'completed' THEN 
      EXTRACT(EPOCH FROM (s.updated_at - s.sale_date)) / 86400 
  END), 0) as avg_payment_days,
  CASE 
    WHEN ROUND((SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(s.id), 0) * 100), 2) >= 90 THEN 'Excellent'
    WHEN ROUND((SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(s.id), 0) * 100), 2) >= 75 THEN 'Good'
    WHEN ROUND((SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(s.id), 0) * 100), 2) >= 50 THEN 'Average'
    ELSE 'Poor'
  END as credit_rating,
  CASE 
    WHEN ROUND((SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(s.id), 0) * 100), 2) >= 90 THEN 100000
    WHEN ROUND((SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(s.id), 0) * 100), 2) >= 75 THEN 50000
    WHEN ROUND((SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(s.id), 0) * 100), 2) >= 50 THEN 25000
    ELSE 10000
  END as recommended_credit_limit
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id
GROUP BY c.id, c.company_name
HAVING COUNT(s.id) > 0
ORDER BY payment_success_rate DESC, total_transactions DESC;

-- Grant permissions
GRANT SELECT ON customer_outstanding TO PUBLIC;
GRANT SELECT ON party_ledger TO PUBLIC;
GRANT SELECT ON top_defaulters TO PUBLIC;
GRANT SELECT ON payment_collection_trend TO PUBLIC;
GRANT SELECT ON customer_credit_score TO PUBLIC;

-- Add comments
COMMENT ON VIEW customer_outstanding IS 'Shows customers with outstanding payments';
COMMENT ON VIEW party_ledger IS 'Complete transaction history per customer (like traditional khata)';
COMMENT ON VIEW top_defaulters IS 'Customers with overdue payments, sorted by risk';
COMMENT ON VIEW payment_collection_trend IS 'Monthly payment collection statistics';
COMMENT ON VIEW customer_credit_score IS 'Credit rating and recommended limits per customer';

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Udhar Khata Views Created Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Views Created:';
  RAISE NOTICE '  1. customer_outstanding';
  RAISE NOTICE '  2. party_ledger';
  RAISE NOTICE '  3. top_defaulters';
  RAISE NOTICE '  4. payment_collection_trend';
  RAISE NOTICE '  5. customer_credit_score';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage Examples:';
  RAISE NOTICE '  SELECT * FROM customer_outstanding;';
  RAISE NOTICE '  SELECT * FROM party_ledger WHERE customer_id = 1;';
  RAISE NOTICE '  SELECT * FROM top_defaulters WHERE risk_level = ''Critical'';';
  RAISE NOTICE '========================================';
END $$;
