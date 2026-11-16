// Business details shown on the legal and contact pages. Set these in the
// hosting environment once the business is registered; the defaults are
// placeholders that read sensibly until then.
export const SITE = {
  name: "Unprompters",
  legalName: process.env.LEGAL_NAME ?? "Unprompters",
  contactEmail: process.env.CONTACT_EMAIL ?? "hello@unprompters.com",
  address: process.env.LEGAL_ADDRESS ?? "India",
  grievanceOfficer: process.env.GRIEVANCE_OFFICER ?? "The founder of Unprompters",
  lastUpdated: "5 November 2026",
  // Who runs the site, shown on the About page. The handle links to their profile here.
  founderName: process.env.FOUNDER_NAME ?? "Shadin",
  founderHandle: process.env.FOUNDER_HANDLE ?? "shadin",
  started: "October 2026",
};
