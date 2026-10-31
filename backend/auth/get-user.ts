import { createClient } from "@/backend/supabase/server";
import { createAdminClient } from "@/backend/supabase/admin";
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
    // Server context might not have request cookies in some test runners
  }

  // Development/Test fallback: find demo user or first available user
  if (process.env.NODE_ENV !== "production") {
    try {
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.listUsers();
      const demoUser =
        data?.users?.find((u) => u.email === "demo@beryl.dev") ||
        data?.users?.[0];
      if (demoUser) {
        return demoUser;
      }
    } catch {
      // Return null if admin lookup fails
    }
  }

  return null;
}
