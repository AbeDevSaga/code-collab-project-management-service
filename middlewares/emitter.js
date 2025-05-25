const redis = require("redis");
const dotenv = require('dotenv');
dotenv.config();

const publisher = redis.createClient({ url: process.env.REDIS_URL });

(async () => {
  try {
    await publisher.connect();
    console.log("Publisher connected to Redis");
  } catch (err) {
    console.error("Redis Publisher connection error:", err);
  }
})();

function emitUserAddedToProject({ projectId, userId }) {
  const event = { type: "user-added-to-project", projectId, userId };
  publisher.publish("project-events", JSON.stringify(event));
  console.log("emitUserAddedToProject called");
}

function emitUserRemovedFromProject({ projectId, userId }) {
  const event = { type: "user-removed-from-project", projectId, userId };
  publisher.publish("project-events", JSON.stringify(event));
  console.log("emitUserRemovedFromProjec called");
}

module.exports = { emitUserAddedToProject, emitUserRemovedFromProject };
