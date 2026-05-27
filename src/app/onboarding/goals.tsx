import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useOnboardingDraft } from '../../store/onboarding-draft';

type GoalType =
  | 'anxiety'
  | 'mindfulness'
  | 'sleep'
  | 'depression'
  | 'self-love'
  | 'stress'
  | 'work-life';

export default function OnboardingGoalsScreen() {
  const draftGoals = useOnboardingDraft((s) => s.goals);
  const setDraftGoals = useOnboardingDraft((s) => s.setGoals);
  const [selectedGoals, setSelectedGoals] = useState<GoalType[]>(
    draftGoals as GoalType[],
  );

  const goals = [
    { key: 'anxiety' as GoalType, label: 'Anxiety Relief' },
    { key: 'mindfulness' as GoalType, label: 'Mindfulness' },
    { key: 'sleep' as GoalType, label: 'Sleep Quality' },
    { key: 'depression' as GoalType, label: 'Depression Support' },
    { key: 'self-love' as GoalType, label: 'Self-Love' },
    { key: 'stress' as GoalType, label: 'Stress Management' },
    { key: 'work-life' as GoalType, label: 'Work-Life Balance' },
  ];

  const toggleGoal = (goal: GoalType) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleNext = () => {
    if (selectedGoals.length > 0) {
      setDraftGoals(selectedGoals);
      router.push('/onboarding/frequency');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#55433E" />
          </TouchableOpacity>
          <Text style={styles.brandName}>InnerBloom</Text>
          <View style={styles.spacer} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
          <Text style={styles.progressText}>Step 2 of 4</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Background Blobs */}
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />

        {/* Content Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.contentHeader}>
          <Text style={styles.title}>What brought you to InnerBloom?</Text>
          <Text style={styles.subtitle}>
            Select all that apply. We'll curate tools just for you.
          </Text>
        </Animated.View>

        {/* Selection Pills */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.pillsContainer}>
          {goals.map((goal, index) => (
            <Animated.View
              key={goal.key}
              entering={FadeInDown.delay(300 + index * 50).springify()}
            >
              <TouchableOpacity
                style={[
                  styles.pill,
                  selectedGoals.includes(goal.key) && styles.pillActive,
                ]}
                onPress={() => toggleGoal(goal.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedGoals.includes(goal.key) && styles.pillTextActive,
                  ]}
                >
                  {goal.label}
                </Text>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="#FFFFFF"
                  style={[
                    styles.checkIcon,
                    !selectedGoals.includes(goal.key) && styles.checkIconHidden,
                  ]}
                />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Visual Anchor */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="flower" size={80} color="#E8836B" style={styles.flowerIcon} />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            selectedGoals.length === 0 && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={selectedGoals.length === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#641E0E" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },

  // Header
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#994531',
    fontWeight: 'bold',
  },
  spacer: {
    width: 40,
  },

  // Progress Bar
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#FADCD5',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E8836B',
  },
  progressText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#88726D',
    textAlign: 'right',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
    position: 'relative',
  },

  // Background Blobs
  blobTop: {
    position: 'absolute',
    top: 80,
    right: -80,
    width: 256,
    height: 256,
    backgroundColor: '#FADCD5',
    borderRadius: 128,
    opacity: 0.3,
  },
  blobBottom: {
    position: 'absolute',
    bottom: 160,
    left: -80,
    width: 320,
    height: 320,
    backgroundColor: '#FFDAD2',
    borderRadius: 160,
    opacity: 0.2,
  },

  // Content Header
  contentHeader: {
    marginBottom: 32,
    position: 'relative',
    zIndex: 10,
  },
  title: {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 32,
    lineHeight: 40,
    color: '#281814',
    marginBottom: 8,
    letterSpacing: -0.32,
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18,
    lineHeight: 28.8,
    color: '#55433E',
  },

  // Pills
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    position: 'relative',
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 9999,
    backgroundColor: '#FFF1ED',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  pillActive: {
    backgroundColor: '#E8836B',
    shadowColor: 'rgba(232, 131, 107, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    transform: [{ scale: 0.95 }],
  },
  pillText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 25.6,
    color: '#55433E',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  checkIcon: {
    opacity: 1,
  },
  checkIconHidden: {
    opacity: 0,
  },

  // Image
  imageContainer: {
    marginTop: 32,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  imagePlaceholder: {
    width: 280,
    height: 280,
    borderRadius: 24,
    backgroundColor: '#FFE9E4',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  flowerIcon: {
    opacity: 0.6,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8836B',
    paddingVertical: 20,
    borderRadius: 9999,
    shadowColor: 'rgba(232, 131, 107, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: '#641E0E',
  },
});
