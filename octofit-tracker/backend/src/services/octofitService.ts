import { isValidObjectId } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    const error = new Error('Activity payload is required');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const { userId, teamId, type, minutes } = input as {
    userId?: unknown;
    teamId?: unknown;
    type?: unknown;
    minutes?: unknown;
  };

  if (typeof userId !== 'string' || !isValidObjectId(userId)) {
    const error = new Error('userId must be a valid user id');
    Object.assign(error, { status: 400 });
    throw error;
  }

  if (typeof teamId !== 'string' || !isValidObjectId(teamId)) {
    const error = new Error('teamId must be a valid team id');
    Object.assign(error, { status: 400 });
    throw error;
  }

  if (typeof type !== 'string' || !type.trim()) {
    const error = new Error('type is required');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const numericMinutes = Number(minutes);
  if (!Number.isFinite(numericMinutes) || numericMinutes <= 0) {
    const error = new Error('minutes must be a positive number');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const error = new Error('Team not found');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const normalizedType = type.trim();
  const pointsByType: Record<string, number> = {
    walk: 1,
    run: 2,
    cycle: 2,
    strength: 3,
    swim: 2,
    hike: 2,
  };
  const points = Math.max(1, Math.round(numericMinutes * (pointsByType[normalizedType] ?? 1)));

  const created = await Activity.create({
    user: user._id,
    team: team._id,
    type: normalizedType,
    minutes: numericMinutes,
    points,
    occurredAt: new Date(),
  });

  return created.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    const error = new Error('Team payload is required');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const { name, mascot, members } = input as {
    name?: unknown;
    mascot?: unknown;
    members?: unknown;
  };

  if (typeof name !== 'string' || !name.trim()) {
    const error = new Error('name is required');
    Object.assign(error, { status: 400 });
    throw error;
  }

  if (typeof mascot !== 'string' || !mascot.trim()) {
    const error = new Error('mascot is required');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const normalizedMembers = Array.isArray(members) ? members : [];
  const memberIds: string[] = [];
  for (const member of normalizedMembers) {
    if (typeof member !== 'string' || !isValidObjectId(member)) {
      const error = new Error('members must contain valid user ids');
      Object.assign(error, { status: 400 });
      throw error;
    }
    if (!(await User.exists({ _id: member }))) {
      const error = new Error('Member user not found');
      Object.assign(error, { status: 404 });
      throw error;
    }
    memberIds.push(member);
  }

  const created = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });

  return created.toObject();
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate<{ _id: string; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(pointTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  const leaderboard = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: totalsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints);

  return leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) {
    const error = new Error('User not found');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const [workouts, recentActivity] = await Promise.all([
    Workout.find().lean(),
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
  ]);
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const activityFocus = recentActivity
    ? ({ run: 'endurance', cycle: 'endurance', swim: 'endurance', strength: 'strength', walk: 'mobility', hike: 'mobility' }[
        recentActivity.type.toLowerCase()
      ] ?? recentActivity.type.toLowerCase())
    : undefined;
  const goalHasWorkout = workouts.some((workout) => workout.focus.toLowerCase() === goalFocus);
  const recommendedFocus = goalHasWorkout ? goalFocus : activityFocus ?? goalFocus;
  const recommendationReason = goalHasWorkout
    ? `Recommended for your ${user.fitnessGoal} goal${recentActivity ? ` and recent ${recentActivity.type} activity` : ''}.`
    : recentActivity
      ? `Recommended based on your recent ${recentActivity.type} activity.`
      : `Recommended for your ${user.fitnessGoal} goal.`;

  return workouts
    .map((workout) => ({
      ...workout,
      reason: recommendationReason,
      matchesFocus: workout.focus.toLowerCase() === recommendedFocus,
    }))
    .sort((left, right) => Number(right.matchesFocus) - Number(left.matchesFocus))
    .map(({ matchesFocus: _matchesFocus, ...workout }) => workout);
}

export { User };
