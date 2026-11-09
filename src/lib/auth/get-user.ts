import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return user;
    }
  } catch {
    // Server context might not have request cookies in some environments
  }

  return null;
}

