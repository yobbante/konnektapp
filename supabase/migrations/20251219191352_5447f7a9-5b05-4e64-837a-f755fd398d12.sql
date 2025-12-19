-- Create enum for GP types
CREATE TYPE public.gp_type AS ENUM ('express', 'routier', 'maritime', 'aerien', 'voyageur');

-- Create enum for GP status
CREATE TYPE public.gp_status AS ENUM ('pending', 'verified', 'suspended', 'rejected');

-- Create enum for subscription type
CREATE TYPE public.gp_subscription AS ENUM ('free', 'premium');

-- Create profiles table for all users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  country_code TEXT DEFAULT 'SN',
  avatar_url TEXT,
  is_gp BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create GP profiles table
CREATE TABLE public.gp_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Basic info
  business_name TEXT NOT NULL,
  gp_type gp_type NOT NULL,
  status gp_status NOT NULL DEFAULT 'pending',
  subscription gp_subscription NOT NULL DEFAULT 'free',
  -- Contact
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  city TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'SN',
  -- KYC/KYB Documents
  id_type TEXT, -- CNI, Passport, etc.
  id_number TEXT,
  id_document_url TEXT,
  business_registration_url TEXT,
  transport_license_url TEXT,
  insurance_document_url TEXT,
  -- Professional info
  years_experience INTEGER DEFAULT 0,
  fleet_size INTEGER DEFAULT 1,
  description TEXT,
  -- Zones
  zones_covered TEXT[] DEFAULT '{}',
  international_destinations TEXT[] DEFAULT '{}',
  -- Stats
  rating NUMERIC(2,1) DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  -- Timestamps
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on gp_profiles
ALTER TABLE public.gp_profiles ENABLE ROW LEVEL SECURITY;

-- GP Profiles RLS policies
CREATE POLICY "GPs can view their own profile"
ON public.gp_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "GPs can insert their own profile"
ON public.gp_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "GPs can update their own profile"
ON public.gp_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Public can view verified GPs
CREATE POLICY "Anyone can view verified GPs"
ON public.gp_profiles FOR SELECT
USING (status = 'verified');

-- Create storage bucket for GP documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gp-documents', 
  'gp-documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Storage policies for gp-documents bucket
CREATE POLICY "Users can upload their own GP documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gp-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own GP documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gp-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own GP documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gp-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own GP documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gp-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gp_profiles_updated_at
  BEFORE UPDATE ON public.gp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();