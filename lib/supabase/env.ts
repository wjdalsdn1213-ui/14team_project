const PUBLIC_KEY_PREFIXES = ["sb_publishable_", "eyJ"] as const;
const SECRET_KEY_PREFIXES = ["sb_secret_", "eyJ"] as const;

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function assertKeyFormat(value: string, envNames: string[], prefixes: readonly string[]) {
  if (prefixes.some(prefix => value.startsWith(prefix))) {
    return value;
  }

  const [primaryName] = envNames;
  throw new Error(
    `${primaryName} has an unexpected format. Check for a copy/paste mistake in ${envNames.join(" / ")}.`,
  );
}

export function getSupabaseUrl() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  return url;
}

export function getSupabasePublishableKey() {
  const envNames = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const key = readEnv(...envNames);

  if (!key) {
    throw new Error(`Missing ${envNames.join(" or ")}.`);
  }

  return assertKeyFormat(key, envNames, PUBLIC_KEY_PREFIXES);
}

export function getSupabaseSecretKey() {
  const envNames = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"];
  const key = readEnv(...envNames);

  if (!key) {
    throw new Error(`Missing ${envNames.join(" or ")}.`);
  }

  return assertKeyFormat(key, envNames, SECRET_KEY_PREFIXES);
}
