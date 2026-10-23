/**
 * Marketing copy for the platform sections. Placeholder business values
 * (prices, limits) are marked TODO; replace them before launch.
 */

export const valueProps = [
  {
    title: "Opens in under a second",
    body: "The poster frame paints first. The animation streams in behind it. Buyers never stare at a loading bar.",
    stat: "<1s",
    statLabel: "first paint target on 4G",
  },
  {
    title: "Every screen, one build",
    body: "Phone, laptop, 8K sales-suite wall. Frames are cut for portrait and landscape, so nothing feels cropped.",
    stat: "2",
    statLabel: "frame sets: portrait & landscape",
  },
  {
    title: "Works without Wi-Fi",
    body: "Install it like an app. The explorer, unit data and imagery stay available offline, made for kiosks and site visits.",
    stat: "PWA",
    statLabel: "installable & offline-ready",
  },
] as const;

export const features = [
  {
    key: "model",
    title: "Interactive 3D model",
    body: "Orbit the masterplan, step floor by floor and tap any residence to see its plan, price and status, live.",
    scene: "cutaway",
  },
  {
    key: "tours",
    title: "Cinematic virtual tours",
    body: "Scroll-driven, pre-rendered sequences that play like film and scrub like a timeline.",
    scene: "living",
  },
  {
    key: "pdf",
    title: "Dynamic PDF brochures",
    body: "One click builds a personalised brochure for any unit: buyer's name, floor plan, today's price.",
    scene: "model-line",
  },
  {
    key: "kiosk",
    title: "Kiosk mode",
    body: "Full-screen, touch-first and self-resetting for sales suites and events. Keeps running when the network drops.",
    scene: "drone",
  },
] as const;

export const howItWorks = [
  { step: "01", title: "Send your renders", body: "Animation, stills, plans and the price list. Any format your visualiser exports." },
  { step: "02", title: "We build your experience", body: "Frame sequences, a 3D massing model wired to live inventory, branded to your development." },
  { step: "03", title: "Sell from anywhere", body: "Share a link, install a kiosk, send brochures. Every interaction flows into your CRM." },
] as const;

// TODO: replace with your real commercial terms.
export const pricing = [
  {
    name: "Small estate",
    price: "€1,400",
    cadence: "/ month",
    blurb: "Boutique developments and single buildings.",
    limit: "Up to 40 residences",
    features: ["Scroll-scrubbed hero film", "Unit explorer & filters", "Dynamic PDF brochures", "CRM for 3 seats"],
    highlight: false,
  },
  {
    name: "Medium estate",
    price: "€2,900",
    cadence: "/ month",
    blurb: "Multi-building schemes with an on-site sales suite.",
    limit: "Up to 250 residences",
    features: ["Everything in Small", "Kiosk mode, offline", "Virtual tour sequences", "CRM for 10 seats", "Bulk price tools"],
    highlight: true,
  },
  {
    name: "Large estate",
    price: "Custom",
    cadence: "",
    blurb: "Masterplans, phased releases and international sales teams.",
    limit: "Unlimited residences & phases",
    features: ["Everything in Medium", "Multi-project portfolio", "Custom integrations", "Unlimited seats", "Dedicated producer"],
    highlight: false,
  },
] as const;

export const faqs = [
  {
    q: "Do we need a 3D model, or are renders enough?",
    a: "Renders are enough to start. We build a light massing model from your plans for unit picking, and the photoreal look comes from your pre-rendered frames.",
  },
  {
    q: "How fast does it load on mobile?",
    a: "A single poster image paints first, typically well under a second on 4G. Animation frames stream in afterwards, at lower density on slow or data-saver connections.",
  },
  {
    q: "Does it really work offline?",
    a: "Yes. Once visited, the site installs as an app. The explorer, unit data and imagery are cached. Enquiries made offline are queued and sent when the connection returns.",
  },
  {
    q: "How are prices and availability kept current?",
    a: "Everything reads from one inventory. Change a price or reserve a unit in the back panel, and the explorer, brochures and pipeline update together.",
  },
  {
    q: "Can we use our own CRM?",
    a: "The built-in CRM covers the pipeline from first enquiry to completion. Leads export to CSV today, and API integrations are available on the Large plan.",
  },
  {
    q: "Who owns the content?",
    a: "You do. Renders, copy and buyer data stay yours, and can be exported at any time.",
  },
] as const;
