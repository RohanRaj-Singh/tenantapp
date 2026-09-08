import { MongoClient } from "mongodb";

async function main() {
  const uriRemedygcc = "mongodb://127.0.0.1:27017/remedygcc";
  const uriTenantapp = "mongodb://127.0.0.1:27017/tenantapp";

  for (const [label, uri] of [["remedygcc", uriRemedygcc], ["tenantapp", uriTenantapp]]) {
    const c = new MongoClient(uri);
    await c.connect();
    const db = c.db();
    
    console.log(`\n=== ${label} DB ===`);
    const colNames = await db.listCollections().toArray();
    const hasClaims = colNames.some(c => c.name === "claimRequests");
    console.log(`Has claimRequests: ${hasClaims}`);
    
    if (hasClaims) {
      const count = await db.collection("claimRequests").countDocuments();
      console.log(`claimRequests count: ${count}`);
      
      // Sample first doc
      const sample = await db.collection("claimRequests").findOne({}, { projection: { _id: 0 } });
      if (sample) {
        console.log("Sample request:", JSON.stringify(sample, null, 2));
      }
    } else {
      // Check what collections look similar
      const similarCols = colNames.filter(c => c.name.includes("request"));
      console.log(`Similar collections:`, similarCols.map(c => c.name));
    }
    
    await c.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
