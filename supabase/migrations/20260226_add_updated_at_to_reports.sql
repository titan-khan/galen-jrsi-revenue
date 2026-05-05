-- Add updated_at column to saved_reports table
ALTER TABLE saved_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Create a trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_reports_updated_at 
  BEFORE UPDATE ON saved_reports 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
