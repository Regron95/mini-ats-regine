# Mini-ATS – Plan

## Mål
Bygga ett enkelt ATS där:
- Admin kan skapa kundkonton
- Kunder kan logga in
- Kunder kan skapa jobb
- Kunder kan lägga till kandidater
- Kunder kan se kandidater i en kanban-vy per jobb
- Kunder kan filtrera på jobb och kandidatnamn
- Admin kan göra allt kunder kan

## Tech-stack
- Frontend: React + Vite
- Styling: Tailwind CSS
- Backend: Supabase (auth + Postgres)
- Deployment: t.ex. Vercel (frontend) + Supabase (backend)

## Databas (Supabase)

### profiles
- id (uuid, references auth.users.id)
- role (enum: 'admin', 'customer')
- company_id (nullable för admin)

### companies
- id
- name

### jobs
- id
- company_id
- title
- description
- created_at

### candidates
- id
- job_id
- name
- email
- linkedin_url
- cv_text (optional)
- status (enum: 'applied', 'screening', 'interview', 'offer', 'rejected')
- created_at

## Sidor / views

### Auth
- Login-sida (Supabase auth)

### Admin
- Admin-dashboard:
  - Lista kunder (companies)
  - Skapa nytt kundföretag + koppla användare (customer)

### Kund
- Dashboard:
  - Lista jobb
  - Skapa nytt jobb
- Jobb-detalj:
  - Lista kandidater i kanban-vy (kolumner = status)
  - Dra-och-släpp eller knappar för att ändra status
  - Filter:
    - Jobb (dropdown)
    - Kandidatnamn (sökfält)

## AI-feature (senare)
- På kandidat-detaljsida:
  - Knapp: "Bedöm CV"
  - Skicka cv_text till AI
  - Visa:
    - Kort sammanfattning
    - Styrkor/svagheter
    - Matchning mot jobb (1–10)
