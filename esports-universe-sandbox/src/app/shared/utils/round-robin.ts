export interface RoundRobinMatch {
  round: number;
  homeId: string;
  awayId: string;
}

export function buildDoubleRoundRobin(teamIds: string[]): RoundRobinMatch[] {
  const firstHalf = buildSingleRoundRobin(teamIds);
  const roundCount = Math.max(...firstHalf.map((match) => match.round), 0);
  const secondHalf = firstHalf.map((match) => ({
    round: match.round + roundCount,
    homeId: match.awayId,
    awayId: match.homeId,
  }));
  return [...firstHalf, ...secondHalf];
}

function buildSingleRoundRobin(teamIds: string[]): RoundRobinMatch[] {
  const rotation = [...teamIds];
  if (rotation.length < 2) {
    return [];
  }
  if (rotation.length % 2 === 1) {
    rotation.push('');
  }
  const count = rotation.length;
  const matches: RoundRobinMatch[] = [];
  for (let round = 0; round < count - 1; round += 1) {
    for (let index = 0; index < count / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[count - 1 - index];
      if (!left || !right) {
        continue;
      }
      const leftIsHome = (round + index) % 2 === 0;
      matches.push({
        round: round + 1,
        homeId: leftIsHome ? left : right,
        awayId: leftIsHome ? right : left,
      });
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    const moved = rest.pop();
    if (moved) {
      rest.unshift(moved);
    }
    rotation.splice(0, rotation.length, fixed, ...rest);
  }
  return matches;
}
