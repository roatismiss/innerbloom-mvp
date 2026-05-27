import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthStore } from '../../store/auth';

type MoodType = 'radiant' | 'good' | 'steady' | 'tired' | 'low';

export default function TodayScreen() {
  const { user } = useAuthStore();
  const [selectedMood, setSelectedMood] = useState<MoodType>('good');

  const moods = [
    { key: 'radiant' as MoodType, icon: 'happy-outline', label: 'Radiant' },
    { key: 'good' as MoodType, icon: 'happy-outline', label: 'Good' },
    { key: 'steady' as MoodType, icon: 'remove-outline', label: 'Steady' },
    { key: 'tired' as MoodType, icon: 'sad-outline', label: 'Tired' },
    { key: 'low' as MoodType, icon: 'sad-outline', label: 'Low' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Good morning, {user?.anonymousAlias || 'Maya'}</Text>
          <Text style={styles.welcomeSubtitle}>Take a deep breath. You're in a safe space.</Text>
        </Animated.View>

        {/* Mood Check-in Card */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.moodCard}>
          <Text style={styles.moodTitle}>How are you blooming today?</Text>
          <View style={styles.moodButtons}>
            {moods.map((mood, index) => (
              <TouchableOpacity
                key={mood.key}
                style={styles.moodButtonContainer}
                onPress={() => setSelectedMood(mood.key)}
              >
                <View
                  style={[
                    styles.moodButton,
                    selectedMood === mood.key && styles.moodButtonActive,
                    index === 1 && styles.moodButtonLarge,
                  ]}
                >
                  <Ionicons
                    name={mood.icon as any}
                    size={index === 1 ? 28 : 24}
                    color={selectedMood === mood.key ? '#641E0E' : '#55433E'}
                  />
                </View>
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === mood.key && styles.moodLabelActive,
                  ]}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Daily Quote Card */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.quoteCard}>
          <View style={styles.quoteBlob} />
          <View style={styles.quoteContent}>
            <Ionicons name="chatbox-ellipses" size={24} color="#994531" style={styles.quoteIcon} />
            <Text style={styles.quoteText}>
              "The flower that blooms in adversity is the rarest and most beautiful of all."
            </Text>
            <Text style={styles.quoteAuthor}>— Ancient Proverb</Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActions}
          >
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonTextPrimary}>Talk to Bloom</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="book" size={20} color="#55433E" />
              <Text style={styles.actionButtonText}>Journal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="leaf" size={20} color="#55433E" />
              <Text style={styles.actionButtonText}>Breathe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="flower" size={20} color="#55433E" />
              <Text style={styles.actionButtonText}>Meditate</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* Your Journey Section */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.journeySection}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          <View style={styles.journeyCards}>
            <View style={styles.journeyCard}>
              <Text style={styles.journeyEmoji}>🌱</Text>
              <Text style={styles.journeyValue}>7 Days</Text>
              <Text style={styles.journeyLabel}>CURRENT STREAK</Text>
            </View>
            <View style={styles.journeyCard}>
              <Ionicons name="checkmark-circle" size={36} color="#A8315C" />
              <Text style={styles.journeyValue}>Quest</Text>
              <Text style={styles.journeyLabel}>MINDFULNESS WEEK</Text>
            </View>
          </View>
        </Animated.View>

        {/* Recommended Section */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.recommendedSection}>
          <View style={styles.recommendedHeader}>
            <Text style={styles.sectionTitle}>Recommended</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedCards}
          >
            <View style={styles.recommendedCard}>
              <View style={styles.recommendedImage}>
                <View style={styles.recommendedImagePlaceholder}>
                  <Ionicons name="flower" size={40} color="#994531" />
                </View>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>10 MIN</Text>
                </View>
              </View>
              <View style={styles.recommendedContent}>
                <Text style={styles.recommendedTitle}>Gentle Morning Release</Text>
                <Text style={styles.recommendedDescription}>Release tension from your sleep.</Text>
              </View>
            </View>

            <View style={styles.recommendedCard}>
              <View style={styles.recommendedImage}>
                <View style={styles.recommendedImagePlaceholder}>
                  <Ionicons name="book" size={40} color="#994531" />
                </View>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>PROMPT</Text>
                </View>
              </View>
              <View style={styles.recommendedContent}>
                <Text style={styles.recommendedTitle}>Gratitude Reflections</Text>
                <Text style={styles.recommendedDescription}>Write down three tiny joys.</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 120,
    gap: 32,
  },

  // Welcome Section
  welcomeSection: {
    gap: 8,
  },
  welcomeTitle: {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: '#281814',
  },
  welcomeSubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 25.6,
    color: '#55433E',
  },

  // Mood Check-in Card
  moodCard: {
    backgroundColor: '#FFF1ED',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#5C4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  moodTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: '#281814',
    marginBottom: 24,
  },
  moodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodButtonContainer: {
    alignItems: 'center',
    gap: 8,
  },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE9E4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  moodButtonActive: {
    backgroundColor: '#E8836B',
    borderColor: 'rgba(232, 131, 107, 0.3)',
    shadowColor: '#E8836B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  moodLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#55433E',
  },
  moodLabelActive: {
    color: '#994531',
    fontFamily: 'NunitoSans_700Bold',
  },

  // Quote Card
  quoteCard: {
    backgroundColor: '#FFE2DB',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#5C4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteBlob: {
    position: 'absolute',
    right: -32,
    top: -32,
    width: 96,
    height: 96,
    backgroundColor: 'rgba(144, 242, 252, 0.2)',
    borderRadius: 48,
  },
  quoteContent: {
    position: 'relative',
    zIndex: 10,
  },
  quoteIcon: {
    marginBottom: 12,
  },
  quoteText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18,
    lineHeight: 28.8,
    fontStyle: 'italic',
    color: '#006F77',
  },
  quoteAuthor: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#55433E',
    marginTop: 16,
    textAlign: 'right',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFE2DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  actionButtonPrimary: {
    backgroundColor: '#994531',
    shadowColor: '#994531',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#55433E',
  },
  actionButtonTextPrimary: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#FFFFFF',
  },

  // Journey Section
  journeySection: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: '#281814',
  },
  journeyCards: {
    flexDirection: 'row',
    gap: 16,
  },
  journeyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE2DB',
    shadowColor: '#5C4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    alignItems: 'center',
  },
  journeyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  journeyValue: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    color: '#994531',
    marginBottom: 4,
  },
  journeyLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#55433E',
    textAlign: 'center',
  },

  // Recommended Section
  recommendedSection: {
    gap: 16,
  },
  recommendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  seeAllButton: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#994531',
  },
  recommendedCards: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 16,
  },
  recommendedCard: {
    width: 256,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#5C4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE2DB',
  },
  recommendedImage: {
    height: 128,
    width: '100%',
    position: 'relative',
  },
  recommendedImagePlaceholder: {
    flex: 1,
    backgroundColor: '#FFE9E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontFamily: 'NunitoSans_700Bold',
    color: '#281814',
  },
  recommendedContent: {
    padding: 16,
  },
  recommendedTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: '#281814',
    marginBottom: 4,
  },
  recommendedDescription: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#55433E',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 112,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#994531',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5C4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
});
