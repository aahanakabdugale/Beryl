import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  // 1. Try real Supabase auth session
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
    // Session lookup failed
  }

  // 2. Developer Lab access via Demo Key (BERYL-DEV-2026) or Demo Mode
  try {
    const cookieStore = await cookies();
    const isDevAuth = cookieStore.get("beryl_dev_authenticated")?.value === "true";
    const isDemo = cookieStore.get("beryl_demo_mode")?.value === "true";

    if (isDevAuth || isDemo || process.env.NODE_ENV !== "production") {
      const admin = createAdminClient();
      const { data } = await admin.auth.admin.listUsers();
      let devUser =
        data?.users?.find((u) => u.email === "demo@beryl.dev") ||
        data?.users?.[0];

      if (!devUser) {
        // Auto-provision demo user for Developer Lab
        const { data: created } = await admin.auth.admin.createUser({
          email: "demo@beryl.dev",
          password: "DemoPassword123!",
          email_confirm: true,
        });
        if (created?.user) {
          devUser = created.user;
        }
      }

      if (devUser) {
        // Ensure profile exists in profiles table
        try {
          await admin.from("profiles").upsert(
            { id: devUser.id, email: devUser.email || "demo@beryl.dev", created_at: new Date().toISOString() },
            { onConflict: "id" }
          );
        } catch {}
        return devUser;
      }
    }
  } catch (err) {
    console.warn("Developer Lab user resolution note:", err);
  }

  return null;
}

