// Browser-safe constants for the Quiz Hub (no Sanity/build-time imports here,
// so client scripts can use them without pulling server-only code).
import { SUPABASE_URL } from './supabase';

export const QUIZ_ACCESS_URL = `${SUPABASE_URL}/functions/v1/quiz-access`;
export const WHATSAPP_NUMBER = '2347044255045';
