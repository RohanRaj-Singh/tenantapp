import { cookies } from "next/headers";
import { LANGUAGE_COOKIE_NAME } from "./cookie";
import { getTenantStaticCopy, type AppLanguage, type TenantStaticCopy } from "./translations";

export async function getServerLanguage(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;

  return value === "ar" ? "ar" : "en";
}

export async function getServerTenantCopy(): Promise<TenantStaticCopy> {
  return getTenantStaticCopy(await getServerLanguage());
}
