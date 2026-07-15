-- Create a function to create a driver with service areas and school assignments
CREATE OR REPLACE FUNCTION create_driver_with_service_areas(
  p_driver_data JSONB,
  p_pincodes TEXT[],
  p_school_ids BIGINT[]
) RETURNS JSONB AS $$
DECLARE
  v_driver_id BIGINT;
  v_pincode TEXT;
  v_school_id BIGINT;
  v_result JSONB;
BEGIN
  -- Insert the driver
  INSERT INTO drivers (
    user_id, name, phone, email, emergency_contact, emergency_phone,
    address, city, state, pincode, country, cab_number, cab_capacity,
    license_number, vehicle_type, registration_number, insurance_details,
    is_active, is_verified, schools_serving
  ) VALUES (
    (p_driver_data->>'userId')::UUID,
    p_driver_data->>'name',
    p_driver_data->>'phone',
    p_driver_data->>'email',
    p_driver_data->>'emergencyContact',
    p_driver_data->>'emergencyPhone',
    p_driver_data->>'address',
    p_driver_data->>'city',
    p_driver_data->>'state',
    p_driver_data->>'pincode',
    p_driver_data->>'country',
    p_driver_data->>'cabNumber',
    (p_driver_data->>'cabCapacity')::INTEGER,
    p_driver_data->>'licenseNumber',
    p_driver_data->>'vehicleType',
    p_driver_data->>'registrationNumber',
    p_driver_data->>'insuranceDetails',
    COALESCE((p_driver_data->>'isActive')::BOOLEAN, TRUE),
    COALESCE((p_driver_data->>'isVerified')::BOOLEAN, FALSE),
    p_school_ids
  )
  RETURNING driver_id INTO v_driver_id;

  -- Insert service areas
  FOREACH v_pincode IN ARRAY p_pincodes LOOP
    INSERT INTO driver_service_areas (driver_id, pincode)
    VALUES (v_driver_id, v_pincode);
  END LOOP;

  -- Return the created driver
  SELECT to_jsonb(drivers.*) INTO v_result
  FROM drivers
  WHERE driver_id = v_driver_id;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating driver: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update a driver with service areas and school assignments
CREATE OR REPLACE FUNCTION update_driver_with_service_areas(
  p_driver_id BIGINT,
  p_driver_data JSONB,
  p_pincodes TEXT[],
  p_school_ids BIGINT[]
) RETURNS JSONB AS $$
DECLARE
  v_pincode TEXT;
  v_school_id BIGINT;
  v_result JSONB;
BEGIN
  -- Update the driver
  UPDATE drivers
  SET 
    name = COALESCE(p_driver_data->>'name', name),
    phone = COALESCE(p_driver_data->>'phone', phone),
    email = COALESCE(p_driver_data->>'email', email),
    emergency_contact = COALESCE(p_driver_data->>'emergencyContact', emergency_contact),
    emergency_phone = COALESCE(p_driver_data->>'emergencyPhone', emergency_phone),
    address = COALESCE(p_driver_data->>'address', address),
    city = COALESCE(p_driver_data->>'city', city),
    state = COALESCE(p_driver_data->>'state', state),
    pincode = COALESCE(p_driver_data->>'pincode', pincode),
    country = COALESCE(p_driver_data->>'country', country),
    cab_number = COALESCE(p_driver_data->>'cabNumber', cab_number),
    cab_capacity = COALESCE((p_driver_data->>'cabCapacity')::INTEGER, cab_capacity),
    license_number = COALESCE(p_driver_data->>'licenseNumber', license_number),
    vehicle_type = COALESCE(p_driver_data->>'vehicleType', vehicle_type),
    registration_number = COALESCE(p_driver_data->>'registrationNumber', registration_number),
    insurance_details = COALESCE(p_driver_data->>'insuranceDetails', insurance_details),
    is_active = COALESCE((p_driver_data->>'isActive')::BOOLEAN, is_active),
    is_verified = COALESCE((p_driver_data->>'isVerified')::BOOLEAN, is_verified),
    schools_serving = COALESCE(p_school_ids, schools_serving),
    updated_at = NOW()
  WHERE driver_id = p_driver_id
  RETURNING to_jsonb(drivers.*) INTO v_result;

  -- Update service areas (delete existing and insert new)
  DELETE FROM driver_service_areas WHERE driver_id = p_driver_id;
  
  FOREACH v_pincode IN ARRAY p_pincodes LOOP
    INSERT INTO driver_service_areas (driver_id, pincode)
    VALUES (p_driver_id, v_pincode);
  END LOOP;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating driver: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for driver details with service areas
CREATE OR REPLACE VIEW driver_details AS
SELECT 
  d.*,
  (
    SELECT jsonb_agg(dsa.pincode)
    FROM driver_service_areas dsa
    WHERE dsa.driver_id = d.driver_id
  ) AS service_areas
FROM drivers d;

-- Create a function to get driver statistics
CREATE OR REPLACE FUNCTION get_driver_stats(p_driver_id BIGINT)
RETURNS TABLE(
  total_trips BIGINT,
  total_students BIGINT,
  total_schools BIGINT,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  trip_counts AS (
    SELECT 
      COUNT(*) AS total_trips,
      COUNT(DISTINCT student_id) AS total_students,
      COUNT(DISTINCT school_id) AS total_schools
    FROM bookings
    WHERE driver_id = p_driver_id
  ),
  rating_avg AS (
    SELECT COALESCE(AVG(rating), 0) AS avg_rating
    FROM reviews
    WHERE driver_id = p_driver_id
  )
  SELECT 
    tc.total_trips,
    tc.total_students,
    tc.total_schools,
    ROUND(COALESCE(ra.avg_rating, 0), 1) AS avg_rating
  FROM trip_counts tc, rating_avg ra;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create a function to get driver earnings
CREATE OR REPLACE FUNCTION get_driver_earnings(p_driver_id BIGINT)
RETURNS TABLE(
  total_earnings NUMERIC,
  pending_withdrawal NUMERIC,
  total_withdrawn NUMERIC,
  last_payout_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  earnings AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE driver_id = p_driver_id
    AND status = 'completed'
  ),
  pending_withdrawals AS (
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM driver_withdrawals
    WHERE driver_id = p_driver_id
    AND status = 'pending'
  ),
  completed_withdrawals AS (
    SELECT 
      COALESCE(SUM(amount), 0) AS total,
      MAX(processed_date) AS last_date
    FROM driver_withdrawals
    WHERE driver_id = p_driver_id
    AND status = 'completed'
  )
  SELECT 
    e.total AS total_earnings,
    pw.total AS pending_withdrawal,
    cw.total AS total_withdrawn,
    cw.last_date AS last_payout_date
  FROM earnings e, pending_withdrawals pw, completed_withdrawals cw;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
