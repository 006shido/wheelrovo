import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Flame, Trophy, CheckCircle, Star, Lock } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import {
  loadDriverState,
  loadCompletedTasks,
  loadTrips,
  DriverState,
} from '../utils/storage';
import { DEFAULT_TASKS, MILESTONES, Task } from '../utils/mockData';
import { computeAchievementProgress, AchievementProgress } from '../utils/achievements';

interface DashboardScreenProps {
  refreshTrigger?: number;
}

export default function DashboardScreen({ refreshTrigger }: DashboardScreenProps) {
  const [driverState, setDriverState] = useState<DriverState>({
    xp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: null,
  });
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    const state = await loadDriverState();
    const completedTaskIds = await loadCompletedTasks();

    const todayStr = new Date().toDateString();
    const checkedInToday = state.lastLoginDate === todayStr;

    const updatedTasks = DEFAULT_TASKS.map((task) => {
      let isCompleted = completedTaskIds.includes(task.id);
      if (task.type === 'login' && checkedInToday) {
        isCompleted = true;
      }
      return { ...task, completed: isCompleted };
    });

    const trips = await loadTrips();
    setAchievements(computeAchievementProgress(trips));

    setDriverState(state);
    setTasks(updatedTasks);
    setLoading(false);
  };

  // Note: Daily check-in is now handled automatically when the driver completes a drive.

  const currentMilestone = MILESTONES.find((m) => m.level === driverState.level) || MILESTONES[0];
  const nextMilestone = MILESTONES.find((m) => m.level === driverState.level + 1) || null;

  const xpProgress = nextMilestone
    ? (driverState.xp - currentMilestone.xpRequired) /
      (nextMilestone.xpRequired - currentMilestone.xpRequired)
    : 1;

  const currentLevelXp = driverState.xp - currentMilestone.xpRequired;
  const nextLevelXpRequired = nextMilestone
    ? nextMilestone.xpRequired - currentMilestone.xpRequired
    : 0;

  const isCheckedInToday = driverState.lastLoginDate === new Date().toDateString();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Level Progress */}
        <View style={styles.levelCard}>
          <View style={styles.levelContainer}>
            <View style={styles.levelRow}>
              <View style={styles.levelBadgeContainer}>
                <Trophy color="#000" size={12} fill="#000" />
                <Text style={styles.levelNumberText}>Lvl {driverState.level}</Text>
              </View>
              <Text style={styles.milestoneTitle}>{currentMilestone.title.toUpperCase()}</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${xpProgress * 100}%` }]} />
            </View>

            <View style={styles.xpTextRow}>
              <Text style={styles.xpText}>
                {driverState.xp} TOTAL XP
              </Text>
              {nextMilestone ? (
                <Text style={styles.xpNeededText}>
                  {nextLevelXpRequired - currentLevelXp} XP TO LEVEL {driverState.level + 1}
                </Text>
              ) : (
                <Text style={styles.xpNeededText}>MAX LEVEL</Text>
              )}
            </View>
          </View>
        </View>

        {/* Daily Streak Card (Automated via driving) */}
        <View
          style={[
            styles.streakCard,
            isCheckedInToday && styles.streakCardActive,
          ]}
        >
          <View style={styles.streakLeft}>
            <View style={[styles.fireBg, isCheckedInToday && styles.fireBgActive]}>
              <Flame
                color={isCheckedInToday ? '#000000' : Theme.colors.primary}
                size={22}
                fill={isCheckedInToday ? '#000000' : 'none'}
              />
            </View>
            <View style={styles.streakTextContainer}>
              <Text style={styles.streakTitle}>{driverState.streak} DAY STREAK</Text>
              <Text style={styles.streakSubtitle}>
                {isCheckedInToday
                  ? 'CHECK-IN SECURED FOR TODAY'
                  : 'DRIVE 1 TIME TODAY TO SECURE STREAK'}
              </Text>
            </View>
          </View>
          <View style={styles.streakAction}>
            {isCheckedInToday ? (
              <View style={styles.securedBadge}>
                <Text style={styles.securedBadgeText}>SECURED</Text>
              </View>
            ) : (
              <View style={[styles.securedBadge, { borderColor: Theme.colors.border }]}>
                <Text style={[styles.securedBadgeText, { color: Theme.colors.textMuted }]}>INCOMPLETE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionHeader}>DAILY DRIVER TASKS</Text>

          {tasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                    {task.title.toUpperCase()}
                  </Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                </View>
                {task.completed ? (
                  <View style={styles.checkedBox}>
                    <CheckCircle color={Theme.colors.primary} size={20} fill="#FFF" />
                  </View>
                ) : (
                  <View style={styles.taskUncheck}>
                    <Star color={Theme.colors.textMuted} size={10} />
                  </View>
                )}
              </View>

              <View style={styles.taskFooter}>
                <View style={styles.xpRewardTag}>
                  <Text style={styles.xpRewardText}>+{task.rewardXp} XP</Text>
                </View>
                <Text style={[styles.taskStatusText, task.completed && { color: '#FFF' }]}>
                  {task.completed ? 'COMPLETED' : 'ACTIVE'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Lifetime Achievements */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionHeader}>ACHIEVEMENTS</Text>

          {achievements.map(({ achievement, unlocked, value, target, progress }) => (
            <View
              key={achievement.id}
              style={[styles.achievementCard, unlocked && styles.achievementCardUnlocked]}
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskInfo}>
                  <View style={styles.achievementTitleRow}>
                    <Text style={[styles.taskTitle, !unlocked && styles.achievementTitleLocked]}>
                      {achievement.title.toUpperCase()}
                    </Text>
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierBadgeText}>{achievement.tier.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskDescription}>{achievement.description}</Text>
                </View>
                {unlocked ? (
                  <Trophy color={Theme.colors.primary} size={18} fill={Theme.colors.primary} />
                ) : (
                  <Lock color={Theme.colors.textMuted} size={16} />
                )}
              </View>

              {!unlocked && (
                <View style={styles.achievementProgressRow}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.achievementProgressText}>
                    {Math.min(value, target)}/{target}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    padding: Theme.spacing.md,
  },
  levelCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  levelContainer: {
    marginTop: Theme.spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  levelBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.sm,
    marginRight: Theme.spacing.sm,
  },
  levelNumberText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 10,
  },
  milestoneTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#000000',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    marginBottom: Theme.spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    color: Theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  xpNeededText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  streakCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  streakCardActive: {
    borderColor: Theme.colors.borderActive,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fireBg: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  fireBgActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  streakTextContainer: {
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  streakTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  streakSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    lineHeight: 12,
  },
  streakAction: {
    marginLeft: Theme.spacing.sm,
  },
  securedBadge: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: '#000',
  },
  securedBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  checkInButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  checkInButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 10,
  },
  tasksSection: {
    marginTop: Theme.spacing.xs,
  },
  sectionHeader: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
    letterSpacing: 1,
  },
  taskCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskInfo: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  taskTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Theme.colors.textMuted,
  },
  taskDescription: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  checkedBox: {
    marginTop: 2,
  },
  taskUncheck: {
    width: 20,
    height: 20,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#000',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
  },
  xpRewardTag: {
    backgroundColor: '#000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  xpRewardText: {
    color: Theme.colors.textPrimary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  taskStatusText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  achievementCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    opacity: 0.7,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderColor: Theme.colors.borderActive,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementTitleLocked: {
    color: Theme.colors.textMuted,
  },
  tierBadge: {
    marginLeft: Theme.spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tierBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  achievementProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
  },
  achievementProgressText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: Theme.spacing.sm,
  },
});
