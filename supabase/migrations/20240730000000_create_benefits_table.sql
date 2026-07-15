-- Create benefits table
CREATE TABLE IF NOT EXISTS benefits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  icon_name VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admins)
CREATE POLICY "Allow authenticated users to view benefits" ON benefits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert benefits" ON benefits
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update benefits" ON benefits
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete benefits" ON benefits
  FOR DELETE TO authenticated USING (true);

-- Create storage bucket for benefits images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('benefits-images', 'benefits-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'benefits-images');

CREATE POLICY "Allow authenticated users to view images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'benefits-images');

CREATE POLICY "Allow public to view images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'benefits-images');

CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'benefits-images');