export function openOdhexInNewTab(email: string, amount: number): boolean {
  if (!email) return false;

  const currentUrl = new URL(window.location.href);
  let odhexBaseUrl: string;

  if (currentUrl.hostname === "koli-2bad9.web.app") {
    odhexBaseUrl = "https://odhex.com";
  } else if (currentUrl.hostname === "localhost") {
    odhexBaseUrl = `${currentUrl.protocol}//localhost:8082`;
  } else {
    odhexBaseUrl = `${currentUrl.protocol}//${currentUrl.hostname}:8082`;
  }

  const params = new URLSearchParams({
    email,
    amount: amount.toFixed(2),
    source: "koli-coin",
    timestamp: new Date().toISOString(),
  });

  const targetUrl = `${odhexBaseUrl}/signup?${params.toString()}`;
  const opened = window.open(targetUrl, "_blank", "noopener,noreferrer");
  return !!opened;
}
