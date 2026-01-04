export interface Recording {
  id: string;
  user_id: string;
  title: string;
  duration: number;
  r2_key: string;
  transcript: string;
  summary: string;
  status: string;
  language: string;
  created_at: string;
  updated_at: string;
  client_company?: string | null;
  client_person?: string | null;
  transcript_body?: string | null;
}

