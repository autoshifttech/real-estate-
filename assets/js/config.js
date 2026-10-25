/*
 * Business details used everywhere on the site (header, footer, forms, WhatsApp links).
 * Edit this one file to update contact information.
 *
 * TODO before going live: replace the placeholder phone / WhatsApp / email / address.
 */
window.TLP_CONFIG = {
  name: "Tenkasi Land Promoters",
  shortName: "Tenkasi",
  tagline: "Land Promoters",
  taglineTamil: "ஒரு கோடு. உங்கள் நிலம்.",

  // Phone numbers in international format, digits only for WhatsApp.
  phone: "+91 00000 00000",        // TODO: real phone number
  whatsapp: "910000000000",        // TODO: real WhatsApp number (country code + number, no +)
  email: "hello@example.com",      // TODO: real email

  address: "Tenkasi, Tamil Nadu, India", // TODO: full office address
  mapQuery: "Tenkasi, Tamil Nadu",       // used for the Google Maps embed on the contact page
  hours: "Every day, 9:00 AM – 7:00 PM",

  instagram: "https://www.instagram.com/tenkasi_land_promoters/",
  youtube: "https://www.youtube.com/@tenkasi_land_promoters",
  threads: "https://www.threads.net/@tenkasi_land_promoters",

  stats: {
    followers: "3L+",
    videos: "1,350+",
    regions: "7"
  },

  // Optional: a form backend (Formspree, Web3Forms, Getform…). When empty, enquiry
  // forms open WhatsApp with the message pre-filled instead.
  formEndpoint: ""
};
