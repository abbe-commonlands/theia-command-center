const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://peaceful-frog-360.convex.cloud");
const api = { agents: { upsert: "agents:upsert" } };

const agents = [
  { sessionKey:"agent:theia:main",  name:"Theia",  role:"Optical Design Lead",    emoji:"🔭", model:"gpt-5.4", status:"idle" },
  { sessionKey:"agent:photon:main", name:"Photon", role:"Optimization & Patents", emoji:"⚡", model:"gpt-5.4", status:"idle" },
  { sessionKey:"agent:quark:main",  name:"Quark",  role:"Zemax Automation",       emoji:"🔬", model:"gpt-5.4", status:"idle" },
];

(async () => {
  for (const a of agents) {
    try {
      const id = await client.mutation(api.agents.upsert, a);
      console.log("✅", a.emoji, a.name, id);
    } catch(e) { console.error("❌", a.name, e.message); }
  }
})();
