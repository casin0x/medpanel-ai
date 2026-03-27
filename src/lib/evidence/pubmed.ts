/** PubMed evidence retrieval via NCBI E-utilities API */

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
}

export async function searchPubMed(query: string, maxResults = 5): Promise<PubMedArticle[]> {
  const apiKey = process.env.NCBI_API_KEY ?? "";
  const keyParam = apiKey ? `&api_key=${apiKey}` : "";

  // Step 1: Search for PMIDs
  const searchUrl = `${BASE}/esearch.fcgi?db=pubmed&retmode=json&retmax=${maxResults}&sort=relevance&term=${encodeURIComponent(query)}${keyParam}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const pmids: string[] = searchData?.esearchresult?.idlist ?? [];

  if (pmids.length === 0) return [];

  // Step 2: Fetch article details
  const fetchUrl = `${BASE}/efetch.fcgi?db=pubmed&retmode=xml&id=${pmids.join(",")}${keyParam}`;
  const fetchRes = await fetch(fetchUrl);
  const xml = await fetchRes.text();

  // Parse XML (simple extraction — not a full XML parser)
  return pmids.map((pmid) => {
    const articleRegex = new RegExp(`<PubmedArticle>[\\s\\S]*?<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?</PubmedArticle>`, "m");
    const match = xml.match(articleRegex);
    const block = match?.[0] ?? "";

    const title = extractTag(block, "ArticleTitle") || "Untitled";
    const journal = extractTag(block, "Title") || "Unknown Journal";
    const year = extractTag(block, "Year") || "Unknown";
    const abstract = extractTag(block, "AbstractText") || "";
    const lastName = extractTag(block, "LastName") || "";
    const initials = extractTag(block, "Initials") || "";

    return {
      pmid,
      title,
      authors: lastName ? `${lastName} ${initials} et al.` : "Unknown",
      journal,
      year,
      abstract: abstract.slice(0, 500),
    };
  });
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
}

export async function verifyPMID(pmid: string): Promise<boolean> {
  try {
    const url = `${BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`;
    const res = await fetch(url);
    const data = await res.json();
    return !!data?.result?.[pmid]?.title;
  } catch {
    return false;
  }
}
