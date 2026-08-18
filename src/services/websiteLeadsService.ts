import { supabase } from "@/integrations/supabase/client";

export interface ContactFormResponse {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  message: string;
  created_at: string;
}

export interface LeadBooking {
  id: string;
  current_address: string;
  school: string;
  student_name: string;
  parent_name: string;
  phone_number: string;
  alternate_number: string | null;
  pickup_time: string;
  drop_time: string;
  special_instructions: string | null;
  created_at: string;
}

/**
 * Get all contact form responses
 */
export async function getContactFormResponses(): Promise<ContactFormResponse[]> {
  const { data, error } = await (supabase as any)
    .from("website_contact_form_response")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all lead bookings
 */
export async function getLeadBookings(): Promise<LeadBooking[]> {
  const { data, error } = await (supabase as any)
    .from("website_lead_booking")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Soft-delete a contact form response
 */
export async function deleteContactFormResponse(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("website_contact_form_response")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Soft-delete a lead booking
 */
export async function deleteLeadBooking(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("website_lead_booking")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
