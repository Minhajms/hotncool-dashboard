import { JWT } from "google-auth-library";

type SaCreds = { client_email: string; private_key: string };

/** Load the service-account JSON from base64 env (prod) or the local file (dev). */
function getServiceAccount(): SaCreds {
  const b64 = process.env.GSC_SA_KEY_B64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json) as SaCreds;
  }
  throw new Error("GSC_SA_KEY_B64 is not set");
}

/** Mint a short-lived Google access token for the given scopes using the service account. */
export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const sa = getServiceAccount();
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes,
  });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Failed to obtain Google access token");
  return token;
}

export const SA_EMAIL = () => {
  try {
    return getServiceAccount().client_email;
  } catch {
    return null;
  }
};
