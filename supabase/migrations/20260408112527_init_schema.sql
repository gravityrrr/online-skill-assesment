-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create User Role Enum
CREATE TYPE public.user_role AS ENUM ('Admin', 'Instructor', 'Learner');

-- 2. Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role DEFAULT 'Learner'::public.user_role NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Courses Table
CREATE TABLE public.courses (
    course_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Assessments Table
CREATE TABLE public.assessments (
    assessment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(course_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    time_limit INT NOT NULL, -- in minutes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Questions Table
CREATE TABLE public.questions (
    question_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Results Table
CREATE TABLE public.results (
    result_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
    score INT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Helper Function to get current user role securely
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ==========================================
-- Users Policies
-- ==========================================
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Instructors and Admins can read all users" ON public.users
    FOR SELECT USING (public.get_user_role() IN ('Instructor', 'Admin'));

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- Courses Policies
-- ==========================================
CREATE POLICY "Anyone can view courses" ON public.courses
    FOR SELECT USING (true);

CREATE POLICY "Instructors and Admins can insert courses" ON public.courses
    FOR INSERT WITH CHECK (public.get_user_role() IN ('Instructor', 'Admin'));

CREATE POLICY "Instructors can update own courses or Admins can update all" ON public.courses
    FOR UPDATE USING (auth.uid() = instructor_id OR public.get_user_role() = 'Admin');

CREATE POLICY "Instructors can delete own courses or Admins can delete all" ON public.courses
    FOR DELETE USING (auth.uid() = instructor_id OR public.get_user_role() = 'Admin');

-- ==========================================
-- Assessments Policies
-- ==========================================
CREATE POLICY "Anyone can view assessments" ON public.assessments
    FOR SELECT USING (true);

CREATE POLICY "Instructors and Admins can insert assessments" ON public.assessments
    FOR INSERT WITH CHECK (public.get_user_role() IN ('Instructor', 'Admin'));

CREATE POLICY "Instructors and Admins can update assessments" ON public.assessments
    FOR UPDATE USING (public.get_user_role() IN ('Instructor', 'Admin'));

CREATE POLICY "Instructors and Admins can delete assessments" ON public.assessments
    FOR DELETE USING (public.get_user_role() IN ('Instructor', 'Admin'));

-- ==========================================
-- Questions Policies & Security constraints
-- ==========================================
-- Anyone can read available items to see questions, Admin/Instructors can manage
CREATE POLICY "Anyone can view questions" ON public.questions
    FOR SELECT USING (true);

CREATE POLICY "Instructors and Admins can manage questions" ON public.questions
    FOR ALL USING (public.get_user_role() IN ('Instructor', 'Admin'));

-- IMPORTANT: RLS is row-level. To fulfill the column restriction (hiding correct_answer), 
-- we revoke general select and re-grant on specific columns for the Learner (authenticated)
REVOKE SELECT ON TABLE public.questions FROM authenticated, anon;
GRANT SELECT (question_id, assessment_id, question_text, options, created_at) ON public.questions TO authenticated;
-- Notice how `correct_answer` is strictly omitted!
-- The Edge Function operating on a Service Role will be able to read constraints. 
GRANT ALL ON TABLE public.questions TO service_role;

-- ==========================================
-- Results Policies
-- ==========================================
CREATE POLICY "Users can read own results" ON public.results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Instructors and Admins can read all results" ON public.results
    FOR SELECT USING (public.get_user_role() IN ('Instructor', 'Admin'));

-- Note: No INSERT policy for Learner on results. 
-- The Edge Function (using service_role key) will securely bypass RLS to insert Results,
-- preventing any client-side tampering of scores!
