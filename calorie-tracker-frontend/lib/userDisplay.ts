/** Derive a short greeting name from an email local-part (e.g. akki123@x.com → Akki). */
export function greetingNameFromEmail(email: string): string {
  const local = email.trim().split("@")[0] ?? "";
  if (!local) {
    return "there";
  }

  const firstToken = local.split(/[._+\-]+/).find((part) => part.length > 0) ?? local;
  const withoutTrailingDigits = firstToken.replace(/\d+$/g, "");
  const lettersOnly = (withoutTrailingDigits || firstToken).replace(/[^a-zA-Z]/g, "");

  if (lettersOnly.length < 2) {
    return "there";
  }

  return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1).toLowerCase();
}
