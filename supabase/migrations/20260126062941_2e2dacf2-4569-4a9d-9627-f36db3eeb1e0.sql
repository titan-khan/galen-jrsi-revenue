-- Transportation Data Model

-- Station Dimension
CREATE TABLE public.dim_station (
  station_id TEXT PRIMARY KEY,
  station_name TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  station_type TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  active_flag BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Route Dimension
CREATE TABLE public.dim_route (
  route_id TEXT PRIMARY KEY,
  origin_station_id TEXT REFERENCES public.dim_station(station_id),
  destination_station_id TEXT REFERENCES public.dim_station(station_id),
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  route_name TEXT NOT NULL,
  route_type TEXT NOT NULL,
  distance_km INTEGER,
  eta_est INTEGER,
  active_flag BOOLEAN DEFAULT true,
  price_card INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Dimension
CREATE TABLE public.dim_customer (
  customer_id TEXT PRIMARY KEY,
  customer_type TEXT NOT NULL,
  gender TEXT,
  age_group TEXT,
  loyalty_tier TEXT,
  home_city TEXT,
  first_trip_date DATE,
  active_flag BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Driver Dimension
CREATE TABLE public.dim_driver (
  driver_id TEXT PRIMARY KEY,
  driver_name TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  license_level TEXT,
  experience_years INTEGER,
  base_station_id TEXT,
  hire_date DATE,
  active_flag BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fleet Dimension
CREATE TABLE public.dim_fleet (
  fleet_id TEXT PRIMARY KEY,
  fleet_name TEXT NOT NULL,
  fleet_category TEXT NOT NULL,
  operator TEXT,
  vehicle_type TEXT,
  capex_cost BIGINT,
  opex_cost_per_month BIGINT,
  service_level TEXT,
  active_flag BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Time Dimension
CREATE TABLE public.dim_time (
  time_id INTEGER PRIMARY KEY,
  date DATE NOT NULL,
  day INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  week_of_year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  quarter INTEGER NOT NULL,
  year INTEGER NOT NULL,
  is_weekend BOOLEAN DEFAULT false,
  is_holiday BOOLEAN DEFAULT false,
  is_peak_season BOOLEAN DEFAULT false
);

-- Funnel/Session Fact
CREATE TABLE public.fact_funnel (
  session_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  homepage_flag BOOLEAN DEFAULT false,
  trip_input_page_flag BOOLEAN DEFAULT false,
  trip_option_page_flag BOOLEAN DEFAULT false,
  seat_option_page_flag BOOLEAN DEFAULT false,
  booking_page_flag BOOLEAN DEFAULT false,
  order_id TEXT,
  customer_id TEXT REFERENCES public.dim_customer(customer_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revenue/Orders Fact
CREATE TABLE public.fact_revenue (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES public.dim_customer(customer_id),
  trip_id TEXT,
  driver_id TEXT REFERENCES public.dim_driver(driver_id),
  vehicle_id TEXT,
  route_id TEXT REFERENCES public.dim_route(route_id),
  origin_city TEXT,
  destination_city TEXT,
  gross_value_amount INTEGER,
  ticket_status TEXT,
  payment_status TEXT,
  booking_datetime TIMESTAMPTZ,
  depart_datetime_est TIMESTAMPTZ,
  arrival_datetime_est TIMESTAMPTZ,
  eta_est INTEGER,
  depart_datetime_act TIMESTAMPTZ,
  arrival_datetime_act TIMESTAMPTZ,
  outlet_id TEXT,
  service_type_id TEXT,
  round_trip_status BOOLEAN DEFAULT false,
  seat_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Driver Trip Log
CREATE TABLE public.fact_driver_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id TEXT REFERENCES public.dim_driver(driver_id),
  driver_name TEXT,
  employment_type TEXT,
  scheduled_trip_id TEXT,
  trip_id TEXT,
  origin_city TEXT,
  destination_city TEXT,
  base_station_id TEXT,
  depart_datetime_est TIMESTAMPTZ,
  arrival_datetime_est TIMESTAMPTZ,
  eta_est INTEGER,
  depart_datetime_act TIMESTAMPTZ,
  arrival_datetime_act TIMESTAMPTZ,
  vehicle_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_fact_revenue_customer ON public.fact_revenue(customer_id);
CREATE INDEX idx_fact_revenue_driver ON public.fact_revenue(driver_id);
CREATE INDEX idx_fact_revenue_route ON public.fact_revenue(route_id);
CREATE INDEX idx_fact_revenue_booking_date ON public.fact_revenue(booking_datetime);
CREATE INDEX idx_fact_funnel_customer ON public.fact_funnel(customer_id);
CREATE INDEX idx_fact_driver_log_driver ON public.fact_driver_log(driver_id);

-- Enable RLS but allow public read for analytics
ALTER TABLE public.dim_station ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_route ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_driver ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_driver_log ENABLE ROW LEVEL SECURITY;

-- Public read policies for analytics dashboards
CREATE POLICY "Allow public read" ON public.dim_station FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.dim_route FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.dim_customer FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.dim_driver FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.dim_fleet FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.dim_time FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_funnel FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_revenue FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.fact_driver_log FOR SELECT USING (true);