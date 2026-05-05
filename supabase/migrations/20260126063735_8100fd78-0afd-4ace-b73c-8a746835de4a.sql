-- Vehicle Dimension Table
CREATE TABLE public.dim_vehicle (
  vehicle_id TEXT PRIMARY KEY,
  vehicle_code TEXT,
  vehicle_type TEXT NOT NULL,
  vehicle_class TEXT,
  seat_capacity INTEGER,
  vehicle_model TEXT,
  fleet_id TEXT,
  in_service_date DATE,
  retired_date DATE,
  active_flag BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NPS Response Aggregated Table
CREATE TABLE public.fact_nps_response (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  route_id TEXT,
  customer_type TEXT,
  promoters_count INTEGER DEFAULT 0,
  passives_count INTEGER DEFAULT 0,
  detractors_count INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NPS Response Raw Table
CREATE TABLE public.fact_nps_response_raw (
  nps_response_id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  route_id TEXT,
  customer_type TEXT,
  nps_score INTEGER,
  survey_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vehicle Revenue Table
CREATE TABLE public.fact_vehicle_revenue (
  revenue_id TEXT PRIMARY KEY,
  vehicle_id TEXT,
  fleet_id TEXT,
  revenue_date DATE,
  ticket_revenue BIGINT,
  ancillary_revenue BIGINT,
  total_revenue BIGINT,
  operating_cost BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Sales Table
CREATE TABLE public.fact_ticket_sales (
  ticket_id TEXT PRIMARY KEY,
  trip_id TEXT,
  customer_id TEXT,
  seat_number INTEGER,
  fare_amount INTEGER,
  ticket_status TEXT,
  purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trip Table
CREATE TABLE public.fact_trip (
  trip_id TEXT PRIMARY KEY,
  route_id TEXT,
  vehicle_id TEXT,
  driver_id TEXT,
  trip_date DATE,
  scheduled_departure_time TIMESTAMPTZ,
  actual_departure_time TIMESTAMPTZ,
  scheduled_arrival_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  delay_minutes INTEGER DEFAULT 0,
  is_on_time BOOLEAN DEFAULT true,
  trip_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Metadata Tables
CREATE TABLE public.metadata_data_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  data_type TEXT,
  business_definition TEXT,
  is_primary_key BOOLEAN DEFAULT false,
  agent_usage_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.metadata_business_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  full_name TEXT,
  business_definition TEXT,
  category TEXT,
  agent_guidance TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS with public read policies
ALTER TABLE public.dim_vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_nps_response ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_nps_response_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_vehicle_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata_data_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata_business_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.dim_vehicle FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_nps_response FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_nps_response_raw FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_vehicle_revenue FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_ticket_sales FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_trip FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.metadata_data_dictionary FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.metadata_business_dictionary FOR SELECT USING (true);

-- Create indexes
CREATE INDEX idx_fact_nps_response_route ON public.fact_nps_response(route_id);
CREATE INDEX idx_fact_nps_response_raw_route ON public.fact_nps_response_raw(route_id);
CREATE INDEX idx_fact_vehicle_revenue_vehicle ON public.fact_vehicle_revenue(vehicle_id);
CREATE INDEX idx_fact_ticket_sales_trip ON public.fact_ticket_sales(trip_id);
CREATE INDEX idx_fact_trip_route ON public.fact_trip(route_id);
CREATE INDEX idx_fact_trip_vehicle ON public.fact_trip(vehicle_id);