# Supabase Setup Guide

This guide will help you set up Supabase for the Keep Clone PWA.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details:
   - Name: `keep-clone-pwa` (or any name you prefer)
   - Database Password: Choose a strong password (save it securely)
   - Region: Choose the closest region to you
4. Click "Create new project" and wait for it to be set up (takes ~2 minutes)

## Step 2: Set Up the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

This will create:
- The `notes` table with all necessary columns
- Indexes for performance
- Row Level Security policies
- Automatic timestamp updates

## Step 3: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API** (left sidebar)
2. You'll find:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon/public key**: Copy this (starts with `eyJ...`)

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the root of this project (if it doesn't exist)
2. Add the following variables:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-api-key  # Optional, only if using note refinement
```

**Important:** 
- Replace `your-project-id` with your actual Supabase project URL
- Replace `your-anon-key-here` with your actual anon key
- Never commit `.env.local` to version control (it should be in `.gitignore`)

## Step 5: Install Dependencies and Run

```bash
npm install
npm run dev
```

## Optional: Enable Real-time (for multi-device sync)

If you want real-time updates across multiple devices:

1. Go to **Database** → **Replication** in your Supabase dashboard
2. Find the `notes` table
3. Toggle **Enable Replication** to ON

Alternatively, you can uncomment the last line in `supabase-schema.sql`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
```

## Troubleshooting

### "Failed to load notes" error
- Check that your `.env.local` file has the correct Supabase URL and anon key
- Verify the database schema was created successfully (check Tables in Supabase dashboard)
- Check browser console for detailed error messages

### "Row Level Security policy violation"
- The default policy allows all operations. If you see this error, check that RLS is properly configured
- You can verify by running: `SELECT * FROM notes;` in the SQL Editor

### Real-time not working
- Make sure Replication is enabled for the `notes` table
- Check that the `supabase_realtime` publication includes the `notes` table

## Next Steps (Optional)

### Add User Authentication

If you want to make notes user-specific:

1. Uncomment the user_id column in `supabase-schema.sql`:
   ```sql
   ALTER TABLE notes ADD COLUMN user_id UUID REFERENCES auth.users(id);
   ```

2. Update the RLS policies to be user-specific:
   ```sql
   DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON notes;
   CREATE POLICY "Users can only see their own notes" ON notes
     FOR ALL
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   ```

3. Update `notesService.ts` to include `user_id` when creating/updating notes

