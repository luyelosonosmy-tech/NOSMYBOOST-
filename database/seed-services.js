"use strict";

const db = require("./database");

/*
========================================
NOSMYBOOST 🇧🇪
SERVICES + PRIX CDF
========================================

IMPORTANT :
- Les prix sont en CDF pour 1 000 unités.
- provider_service_id reste vide tant que
  les vrais IDs SMM Africa ne sont pas fournis.
========================================
*/

const services = [

  // =====================================
  // FACEBOOK
  // =====================================

  {
    platform: "Facebook",
    name: "Facebook Followers | Instant | Low Drop | No Refill",
    description: "Facebook Page / Profile Followers",
    price: 840,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Likes 👍 | Instant | No Refill",
    description: "Max 100K • 50K/day • Instant",
    price: 480,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Likes 👍 | 100% Réel",
    description: "100% réel sans chinois 🇨🇬🇨🇩",
    price: 1584,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Reaction 😡 Angry",
    description: "Max 100K • 50K/day • Instant • No Refill",
    price: 480,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Reaction 🤗 Care",
    description: "Max 100K • 50K/day • Instant • No Refill",
    price: 480,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Reaction 😂 Haha",
    description: "Max 100K • 50K/day • Instant • No Refill",
    price: 480,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Reaction 💖 Love",
    description: "Max 100K • 50K/day • Instant • No Refill",
    price: 480,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Reaction 😭 Sad",
    description: "Max 100K • 50K/day • Instant • No Refill",
    price: 480,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Reaction 😮 Wow",
    description: "Max 100K • 50K/day • Instant • No Refill",
    price: 480,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Post Reaction ❤️ | 100% Réel",
    description: "100% réel sans chinois 🇨🇬🇨🇩",
    price: 1584,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Shares | Post / Photo | Refill 30D",
    description: "10K–50K/day • Instant • Refill 30D",
    price: 480,
    min_quantity: 100,
    max_quantity: 50000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Commentaires",
    description: "Commentaires Facebook",
    price: 1000,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "Facebook",
    name: "Facebook Partages",
    description: "Partages Facebook",
    price: 600,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  },


  // =====================================
  // INSTAGRAM
  // =====================================

  {
    platform: "Instagram",
    name: "Instagram Followers | HQ | Max 30K",
    description: "30K/day • Instant • No Refill",
    price: 1056,
    min_quantity: 100,
    max_quantity: 30000,
    provider_service_id: ""
  },

  {
    platform: "Instagram",
    name: "Instagram Followers | HQ | Max 50K",
    description: "20K/day • Instant • No Refill",
    price: 744,
    min_quantity: 100,
    max_quantity: 50000,
    provider_service_id: ""
  },

  {
    platform: "Instagram",
    name: "Instagram Likes | HQ | Lifetime",
    description: "Max 1M • 100K/day • Instant • Lifetime",
    price: 456,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },

  {
    platform: "Instagram",
    name: "Instagram Likes | HQ | Refill 365D",
    description: "Max 1M • 100K/day • Instant • Refill 365D",
    price: 432,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },


  // =====================================
  // TIKTOK
  // =====================================

  {
    platform: "TikTok",
    name: "TikTok Followers | 100% Real Users",
    description: "Max 1M • 50K/day • Instant • No Refill",
    price: 6000,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Likes | 100% Real Users | Lifetime",
    description: "Max 1M • 50K/day • Instant • Lifetime",
    price: 1248,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Likes | 100% Real Users | No Refill",
    description: "Max 1M • 50K/day • Instant • No Refill",
    price: 960,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Likes | 100% Real Users | Refill 30D",
    description: "Max 1M • 50K/day • Instant • Refill 30D",
    price: 1056,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Likes | HQ Accounts",
    description: "Max 5M • 100K/day • Instant • No Refill",
    price: 792,
    min_quantity: 100,
    max_quantity: 5000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Saves | No Refill",
    description: "Max Unlimited • 1M/day • Instant",
    price: 288,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Shares | Refill 30D",
    description: "Max Unlimited • 1M/day • Instant",
    price: 360,
    min_quantity: 100,
    max_quantity: 1000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Video Views | No Refill",
    description: "Max Unlimited • 10M/day • Instant",
    price: 264,
    min_quantity: 100,
    max_quantity: 10000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Video Views | No Refill",
    description: "Max Unlimited • 10M/day • Instant",
    price: 456,
    min_quantity: 100,
    max_quantity: 10000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Video Views | Refill 30D",
    description: "Max Unlimited • 10M/day • Instant",
    price: 240,
    min_quantity: 100,
    max_quantity: 10000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Video Views | Refill 30D",
    description: "Max Unlimited • 10M/day • Instant",
    price: 480,
    min_quantity: 100,
    max_quantity: 10000000,
    provider_service_id: ""
  },

  {
    platform: "TikTok",
    name: "TikTok Commentaires",
    description: "Commentaires TikTok",
    price: 2000,
    min_quantity: 100,
    max_quantity: 100000,
    provider_service_id: ""
  }

  // =====================================
  // YOUTUBE
  // =====================================

  {
    platform: "YouTube",
    name: "YouTube Live Stream Views + Likes | 15 min | 100% Concurrent",
    description: "Max 5M • Instant • Stay time 15 min",
    price: 2500,
    min_quantity: 50,
    max_quantity: 5000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Views + Likes | 15 min | Concurrent",
    description: "Max 5M • 100% Concurrent • 15 Minutes",
    price: 3000,
    min_quantity: 50,
    max_quantity: 5000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Views + Likes | 30 min | 100% Concurrent",
    description: "Max 5M • Instant • Stay time 30 min",
    price: 2500,
    min_quantity: 50,
    max_quantity: 5000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Views + Likes | 30 min | Concurrent",
    description: "Max 5M • 100% Concurrent • 30 Minutes",
    price: 1500,
    min_quantity: 50,
    max_quantity: 5000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Reaction ❤️",
    description: "Live Stream Reaction • Best Speed & Quality",
    price: 1000,
    min_quantity: 100,
    max_quantity: 1000000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Reaction 🎉",
    description: "Live Stream Reaction • Best Speed & Quality",
    price: 1000,
    min_quantity: 100,
    max_quantity: 1000000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Reaction 💯",
    description: "Live Stream Reaction • Best Speed & Quality",
    price: 484,
    min_quantity: 100,
    max_quantity: 1000000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Reaction 😄",
    description: "Live Stream Reaction • Best Speed & Quality",
    price: 484,
    min_quantity: 100,
    max_quantity: 1000000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Reaction 😳",
    description: "Live Stream Reaction • Best Speed & Quality",
    price: 484,
    min_quantity: 100,
    max_quantity: 1000000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Reaction Random ❤️😃🎉😳💯",
    description: "Random Live Stream Reactions • Best Speed & Quality",
    price: 1000,
    min_quantity: 100,
    max_quantity: 1000000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Under Comment Like | 10K | No Refill",
    description: "Max 10K • 10K/day • Instant • No Refill",
    price: 3000,
    min_quantity: 10,
    max_quantity: 10000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Comment Like | 100K | No Refill",
    description: "Max 100K • 30K/day • Instant • No Refill",
    price: 4000,
    min_quantity: 10,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Views + Likes | 60 min",
    description: "Max 5M • 100% Concurrent • Stay time 60 min",
    price: 4000,
    min_quantity: 50,
    max_quantity: 5000000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Under Comment Like | 1K | No Refill",
    description: "Max 1K • 1K/day • Instant • No Refill",
    price: 4000,
    min_quantity: 10,
    max_quantity: 1000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Under Comment Like | 10K | Refill 30D",
    description: "Max 10K • 10K/day • Instant • Refill 30D",
    price: 1500,
    min_quantity: 10,
    max_quantity: 10000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Comment Like | 100K | Refill 30D",
    description: "Max 100K • 30K/day • Instant • Refill 30D",
    price: 2000,
    min_quantity: 10,
    max_quantity: 100000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Under Comment Like | 5K | Refill 30D",
    description: "Max 5K • 5K/day • Instant • Refill 30D",
    price: 3500,
    min_quantity: 10,
    max_quantity: 5000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Under Comment Like | 10K | Lifetime",
    description: "Max 10K • 10K/day • Instant • Lifetime",
    price: 4000,
    min_quantity: 10,
    max_quantity: 10000,
    provider_service_id: ""
  },

  {
    platform: "YouTube",
    name: "YouTube Live Stream Views + Likes | 60 min | 100% Concurrent",
    description: "Max 5M • 100% Concurrent • 60 Minutes",
    price: 5000,
    min_quantity: 50,
    max_quantity: 5000000,
    provider_service_id: ""
  },
  
];


db.serialize(() => {

  const sql = `
    INSERT INTO services
    (
      platform,
      name,
      description,
      price,
      min_quantity,
      max_quantity,
      provider,
      provider_service_id,
      active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const stmt = db.prepare(sql);

  services.forEach(service => {

    stmt.run(
      service.platform,
      service.name,
      service.description,
      service.price,
      service.min_quantity,
      service.max_quantity,
      "smm_africa",
      service.provider_service_id,
      1
    );

  });

  stmt.finalize(error => {

    if (error) {

      console.error(
        "❌ Erreur ajout services :",
        error.message
      );

      return;

    }

    console.log(
      `✅ ${services.length} services ajoutés à NOSMYBOOST.`
    );

  });

});
