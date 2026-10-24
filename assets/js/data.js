/*
 * Site content: regions, property listings and FAQs.
 *
 * The listings below are SAMPLE CONTENT that shows how the site works. Replace them with
 * real properties before going live. Each listing supports:
 *   id          unique, used in the URL: property.html?id=<id>
 *   price       number in rupees (used for filtering and sorting)
 *   scene       rendered golden-hour image in assets/img/scenes (plots, plots-b, plots-close,
 *               house, ghats, farm, farm-b, mango, river, coast, plains, highway, hills, tea)
 *   art         fallback SVG illustration { kind, seed } used when there is no scene or image
 *   image       optional photo path (e.g. "assets/img/properties/ilanji.jpg"); replaces the art
 *   video       optional YouTube / Instagram link to the walkthrough video
 *   layout      optional plot chooser for layouts { rows, cols, plotSize, sold:[], booked:[] }
 */
window.TLP_DATA = {
  regions: [
    {
      id: "tenkasi", scene: "ghats", name: "Tenkasi", ta: "தென்காசி", lat: 8.959, lng: 77.315,
      art: { kind: "ghats", seed: 4 },
      blurb: "Our home ground. Plots and farmland at the foot of the Western Ghats — Courtallam, Ilanji, Sengottai and beyond."
    },
    {
      id: "tirunelveli", scene: "plains", name: "Tirunelveli", ta: "திருநெல்வேலி", lat: 8.713, lng: 77.757,
      art: { kind: "plains", seed: 8 },
      blurb: "Palmyra plains and growing city layouts around Palayamkottai and the NH 44 corridor."
    },
    {
      id: "virudhunagar", scene: "mango", name: "Virudhunagar", ta: "விருதுநகர்", lat: 9.585, lng: 77.958,
      art: { kind: "farm", seed: 12, trees: "mango" },
      blurb: "Mango orchards near Rajapalayam and well-priced plots in fast-growing towns."
    },
    {
      id: "thoothukudi", scene: "coast", name: "Thoothukudi", ta: "தூத்துக்குடி", lat: 8.764, lng: 78.135,
      art: { kind: "coast", seed: 6 },
      blurb: "Port-city plots and coastal land along the Tiruchendur road."
    },
    {
      id: "kodaikanal", scene: "hills", name: "Kodaikanal", ta: "கொடைக்கானல்", lat: 10.238, lng: 77.489,
      art: { kind: "hills", seed: 5 },
      blurb: "Hill land with valley views — for homes, homestays and quiet retreats."
    },
    {
      id: "ooty", scene: "tea", name: "Ooty", ta: "ஊட்டி", lat: 11.41, lng: 76.695,
      art: { kind: "hills", seed: 9, tea: true },
      blurb: "Tea-country estates in the Nilgiris, cool all year round."
    },
    {
      id: "kerala", scene: "river", name: "Kerala", ta: "கேரளா", lat: 9.017, lng: 76.926,
      art: { kind: "river", seed: 3 },
      blurb: "Riverside and plantation land just across the Ghats, through the Aryankavu pass."
    }
  ],

  types: [
    { id: "plot", label: "Residential plots" },
    { id: "farm", label: "Farm land" },
    { id: "estate", label: "Hill estates" },
    { id: "commercial", label: "Commercial land" },
    { id: "house", label: "Houses" }
  ],

  budgets: [
    { id: "u10", label: "Under ₹10 L", min: 0, max: 1000000 },
    { id: "10-25", label: "₹10 L – 25 L", min: 1000000, max: 2500000 },
    { id: "25-50", label: "₹25 L – 50 L", min: 2500000, max: 5000000 },
    { id: "50-100", label: "₹50 L – 1 Cr", min: 5000000, max: 10000000 },
    { id: "a100", label: "Above ₹1 Cr", min: 10000000, max: Infinity }
  ],

  properties: [
    {
      id: "courtallam-meadows",
      scene: "plots",
      title: "Courtallam Meadows",
      region: "tenkasi",
      type: "plot",
      location: "Courtallam Road, Tenkasi",
      price: 690000,
      priceNote: "onwards",
      area: "1,200 – 2,400 sq.ft",
      approval: "DTCP approved",
      facing: "East & North",
      road: "30 ft blacktop",
      status: "few",
      featured: true,
      art: { kind: "plan", seed: 7, highlight: 6 },
      summary: "A gated layout of residential plots on the Courtallam road, with the Western Ghats on the horizon.",
      description: "Courtallam Meadows is a planned layout of residential plots between Tenkasi town and the Courtallam falls. Every plot faces a 30 ft blacktop road, the layout has underground drainage and street lighting, and the east-facing plots look straight onto the Ghats. Ideal for a family home or a weekend house near the falls.",
      highlights: [
        "Gated layout with 30 ft blacktop roads",
        "Underground drainage and street lights",
        "Ghats view from the east-facing plots",
        "Bank loan assistance available"
      ],
      nearby: [
        { name: "Courtallam Main Falls", dist: "5 km" },
        { name: "Tenkasi new bus stand", dist: "6 km" },
        { name: "Tenkasi Junction", dist: "7 km" }
      ],
      coords: [8.94, 77.28],
      layout: { rows: 4, cols: 9, plotSize: "30 × 40 ft", sold: [0, 1, 4, 9, 10, 11, 18, 22, 27, 28, 31], booked: [5, 14, 19, 33] }
    },
    {
      id: "ilanji-coconut-grove",
      scene: "farm",
      title: "Ilanji Coconut Grove",
      region: "tenkasi",
      type: "farm",
      location: "Ilanji, Tenkasi",
      price: 9500000,
      priceNote: "total",
      area: "2.5 acres",
      approval: "Patta land · clear title",
      facing: "Road on the south",
      road: "20 ft tar road",
      status: "available",
      featured: true,
      art: { kind: "farm", seed: 3 },
      summary: "A yielding coconut farm with borewell and three-phase power, minutes from Tenkasi town.",
      description: "A well-kept coconut grove on the edge of Ilanji village with regular yield, a borewell with three-phase EB connection and fencing on all sides. The farm sits on a tar road and is a short drive from both Tenkasi and Courtallam — a working farm today and a great farmhouse site tomorrow.",
      highlights: [
        "Around 250 yielding coconut trees",
        "Borewell with 3-phase EB connection",
        "Fenced on all sides with a gate",
        "Direct tar road access"
      ],
      nearby: [
        { name: "Ilanji village", dist: "1 km" },
        { name: "Courtallam", dist: "4 km" },
        { name: "Tenkasi town", dist: "5 km" }
      ],
      coords: [8.94, 77.30]
    },
    {
      id: "sengottai-foothill-farm",
      scene: "ghats",
      title: "Sengottai Foothill Farm",
      region: "tenkasi",
      type: "farm",
      location: "Near Sengottai, Tenkasi",
      price: 4800000,
      priceNote: "total",
      area: "1.5 acres",
      approval: "Patta land · clear title",
      facing: "Ghats view",
      road: "Mud road, 200 m from tar road",
      status: "available",
      featured: true,
      art: { kind: "ghats", seed: 11 },
      summary: "Mango and coconut land right below the hills, with a seasonal stream along one side.",
      description: "A quiet piece of farmland near Sengottai with mango and coconut trees, red soil and an uninterrupted view of the Western Ghats. A seasonal stream runs along the western boundary. Perfect for a farmhouse, an orchard or a long-term land investment close to the Kerala border.",
      highlights: [
        "Mango and coconut trees already established",
        "Seasonal stream on the western boundary",
        "Uninterrupted Western Ghats view",
        "Close to the Kerala border via Puliyara"
      ],
      nearby: [
        { name: "Sengottai town", dist: "4 km" },
        { name: "Courtallam", dist: "9 km" },
        { name: "Tenkasi", dist: "12 km" }
      ],
      coords: [8.97, 77.24]
    },
    {
      id: "madurai-highway-frontage",
      scene: "highway",
      title: "Madurai Highway Frontage",
      region: "tenkasi",
      type: "commercial",
      location: "Tenkasi – Madurai Road, Tenkasi",
      price: 18500000,
      priceNote: "total",
      area: "42 cents",
      approval: "Patta land · commercial use",
      facing: "Highway frontage, 110 ft",
      road: "National highway",
      status: "available",
      featured: false,
      art: { kind: "highway", seed: 2 },
      summary: "A rare 110 ft highway frontage plot for showrooms, a petrol bunk or a hotel.",
      description: "A commercial plot with 110 ft of frontage on the Tenkasi – Madurai highway. Level land, ready for construction, with power available on site. Suitable for showrooms, warehouses, a fuel station or a highway hotel.",
      highlights: [
        "110 ft frontage on the highway",
        "Level land, ready for construction",
        "EB line available at the boundary",
        "Fast-developing commercial stretch"
      ],
      nearby: [
        { name: "Tenkasi town", dist: "3 km" },
        { name: "Pavoorchatram", dist: "8 km" }
      ],
      coords: [8.98, 77.34]
    },
    {
      id: "melagaram-ready-house",
      scene: "house",
      title: "Melagaram Ready House",
      region: "tenkasi",
      type: "house",
      location: "Melagaram, Tenkasi",
      price: 4500000,
      priceNote: "total",
      area: "1,050 sq.ft built-up · 3 cents",
      approval: "Approved building plan",
      facing: "East",
      road: "25 ft road",
      status: "available",
      featured: false,
      art: { kind: "plan", seed: 15, house: true },
      summary: "A two-bedroom independent house in a settled residential street, ready to move in.",
      description: "An independent 2 BHK house on 3 cents in Melagaram, a settled residential area close to Tenkasi town. The house has a car park, an overhead tank, a borewell and municipal water. Ready to move in, with all documents in the owner's name.",
      highlights: [
        "2 BHK with car parking",
        "Borewell and municipal water",
        "Settled residential street",
        "Ready to move in"
      ],
      nearby: [
        { name: "Tenkasi town", dist: "3 km" },
        { name: "Kasi Viswanathar Temple", dist: "3 km" }
      ],
      coords: [8.95, 77.30]
    },
    {
      id: "palayamkottai-garden-plots",
      scene: "plots-b",
      title: "Palayamkottai Garden Plots",
      region: "tirunelveli",
      type: "plot",
      location: "Palayamkottai, Tirunelveli",
      price: 1150000,
      priceNote: "onwards",
      area: "1,500 sq.ft onwards",
      approval: "DTCP approved",
      facing: "East, West & North",
      road: "30 ft & 40 ft roads",
      status: "available",
      featured: true,
      art: { kind: "plan", seed: 21 },
      summary: "City-side plots near schools, colleges and the ring road in Palayamkottai.",
      description: "A DTCP-approved residential layout on the growing side of Palayamkottai, close to schools, colleges and hospitals. Wide 30 ft and 40 ft roads, a park in the centre of the layout, and immediate registration.",
      highlights: [
        "30 ft and 40 ft internal roads",
        "Children's park inside the layout",
        "Schools and colleges nearby",
        "Immediate registration"
      ],
      nearby: [
        { name: "Palayamkottai bus stand", dist: "5 km" },
        { name: "Tirunelveli Junction", dist: "9 km" }
      ],
      coords: [8.70, 77.74],
      layout: { rows: 4, cols: 10, plotSize: "30 × 50 ft", sold: [2, 3, 12, 13, 25], booked: [8, 30] }
    },
    {
      id: "gangaikondan-palmyra-land",
      scene: "plains",
      title: "Gangaikondan Palmyra Land",
      region: "tirunelveli",
      type: "farm",
      location: "Near Gangaikondan, Tirunelveli",
      price: 6000000,
      priceNote: "total",
      area: "5 acres",
      approval: "Patta land · clear title",
      facing: "Road on the east",
      road: "Tar road access",
      status: "available",
      featured: false,
      art: { kind: "plains", seed: 14 },
      summary: "Open palmyra land off the NH 44 corridor — ideal for a farm, a warehouse or long-term holding.",
      description: "Five acres of level dry land with palmyra trees, a short drive from the NH 44 corridor north of Tirunelveli. The area is known for its wind farms and is seeing steady industrial interest, making it a sound long-term holding.",
      highlights: [
        "5 acres of level land",
        "Palmyra trees on the boundary",
        "Close to the NH 44 corridor",
        "Good for warehousing or farming"
      ],
      nearby: [
        { name: "Gangaikondan", dist: "3 km" },
        { name: "Tirunelveli Junction", dist: "18 km" }
      ],
      coords: [8.85, 77.78]
    },
    {
      id: "rajapalayam-mango-orchard",
      scene: "mango",
      title: "Rajapalayam Mango Orchard",
      region: "virudhunagar",
      type: "farm",
      location: "Near Rajapalayam, Virudhunagar",
      price: 7200000,
      priceNote: "total",
      area: "3 acres",
      approval: "Patta land · clear title",
      facing: "Ghats view",
      road: "Tar road access",
      status: "available",
      featured: true,
      art: { kind: "farm", seed: 12, trees: "mango" },
      summary: "A mature mango orchard below the Ghats, with a well and drip irrigation.",
      description: "A mature mango orchard on the Rajapalayam side of the Western Ghats with an open well, drip irrigation and a small store room. The orchard gives a seasonal yield every summer and sits on a tar road with power available.",
      highlights: [
        "Mature mango trees with seasonal yield",
        "Open well and drip irrigation",
        "Store room on site",
        "Ghats view to the west"
      ],
      nearby: [
        { name: "Rajapalayam town", dist: "7 km" },
        { name: "Srivilliputhur", dist: "20 km" }
      ],
      coords: [9.45, 77.52]
    },
    {
      id: "virudhunagar-nagar-plots",
      scene: "plots-close",
      title: "Virudhunagar Nagar Plots",
      region: "virudhunagar",
      type: "plot",
      location: "Virudhunagar town",
      price: 520000,
      priceNote: "onwards",
      area: "1,000 sq.ft onwards",
      approval: "DTCP approved",
      facing: "East & West",
      road: "24 ft roads",
      status: "sold",
      featured: false,
      art: { kind: "plan", seed: 33 },
      summary: "An affordable town layout — every plot has been sold.",
      description: "An affordable DTCP-approved layout close to Virudhunagar town. Every plot in this layout has been sold. Ask us about upcoming layouts in the area.",
      highlights: [
        "DTCP approved",
        "Close to the town and railway station",
        "All plots sold"
      ],
      nearby: [
        { name: "Virudhunagar Junction", dist: "4 km" }
      ],
      coords: [9.58, 77.96],
      layout: { rows: 3, cols: 8, plotSize: "25 × 40 ft", sold: "all", booked: [] }
    },
    {
      id: "tiruchendur-road-plots",
      scene: "coast",
      title: "Tiruchendur Road Plots",
      region: "thoothukudi",
      type: "plot",
      location: "Tiruchendur Road, Thoothukudi",
      price: 850000,
      priceNote: "onwards",
      area: "1,200 sq.ft onwards",
      approval: "DTCP approved",
      facing: "North & South",
      road: "30 ft roads",
      status: "available",
      featured: false,
      art: { kind: "coast", seed: 6 },
      summary: "Plots on the growing Tiruchendur road, a short drive from the port city.",
      description: "A residential layout on the Tiruchendur road, a short drive from Thoothukudi town and the port. The layout has 30 ft roads and street lights, with schools and the main road close by.",
      highlights: [
        "30 ft roads with street lights",
        "Short drive to Thoothukudi town",
        "Growing residential corridor",
        "Bank loan assistance available"
      ],
      nearby: [
        { name: "Thoothukudi town", dist: "8 km" },
        { name: "Tiruchendur", dist: "30 km" }
      ],
      coords: [8.72, 78.14],
      layout: { rows: 3, cols: 9, plotSize: "30 × 40 ft", sold: [0, 5, 6, 14], booked: [9] }
    },
    {
      id: "poombarai-valley-estate",
      scene: "hills",
      title: "Poombarai Valley Estate",
      region: "kodaikanal",
      type: "estate",
      location: "Poombarai, Kodaikanal",
      price: 16500000,
      priceNote: "total",
      area: "1 acre",
      approval: "Patta land · clear title",
      facing: "Valley view",
      road: "Motorable road to the boundary",
      status: "available",
      featured: true,
      art: { kind: "hills", seed: 5 },
      summary: "Terraced hill land looking over the Poombarai valley — cottages, a homestay or a private retreat.",
      description: "An acre of gently terraced land above the Poombarai valley with a motorable road to the boundary, a natural spring and a clear view down the valley. Cool all year round and a short drive from Kodaikanal town.",
      highlights: [
        "Valley view on three sides",
        "Natural spring on the land",
        "Motorable road to the boundary",
        "Suitable for cottages or a homestay"
      ],
      nearby: [
        { name: "Poombarai village", dist: "2 km" },
        { name: "Kodaikanal town", dist: "18 km" }
      ],
      coords: [10.23, 77.40]
    },
    {
      id: "ketti-valley-tea-plot",
      scene: "tea",
      title: "Ketti Valley Tea Land",
      region: "ooty",
      type: "estate",
      location: "Ketti, Ooty",
      price: 22000000,
      priceNote: "total",
      area: "1.2 acres",
      approval: "Patta land · clear title",
      facing: "Valley view",
      road: "Tar road access",
      status: "available",
      featured: false,
      art: { kind: "hills", seed: 9, tea: true },
      summary: "Tea bushes on a gentle slope above the Ketti valley, a short drive from Ooty.",
      description: "Tea land on a gentle slope above the Ketti valley, with mature bushes and silver oaks, tar road access and power nearby. Ideal for a private cottage among the tea rows.",
      highlights: [
        "Mature tea bushes and silver oaks",
        "Tar road access",
        "Power available nearby",
        "Cool climate all year"
      ],
      nearby: [
        { name: "Ketti", dist: "2 km" },
        { name: "Ooty town", dist: "8 km" }
      ],
      coords: [11.37, 76.74]
    },
    {
      id: "punalur-riverside-land",
      scene: "river",
      title: "Punalur Riverside Land",
      region: "kerala",
      type: "farm",
      location: "Near Punalur, Kollam",
      price: 6400000,
      priceNote: "total",
      area: "80 cents",
      approval: "Clear title",
      facing: "River frontage",
      road: "Car access",
      status: "available",
      featured: false,
      art: { kind: "river", seed: 3 },
      summary: "River-frontage land with coconut and rubber, just across the Ghats from Tenkasi.",
      description: "Eighty cents of green land with frontage on the river near Punalur, planted with coconut and rubber. A short drive across the Ghats from Tenkasi via the Aryankavu pass — a natural home site or a riverside stay.",
      highlights: [
        "River frontage",
        "Coconut and rubber trees",
        "Car access to the land",
        "About 1.5 hours from Tenkasi"
      ],
      nearby: [
        { name: "Punalur town", dist: "5 km" },
        { name: "Thenmala", dist: "20 km" }
      ],
      coords: [9.02, 76.93]
    }
  ],

  process: [
    { title: "Tell us what you need", text: "Region, budget, plot or farm — a two-minute call or WhatsApp message is enough to begin." },
    { title: "Watch it first", text: "We send the video walkthrough of every property that fits, so you only visit the ones you love." },
    { title: "Walk the boundary", text: "We take you to the land, walk the boundary stones with you and show the approach road, water and power." },
    { title: "Check every document", text: "Patta, chitta, EC and approvals are shared up front for you and your lawyer to verify." },
    { title: "Register with confidence", text: "We coordinate the agreement, the bank loan if you need one, and the registration at the sub-registrar office." }
  ],

  faqs: [
    {
      q: "Can I see a property without travelling first?",
      a: "Yes. Almost every property we list has a video walkthrough on our Instagram and YouTube. Ask us on WhatsApp and we will send you the walkthrough and the location pin."
    },
    {
      q: "Which documents will I get to check?",
      a: "For every property we share the patta, chitta, encumbrance certificate (EC) and, for layouts, the DTCP or other approval. We encourage you to have them checked by your own lawyer before you pay an advance."
    },
    {
      q: "Do you help with bank loans?",
      a: "For approved residential plots we can connect you with banks that lend on them. Farm land usually needs a separate agricultural loan; we will tell you what applies to the property you choose."
    },
    {
      q: "I live in Chennai or abroad. Can I still buy?",
      a: "Many of our buyers do. We share videos, documents and live video calls from the site, and you only need to travel for the registration."
    },
    {
      q: "I want to sell my land. How do you help?",
      a: "Send us the location and documents. We visit, shoot a video walkthrough and share it with our community of over 300,000 people on Instagram and YouTube."
    }
  ]
};
