import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function readMigrationFile(fileName: string) {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const filePath = path.join(repoRoot, "supabase", "migrations", fileName);
  return fs.readFileSync(filePath, "utf8");
}

describe("Supabase migrations", () => {
  it("define public.users e public.user_sessions", () => {
    const sql = readMigrationFile("20260128170000_single_email_auth.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.users");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.user_sessions");
    expect(sql).toContain("ALTER TABLE public.users ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY");
  });

  it("define app_settings e políticas de visibilidade pública", () => {
    const sqlCreate = readMigrationFile("20260128173000_public_visibility_and_indexes.sql");
    expect(sqlCreate).toContain("CREATE TABLE IF NOT EXISTS public.app_settings");
    expect(sqlCreate).toContain("public_access_enabled");

    const sqlPolicies = readMigrationFile("20260128173100_public_visibility_policies.sql");
    expect(sqlPolicies).toContain("CREATE OR REPLACE FUNCTION public.is_public_access_enabled()");
    expect(sqlPolicies).toContain("Admin can read app settings");
    expect(sqlPolicies).toContain("Public can view templates when public access enabled");
  });

  it("restringe criação de usuários do auth.users para o admin", () => {
    const sql = readMigrationFile("20260128173200_restrict_auth_signups.sql");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.restrict_auth_user_creation()");
    expect(sql).toContain("BEFORE INSERT ON auth.users");
    expect(sql).toContain("admgestalt@gmail.com");
  });
});
