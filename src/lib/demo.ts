// Set HIDE_DEMO_CONTENT=true to take the seeded demo listings and Journal
// posts out of the public site. Nothing is deleted; unset it to bring them back.
export function hideDemo() {
  return process.env.HIDE_DEMO_CONTENT === "true";
}
