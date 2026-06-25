import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, membershipNumber } = req.body;

  if (!email || !membershipNumber) {
    return res.status(400).json({ error: "Email and membership number required" });
  }

  try {
    // Check membership_numbers table for match
    const { data: memberData, error } = await supabase
      .from("membership_numbers")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("membership_number", membershipNumber)
      .eq("is_used", false)
      .single();

    console.log("Membership validation:", { email, membershipNumber, memberData, error });

    if (error || !memberData) {
      return res.status(404).json({ 
        valid: false, 
        message: "Bu email ve üyelik numarası kombinasyonu bulunamadı veya daha önce kullanılmış." 
      });
    }

    // Return the full name from the membership record
    return res.status(200).json({ 
      valid: true, 
      fullName: memberData.full_name,
      message: "Üyelik doğrulandı!" 
    });

  } catch (err: any) {
    console.error("Validation error:", err);
    return res.status(500).json({ error: err.message });
  }
}