-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'bg-white dark:bg-slate-800',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
-- For now, we'll allow all operations (you can restrict this later based on user_id)
CREATE POLICY "Allow all operations for authenticated users" ON notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- If you want to add user-specific notes later, uncomment and modify:
-- ALTER TABLE notes ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON notes;
-- CREATE POLICY "Users can only see their own notes" ON notes
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for notes table (optional, for real-time subscriptions)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notes;

