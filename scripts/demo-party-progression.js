import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    world: "generated/world-context.json",
    events: 8,
    seed: `${Date.now()}`,
    start: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (/^\d+$/.test(arg)) {
      options.events = Number(arg);
      continue;
    }

    if (arg === "--world" && argv[i + 1]) {
      options.world = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--seed" && argv[i + 1]) {
      options.seed = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--start" && argv[i + 1]) {
      options.start = argv[i + 1];
      i += 1;
    }
  }

  options.events = Math.max(1, options.events);
  return options;
}

function hashSeed(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedText) {
  let state = hashSeed(String(seedText)) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function weightedPick(rng, entries) {
  const valid = entries.filter((entry) => entry.weight > 0);
  const total = valid.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;

  for (const entry of valid) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }

  return valid[valid.length - 1] || null;
}

function dist(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = (a.x || 0) - (b.x || 0);
  const dy = (a.y || 0) - (b.y || 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function statePairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function titleCase(text) {
  return String(text || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildParty(rng) {
  const names = ["Mira", "Tovan", "Iri", "Bran", "Sable", "Nera", "Varo", "Kei", "Dara", "Pell"];
  const roles = [
    "disgraced courier",
    "ex-soldier",
    "shrine-scribe",
    "dock thief turned scout",
    "hedge mage",
    "river pilot",
    "mercenary archer",
    "itinerant healer",
    "cartographer",
    "smuggler with a conscience",
  ];

  const poolNames = [...names];
  const poolRoles = [...roles];
  const members = [];
  const partySize = 4;

  for (let i = 0; i < partySize; i += 1) {
    const name = poolNames.splice(Math.floor(rng() * poolNames.length), 1)[0];
    const role = poolRoles.splice(Math.floor(rng() * poolRoles.length), 1)[0];
    members.push({ name, role });
  }

  return members;
}

function describeSettlement(settlement) {
  const tags = [];
  if (settlement.capital) tags.push("capital");
  if (settlement.isPort) tags.push("port");
  if (settlement.hasRiver) tags.push("river town");
  if (settlement.isCoastal) tags.push("coastal");
  if (settlement.group && settlement.group !== "capital") tags.push(settlement.group);

  return `${settlement.name} (${settlement.stateName}${tags.length ? `; ${tags.join(", ")}` : ""})`;
}

function buildWorldIndex(world) {
  const settlements = world.politics.settlements.filter((settlement) => settlement && settlement.i > 0 && settlement.name);
  const settlementsById = new Map(settlements.map((settlement) => [settlement.i, settlement]));
  const relationsByPair = new Map(
    (world.politics.relations || []).map((relation) => [statePairKey(relation.from, relation.to), relation])
  );
  const adjacency = new Map();

  for (const settlement of settlements) {
    adjacency.set(
      settlement.i,
      (settlement.connectedViaRoutes || [])
        .map((edge) => ({ ...edge, from: settlement.i, next: settlementsById.get(edge.to) }))
        .filter((edge) => edge.next)
    );
  }

  return {
    settlements,
    settlementsById,
    statesById: world.politics.lookup.statesById || {},
    relationsByPair,
    adjacency,
    capitals: settlements.filter((settlement) => settlement.capital),
    ports: settlements.filter((settlement) => settlement.isPort),
    cities: settlements.filter((settlement) => settlement.group === "city" || settlement.capital),
  };
}

function getRelation(index, leftStateId, rightStateId) {
  if (!leftStateId || !rightStateId || leftStateId === rightStateId) {
    return { status: "Domestic", bordering: false };
  }
  return index.relationsByPair.get(statePairKey(leftStateId, rightStateId)) || { status: "Unknown", bordering: false };
}

function chooseStartSettlement(rng, worldIndex, forcedName = null) {
  if (forcedName) {
    const lowered = forcedName.toLowerCase();
    const forced = worldIndex.settlements.find((settlement) => settlement.name.toLowerCase() === lowered);
    if (forced) return forced;
  }

  const candidates = worldIndex.settlements.filter((settlement) => (settlement.connectedViaRoutes || []).length > 0);
  return weightedPick(
    rng,
    candidates.map((settlement) => ({
      value: settlement,
      weight:
        3 +
        Math.min((settlement.connectedViaRoutes || []).length, 8) +
        (settlement.capital ? 4 : 0) +
        (settlement.isPort ? 3 : 0) +
        (settlement.hasRiver ? 1 : 0),
    }))
  )?.value;
}

function chooseObjective(rng, start, worldIndex) {
  const candidates = [];

  if (start.nearestCapital?.i) {
    const target = worldIndex.settlementsById.get(start.nearestCapital.i);
    if (target) {
      candidates.push({
        type: "appeal",
        target,
        targetKind: "capital",
        summary: `carry a sealed appeal to ${target.name}`,
        motive: "A magistrate wants testimony delivered before a rival court can suppress it.",
      });
    }
  }

  if (start.nearestPort?.i) {
    const target = worldIndex.settlementsById.get(start.nearestPort.i);
    if (target) {
      candidates.push({
        type: "manifest",
        target,
        targetKind: "port",
        summary: `deliver a disputed cargo manifest to ${target.name}`,
        motive: "Dock records point to stolen supplies moving under false seals.",
      });
    }
  }

  const crossBorderNearby = (start.nearbySettlements || [])
    .map((candidate) => worldIndex.settlementsById.get(candidate.i))
    .filter(Boolean)
    .find((candidate) => candidate.state !== start.state);

  if (crossBorderNearby) {
    const relation = getRelation(worldIndex, start.state, crossBorderNearby.state);
    candidates.push({
      type: "frontier",
      target: crossBorderNearby,
      targetKind: "frontier",
      summary: `escort a frightened witness toward ${crossBorderNearby.name}`,
      motive: `The route crosses ${relation.status.toLowerCase()} political ground, which makes every checkpoint matter.`,
    });
  }

  const fallback = pick(rng, [...worldIndex.capitals, ...worldIndex.ports, ...worldIndex.cities].filter((settlement) => settlement.i !== start.i));
  if (fallback) {
    candidates.push({
      type: "errand",
      target: fallback,
      targetKind: fallback.isPort ? "port" : fallback.capital ? "capital" : "city",
      summary: `carry a sensitive package toward ${fallback.name}`,
      motive: "Nobody trusts the main roads enough to send official couriers.",
    });
  }

  return pick(rng, candidates);
}

function chooseFollowUpObjective(rng, current, previousObjective, worldIndex) {
  const pool = [];

  if (current.isPort) {
    const capital = worldIndex.capitals
      .filter((settlement) => settlement.state === current.state && settlement.i !== current.i)
      .sort((left, right) => dist(current, left) - dist(current, right))[0];
    if (capital) {
      pool.push({
        type: "hearing",
        target: capital,
        targetKind: "capital",
        summary: `bring the fresh evidence from ${current.name} to ${capital.name}`,
        motive: "Port gossip turns the first job into a larger political case.",
      });
    }
  }

  if (current.capital) {
    const port = worldIndex.ports
      .filter((settlement) => settlement.state === current.state && settlement.i !== current.i)
      .sort((left, right) => dist(current, left) - dist(current, right))[0];
    if (port) {
      pool.push({
        type: "smuggling-crackdown",
        target: port,
        targetKind: "port",
        summary: `rush the court order down to ${port.name}`,
        motive: "A decree is useless unless somebody carries it to the harbor before dawn.",
      });
    }
  }

  const frontierOption = (current.nearbySettlements || [])
    .map((candidate) => worldIndex.settlementsById.get(candidate.i))
    .filter(Boolean)
    .find((candidate) => candidate.state !== current.state && candidate.i !== previousObjective?.target?.i);

  if (frontierOption) {
    const relation = getRelation(worldIndex, current.state, frontierOption.state);
    pool.push({
      type: "frontier-fallout",
      target: frontierOption,
      targetKind: "frontier",
      summary: `follow the fallout into ${frontierOption.name}`,
      motive: `News is already spreading across a ${relation.status.toLowerCase()} frontier.`,
    });
  }

  const fallback = pick(rng, worldIndex.settlements.filter((settlement) => settlement.i !== current.i && settlement.state === current.state));
  if (fallback) {
    pool.push({
      type: "cleanup",
      target: fallback,
      targetKind: fallback.isPort ? "port" : fallback.capital ? "capital" : "city",
      summary: `close out the loose ends in ${fallback.name}`,
      motive: "Witnesses and receipts are scattered across the region.",
    });
  }

  return pick(rng, pool);
}

function localFlavor(rng, settlement) {
  const details = [];
  if (settlement.biome) details.push(`${settlement.biome.toLowerCase()} terrain`);
  if (settlement.hasRiver) details.push("river traffic");
  if (settlement.isPort) details.push("harbor noise");
  if (settlement.isCoastal) details.push("salt wind");
  if (settlement.elevation != null) details.push(`elevation ${settlement.elevation}`);
  if (settlement.provinceName) details.push(settlement.provinceName);
  if (details.length === 0) return "local routines and ordinary worries";

  return pick(rng, details);
}

function buildTravelOptions(rng, current, target, visited, worldIndex, previousLocationId = null, remainingEvents = 1) {
  const edges = (current.connectedViaRoutes || [])
    .map((edge) => ({ edge, next: worldIndex.settlementsById.get(edge.to) }))
    .filter((entry) => entry.next && entry.next.i !== current.i);

  const options = edges.map(({ edge, next }) => {
    const relation = getRelation(worldIndex, current.state, next.state);
    const currentDistanceToTarget = dist(current, target);
    const nextDistanceToTarget = dist(next, target);
    const improvesTargetDistance = nextDistanceToTarget < currentDistanceToTarget;
    const isImmediateBacktrack = previousLocationId != null && next.i === previousLocationId;
    const shouldCloseNow = remainingEvents <= 2;
    const weight =
      2 +
      Math.max(0, 5 - Math.min(edge.hops || 1, 5)) +
      Math.max(0, 6 - Math.min((edge.distance || 0) / 20, 6)) +
      (visited.has(next.i) ? -9 : 4) +
      (isImmediateBacktrack ? -12 : 0) +
      (improvesTargetDistance ? 8 : -2) +
      (nextDistanceToTarget < currentDistanceToTarget * 0.7 ? 3 : 0) +
      (next.i === target.i ? (shouldCloseNow ? 20 : 10) : 0) +
      (target.isPort && next.isPort ? 3 : 0) +
      (target.capital && next.capital ? 3 : 0) +
      (edge.crossesBorder ? (relation.status === "Enemy" || relation.status === "Rival" ? 1 : 3) : 1) +
      rng();

    const reasons = [];
    if (!visited.has(next.i)) reasons.push("unvisited");
    if (improvesTargetDistance) reasons.push(`closer to ${target.name}`);
    if (next.i === target.i) reasons.push("objective destination");
    if (isImmediateBacktrack) reasons.push("backtrack penalty");
    if (edge.crossesBorder) reasons.push(`border crossing (${relation.status})`);
    if (next.isPort) reasons.push("port access");
    if (next.capital) reasons.push("seat of power");
    reasons.push(`${edge.hops} hops`);
    reasons.push(`${edge.distance} mi`);

    return { current, next, edge, relation, weight, reasons };
  });

  return options.sort((left, right) => right.weight - left.weight);
}

function findDetailedTravelChain(worldIndex, fromId, toId, directEdge) {
  const from = worldIndex.settlementsById.get(fromId);
  const to = worldIndex.settlementsById.get(toId);

  if (!from || !to) return [];
  if ((directEdge?.hops || 0) <= 2) return [from.name, to.name];

  const maxDepth = 6;
  const hopSlack = Math.max(3, Math.ceil((directEdge?.hops || 0) * 0.5));
  const maxTotalHops = (directEdge?.hops || 0) + hopSlack;
  const queue = [
    {
      currentId: fromId,
      path: [fromId],
      totalHops: 0,
      score: 0,
    },
  ];
  const bestScoreByState = new Map([[`${fromId}:0`, 0]]);
  let best = null;

  while (queue.length > 0) {
    queue.sort((left, right) => left.score - right.score);
    const state = queue.shift();

    if (state.currentId === toId && state.path.length > 2) {
      best = state;
      break;
    }

    if (state.path.length > maxDepth) continue;

    for (const edge of worldIndex.adjacency.get(state.currentId) || []) {
      if (!edge?.to || state.path.includes(edge.to)) continue;

      const nextTotalHops = state.totalHops + (edge.hops || 1);
      if (nextTotalHops > maxTotalHops) continue;

      const legPenalty = Math.pow(edge.hops || 1, 2) * 0.35;
      const nextScore = state.score + (edge.hops || 1) + legPenalty;
      const key = `${edge.to}:${state.path.length + 1}`;
      const bestSeen = bestScoreByState.get(key);

      if (bestSeen != null && bestSeen <= nextScore) continue;
      bestScoreByState.set(key, nextScore);

      queue.push({
        currentId: edge.to,
        path: [...state.path, edge.to],
        totalHops: nextTotalHops,
        score: nextScore,
      });
    }
  }

  if (!best) return [from.name, to.name];
  return best.path.map((id) => worldIndex.settlementsById.get(id)?.name).filter(Boolean);
}

function printHeader(options, world, party, start, objective) {
  console.log(`World: ${world.metadata.info.mapName} | seed=${world.metadata.info.seed} | chronology=${world.metadata.chronology.year} ${world.metadata.chronology.eraShort}`);
  console.log(`Demo seed: ${options.seed}`);
  console.log(`Party: ${party.map((member) => `${member.name} (${member.role})`).join(", ")}`);
  console.log(`Start: ${describeSettlement(start)}`);
  console.log(`Objective: ${objective.summary}`);
  console.log(`Hook: ${objective.motive}`);
  console.log("");
}

function formatPartyLine(party) {
  return party.map((member) => member.name).join(", ");
}

function formatPathLine(pathNames) {
  return pathNames.join(" ->> ");
}

function logEventPlayout(party, pathNames, label = "Playout") {
  console.log(` - Party: ${formatPartyLine(party)}`);
  console.log(` - ${label}: ${formatPathLine(pathNames)}`);
}

function logChoicePreview(options) {
  const preview = options.slice(0, 4);
  console.log(`   Considered ${options.length} route options; top ${preview.length}:`);
  for (const option of preview) {
    console.log(
      `   - ${option.next.name} | score=${option.weight.toFixed(2)} | modes=${(option.edge.modes || []).join("/") || "roads"} | reasons=${option.reasons.join(", ")}`
    );
  }
}

function printResolution(eventNumber, current, objective, rng) {
  const finishes = [
    `The party hands off the mission in ${current.name} and earns just enough trust to be asked back again.`,
    `${current.name} becomes the place where rumor hardens into proof, and the party's name starts circulating with it.`,
    `What began as a simple errand ends in ${current.name}, where officials, smugglers, and locals all want a different version of the truth.`,
  ];

  console.log(`[Event ${eventNumber}] Resolution at ${current.name}`);
  console.log(` - Objective completed: ${objective.summary}.`);
  console.log(` - Outcome: ${pick(rng, finishes)}`);
  console.log("");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const worldPath = path.resolve(process.cwd(), options.world);
  const world = JSON.parse(fs.readFileSync(worldPath, "utf8"));
  const rng = createRng(options.seed);
  const party = buildParty(rng);
  const worldIndex = buildWorldIndex(world);

  const start = chooseStartSettlement(rng, worldIndex, options.start);
  if (!start) {
    throw new Error("Could not choose a starting settlement from the current world context.");
  }

  let objective = chooseObjective(rng, start, worldIndex);
  if (!objective) {
    throw new Error("Could not choose an objective from the current world context.");
  }

  printHeader(options, world, party, start, objective);

  let current = start;
  const visited = new Set([start.i]);
  let previousLocationId = null;
  const pathHistory = [start.name];

  for (let eventNumber = 1; eventNumber <= options.events; eventNumber += 1) {
    if (eventNumber === 1) {
      console.log(`[Event ${eventNumber}] Inciting job in ${current.name}`);
      logEventPlayout(party, pathHistory, "Current route");
      console.log(` - The party assembles in ${describeSettlement(current)}.`);
      console.log(` - They are asked to ${objective.summary}.`);
      console.log(` - Local context used: ${localFlavor(rng, current)}.`);
      if (current.nearbySettlements?.length) {
        const nearby = current.nearbySettlements.slice(0, 3).map((settlement) => `${settlement.name} (${settlement.dist} mi)`).join(", ");
        console.log(` - Nearby settlements shaping the choice: ${nearby}.`);
      }
      console.log("");
      continue;
    }

    if (current.i === objective.target.i) {
      if (eventNumber === options.events) {
        printResolution(eventNumber, current, objective, rng);
        continue;
      }

      console.log(`[Event ${eventNumber}] New lead in ${current.name}`);
      logEventPlayout(party, pathHistory, "Current route");
      console.log(` - The party has already reached ${current.name}, but the job widens.`);
      const nextObjective = chooseFollowUpObjective(rng, current, objective, worldIndex);
      if (!nextObjective) {
        console.log(" - No good follow-up target was found, so the group spends the day consolidating allies and keeping their heads down.");
        console.log("");
        continue;
      }
      objective = nextObjective;
      console.log(` - New objective: ${objective.summary}.`);
      console.log(` - Why: ${objective.motive}`);
      console.log("");
      continue;
    }

    const travelOptions = buildTravelOptions(
      rng,
      current,
      objective.target,
      visited,
      worldIndex,
      previousLocationId,
      options.events - eventNumber + 1
    );
    if (travelOptions.length === 0) {
      console.log(`[Event ${eventNumber}] Stalled at ${current.name}`);
      console.log(" - No route-linked destination was available, so the party turns the day into planning, rumor gathering, and repairs.");
      console.log("");
      continue;
    }

    const directTarget = travelOptions.find((option) => option.next.i === objective.target.i);
    let candidatePool = travelOptions;

    if (options.events - eventNumber <= 1 && directTarget) {
      candidatePool = [directTarget];
    } else {
      const unvisited = travelOptions.filter((option) => !visited.has(option.next.i));
      if (unvisited.length > 0) {
        candidatePool = unvisited;
      }

      const improving = candidatePool.filter((option) => option.reasons.some((reason) => reason.startsWith("closer to ")));
      if (improving.length > 0) {
        candidatePool = improving;
      }
    }

    const shortlist = candidatePool.slice(0, Math.min(8, candidatePool.length));
    const choice = weightedPick(rng, shortlist.map((option) => ({ value: option, weight: option.weight })));
    const selected = choice?.value || shortlist[0];
    const eventPath = [...pathHistory, selected.next.name];
    const moveChain = findDetailedTravelChain(worldIndex, current.i, selected.next.i, selected.edge);

    console.log(`[Event ${eventNumber}] Travel from ${current.name}`);
    logEventPlayout(party, eventPath, "Travel chain");
    if ((selected.edge.hops || 0) > 2) {
      console.log(` - Move detail: ${formatPathLine(moveChain)}${moveChain.length <= 2 ? ` (compressed ${selected.edge.hops}-hop route)` : ""}`);
    }
    logChoicePreview(travelOptions);
    console.log(` - Chosen destination: ${selected.next.name}.`);
    console.log(` - Route details: ${selected.edge.hops} hops, ${selected.edge.distance} ${world.travelGraph.distanceUnit}, via ${(selected.edge.modes || []).join("/") || "roads"}.`);
    console.log(` - Selection logic: ${selected.reasons.join(", ")}.`);

    if (selected.edge.crossesBorder) {
      console.log(
        ` - Political context: crossing from ${current.stateName} to ${selected.next.stateName} (${selected.relation.status}; bordering=${selected.relation.bordering ? "yes" : "no"}).`
      );
    } else {
      console.log(` - Political context: movement stays within ${current.stateName}.`);
    }

    const arrivalNotes = [
      `The road deposits them in ${describeSettlement(selected.next)}, where ${localFlavor(rng, selected.next)} sets the mood.`,
      `By arrival, ${selected.next.name} already feels distinct: ${localFlavor(rng, selected.next)} defines the next decision.`,
      `The party reaches ${selected.next.name} and immediately reads the local pressure in its ${localFlavor(rng, selected.next)}.`,
    ];
    console.log(` - Story beat: ${pick(rng, arrivalNotes)}`);
    console.log("");

    previousLocationId = current.i;
    current = selected.next;
    pathHistory.push(current.name);
    visited.add(current.i);
  }
}

main();
