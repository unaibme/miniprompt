<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1B-rJpCoV8dFuwVmikj3qCAnq7nQC4kMZ

## Run Locally

**Prerequisites:**  Node.js and a Supabase account

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to your project's SQL Editor and run the SQL from `supabase-schema.sql` to create the notes table
   - Go to Project Settings > API to get your project URL and anon key

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory with:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key  # Optional, for note refinement feature
   ```

4. **Run the app:**
   ```bash
   npm run dev
   ```

### Supabase Database Setup

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL to create the `notes` table and set up the necessary policies

The schema includes:
- A `notes` table with id, title, content, color, created_at, and updated_at fields
- Row Level Security (RLS) policies (currently allowing all operations)
- Automatic timestamp updates
- Indexes for performance
