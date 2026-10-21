export type Profile = {
  id: string;
  display_name: string | null;
  age: number | null;
  city: string | null;
  profession: string | null;
  bio: string | null;
  is_visible: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
};

export type VerificationStatus = "pending" | "verified" | "needs_retry" | "manual_review" | "rejected";

export type Verification = {
  user_id: string;
  provider: string;
  applicant_id: string | null;
  status: VerificationStatus;
  review_answer: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
};

export type ProfileReport = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  created_at: string;
};

export type SafetyReport = {
  id: string;
  reporter_id: string;
  booking_id: string | null;
  reported_id: string | null;
  partner_id: string | null;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
};

export type Partner = {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  contact_email: string | null;
  status: "active" | "paused" | "pending";
  commission_rate: number;
  created_at: string;
};

export type PartnerOffer = {
  id: string;
  partner_id: string;
  challenge_id: string | null;
  title: string;
  list_price_sek: number;
  partner_price_sek: number;
  member_price_sek: number;
  max_subsidy_sek: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

export type ChallengeRow = {
  id: string;
  title: string;
  category: string;
  level: number;
  duration_minutes: number;
  member_price_sek: number | null;
  partner_id: string | null;
  area: string | null;
  description: string;
  goal: string | null;
  reward: string | null;
  is_active: boolean;
  created_at: string;
};

export type ChallengeStageRow = {
  id: string;
  challenge_id: string;
  stage_number: number;
  title: string;
  description: string;
};

export type BookingRow = {
  id: string;
  challenge_id: string;
  member_a: string;
  member_b: string | null;
  partner_id: string | null;
  status: "proposed" | "confirmed" | "paid" | "completed" | "cancelled" | "no_show";
  scheduled_for: string | null;
  member_paid_sek: number;
  subsidy_sek: number;
  partner_payout_sek: number;
  commission_sek: number;
  completed_at: string | null;
  created_at: string;
};
