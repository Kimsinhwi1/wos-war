import type { AllianceMember, AssignedMember, Squad, RallyLeaderAssignment } from './types';
import { DEFENSE_JOINER_ROTATION } from './constants';
import { generateId } from './utils';

const TARGET_RALLY_SIZE = 12;
const MIN_RALLY_SIZE = 9;
const SUBS_PER_RALLY = 2;

/**
 * Auto-assign FC5 members into rally groups (9~12 members each)
 * + 2 substitutes per rally group
 * + turret rallies (user-configured count)
 *
 * Flow:
 * 1. FC5 members sorted by Deep Dive Rank
 * 2. Top 2 → Rally Leaders (main + sub)
 * 3. Remaining FC5 → divided into rally groups of 9~12
 *    - First half = defense rallies (Patrick rotation)
 *    - Second half = counter rallies (Jessie)
 * 4. Next members after rally groups → 2 substitutes per rally
 * 5. Remaining FC5 + all non-FC5 → turret pool
 * 6. Turret pool → divided into turretRallyCount turret rally groups
 * 7. Rest → pure turret/standby
 */
export function autoAssignMembers(
  members: AllianceMember[],
  allianceName: string = 'HAN',
  turretRallyCount: number = 0,
): {
  rallyLeaders: RallyLeaderAssignment;
  squads: Squad[];
  assignedMembers: AssignedMember[];
} {
  // Filter FC5 members and sort by deepDiveRank (ascending = best first)
  const fc5Members = members
    .filter((m) => m.isFC5)
    .sort((a, b) => {
      if (a.deepDiveRank === null && b.deepDiveRank === null)
        return b.combatPowerNumeric - a.combatPowerNumeric;
      if (a.deepDiveRank === null) return 1;
      if (b.deepDiveRank === null) return -1;
      return a.deepDiveRank - b.deepDiveRank;
    });

  // Top 2 → Rally Leaders
  const [mainLeader, subLeader, ...remaining] = fc5Members;

  const rallyLeaders: RallyLeaderAssignment = {
    main: {
      memberId: mainLeader?.id ?? '',
      nickname: mainLeader?.nickname ?? '',
      combatPower: mainLeader?.combatPower ?? '',
    },
    sub: {
      memberId: subLeader?.id ?? '',
      nickname: subLeader?.nickname ?? '',
      combatPower: subLeader?.combatPower ?? '',
    },
    substitutes: [],
  };

  // Calculate optimal number of rally groups
  const numRallyGroups = calcRallyGroupCount(remaining.length);

  // Allocate members: rally members first, then subs, then turret
  const totalRallySlots = numRallyGroups * TARGET_RALLY_SIZE;
  const totalSubSlots = numRallyGroups * SUBS_PER_RALLY;

  // Take members for rally groups (cap at available)
  const rallyPool = remaining.slice(0, Math.min(totalRallySlots, remaining.length));
  const afterRally = remaining.slice(rallyPool.length);

  // Take substitutes from remaining
  const subPool = afterRally.slice(0, Math.min(totalSubSlots, afterRally.length));
  const turretPoolFC5 = afterRally.slice(subPool.length);

  // Distribute rally pool into groups using round-robin for balanced power
  const groupBuckets: AllianceMember[][] = Array.from({ length: numRallyGroups }, () => []);
  rallyPool.forEach((member, index) => {
    groupBuckets[index % numRallyGroups].push(member);
  });

  // Split groups into defense and counter
  const defenseCount = Math.ceil(numRallyGroups / 2);

  const squads: Squad[] = [];
  const assignedMembers: AssignedMember[] = [];

  // Mark rally leaders
  if (mainLeader) {
    assignedMembers.push({ ...mainLeader, group: 'castle' });
  }
  if (subLeader) {
    assignedMembers.push({ ...subLeader, group: 'castle' });
  }

  // Create rally groups
  for (let i = 0; i < numRallyGroups; i++) {
    const isDefense = i < defenseCount;
    const groupNum = isDefense ? i + 1 : i - defenseCount + 1;
    const defenseHeroId = isDefense
      ? DEFENSE_JOINER_ROTATION[i % DEFENSE_JOINER_ROTATION.length]
      : undefined;

    const squadId = generateId();
    const squadMembers: AssignedMember[] = groupBuckets[i].map((m) => ({
      ...m,
      group: 'castle' as const,
      squadId,
      offenseHero: 'jessie',
      defenseHero: isDefense ? defenseHeroId : undefined,
    }));

    assignedMembers.push(...squadMembers);

    // Assign substitutes for this group (2 per group)
    const groupSubs: AssignedMember[] = [];
    for (let s = 0; s < SUBS_PER_RALLY; s++) {
      const subIndex = i * SUBS_PER_RALLY + s;
      if (subIndex < subPool.length) {
        const sub: AssignedMember = {
          ...subPool[subIndex],
          group: 'substitute',
          squadId,
          offenseHero: 'jessie',
          defenseHero: isDefense ? defenseHeroId : undefined,
        };
        groupSubs.push(sub);
        assignedMembers.push(sub);
      }
    }

    squads.push({
      id: squadId,
      name: isDefense ? `수성 ${groupNum}랠리` : `카운터 ${groupNum}랠리`,
      alliance: allianceName,
      role: isDefense ? 'defense' : 'counter',
      members: squadMembers,
      substitutes: groupSubs,
      joinerHero: isDefense ? defenseHeroId! : 'jessie',
    });
  }

  // Combine turret pool: remaining FC5 + non-FC5 (sorted by combat power)
  const nonFC5 = members.filter((m) => !m.isFC5);
  const allTurretPool = [...turretPoolFC5, ...nonFC5].sort(
    (a, b) => b.combatPowerNumeric - a.combatPowerNumeric,
  );

  // Create turret rally groups if turretRallyCount > 0
  if (turretRallyCount > 0 && allTurretPool.length > 0) {
    const turretBuckets: AllianceMember[][] = Array.from(
      { length: turretRallyCount },
      () => [],
    );
    allTurretPool.forEach((member, index) => {
      turretBuckets[index % turretRallyCount].push(member);
    });

    for (let i = 0; i < turretRallyCount; i++) {
      const squadId = generateId();
      const turretMembers: AssignedMember[] = turretBuckets[i].map((m) => ({
        ...m,
        group: 'turret' as const,
        squadId,
      }));

      assignedMembers.push(...turretMembers);

      squads.push({
        id: squadId,
        name: `포탑 ${i + 1}집결`,
        alliance: allianceName,
        role: 'turret',
        members: turretMembers,
        substitutes: [],
        joinerHero: 'patrick',
      });
    }
  } else {
    // No turret rallies: all go to turret/standby
    allTurretPool.forEach((member) => {
      assignedMembers.push({ ...member, group: 'turret' });
    });
  }

  return { rallyLeaders, squads, assignedMembers };
}

/**
 * Calculate optimal number of rally groups
 * Target: 9~12 members per group
 */
function calcRallyGroupCount(availableMembers: number): number {
  if (availableMembers <= 0) return 0;
  if (availableMembers <= TARGET_RALLY_SIZE + SUBS_PER_RALLY) return 1;

  // Try from more groups to fewer, pick the first where group size is 9~12
  for (let groups = Math.ceil(availableMembers / MIN_RALLY_SIZE); groups >= 1; groups--) {
    const subsNeeded = groups * SUBS_PER_RALLY;
    const forRally = availableMembers - subsNeeded;
    if (forRally <= 0) continue;
    const perGroup = Math.floor(forRally / groups);
    if (perGroup >= MIN_RALLY_SIZE && perGroup <= TARGET_RALLY_SIZE) {
      return groups;
    }
  }

  // Fallback: just divide by target size
  const groups = Math.max(1, Math.round(availableMembers / (TARGET_RALLY_SIZE + SUBS_PER_RALLY)));
  return groups;
}
