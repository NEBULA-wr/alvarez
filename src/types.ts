export interface Profile {
  id: string;
  updated_at?: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'client';
  bio?: string;
  avatar_url?: string;
}

export interface Project {
  id: string;
  created_at?: string;
  created_by?: string;
  title: string;
  description: string;
  location?: string;
  year?: string;
  category: string;
  status: string;
  area_terreno?: number;
  area_construida?: number;
  niveles?: number;
  colaboradores?: string;
  is_draft: boolean;
  cover_url?: string;
}

export interface ProjectImage {
  id: string;
  created_at?: string;
  project_id: string;
  url: string;
  position: number;
}

export interface Message {
  id: string;
  created_at?: string;
  kind: 'Cotización' | 'Mensaje';
  name: string;
  email: string;
  phone?: string;
  project_type?: string;
  subject?: string;
  message: string;
  sender_id?: string;
  is_read: boolean;
}
