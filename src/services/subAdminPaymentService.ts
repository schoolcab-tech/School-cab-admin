import { supabase } from "@/integrations/supabase/client";

export type PaymentMarkStatus = "paid" | "unpaid";

/**
 * Mark a subscription payment as paid or unpaid.
 * Updates both subscription_payments and the linked subscription_cycle.
 */
export async function updateSubscriptionPaymentStatus(
  subscriptionPaymentId: number,
  status: PaymentMarkStatus
): Promise<void> {
  const transactionStatus = status === "paid" ? "completed" : "pending";
  const cyclePaymentStatus = status === "paid" ? "paid" : "pending";

  const { data: payment, error: fetchError } = await supabase
    .from("subscription_payments")
    .select("cycle_id, subscription_payment_id")
    .eq("subscription_payment_id", subscriptionPaymentId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch payment: ${fetchError.message}`);
  }

  const { error: paymentError } = await supabase
    .from("subscription_payments")
    .update({
      transaction_status: transactionStatus,
      transaction_date:
        status === "paid" ? new Date().toISOString() : null,
    })
    .eq("subscription_payment_id", subscriptionPaymentId);

  if (paymentError) {
    throw new Error(`Failed to update payment: ${paymentError.message}`);
  }

  if (payment?.cycle_id) {
    const { error: cycleError } = await supabase
      .from("subscription_cycles")
      .update({ payment_status: cyclePaymentStatus })
      .eq("cycle_id", payment.cycle_id);

    if (cycleError) {
      throw new Error(`Failed to update cycle: ${cycleError.message}`);
    }
  }
}
