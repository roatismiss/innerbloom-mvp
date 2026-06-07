import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// Privacy Policy + Terms of Service. Top-level (public) route so it is reachable
// from the sign-up consent links BEFORE a user is authenticated.
// ============================================================================
// NOTE: This is a solid, app-specific DRAFT written to match how InnerBloom
// actually handles data. It is NOT a substitute for legal review — have counsel
// familiar with the PH Data Privacy Act of 2012 (RA 10173) and, if you take EU
// users, the GDPR, review and finalise it, and set the real contact email and
// effective date before launch.
// ============================================================================

const C = {
  surface:           '#fff8f6',
  primary:           '#994531',
  onSurface:         '#281814',
  onSurfaceVariant:  '#55433e',
  outline:           '#88726d',
} as const;

const EFFECTIVE = 'Effective date: [set before launch]';
const CONTACT = 'privacy@innerbloom.app'; // TODO: replace with your real DPO/contact address

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isTerms = doc === 'terms';

  return (
    <View style={s.root}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>{isTerms ? 'Terms of Service' : 'Privacy Policy'}</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 48 }} showsVerticalScrollIndicator={false}>
        <Text style={s.meta}>{EFFECTIVE}</Text>
        {isTerms ? <Terms /> : <Privacy />}
      </ScrollView>
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={s.p}>{children}</Text>;
}
function H({ children }: { children: React.ReactNode }) {
  return <Text style={s.h}>{children}</Text>;
}

function Privacy() {
  return (
    <View>
      <P>
        InnerBloom is a mental-wellbeing app. We take the privacy of your
        emotional life seriously. This policy explains what we collect, why, and
        the control you have. It is written to align with the Philippine Data
        Privacy Act of 2012 (RA 10173).
      </P>

      <H>What we collect</H>
      <P>
        • Account data: your email and an anonymous alias. We do not require your
        real name.{'\n'}
        • Wellbeing data you choose to create: mood check-ins, journal entries,
        daily intentions, reflections, and messages you send in circles or
        matches.{'\n'}
        • Optional profile data: a display name, avatar, and city, only if you
        add them.{'\n'}
        • Limited technical data: app version and coarse, anonymous usage events
        (for example, “a journal entry was created”) — never the content you
        wrote.
      </P>

      <H>What we never do</H>
      <P>
        We never sell your data. We never share your journal entries, chat
        messages, or mood notes with advertisers or other users beyond what you
        explicitly post. Our analytics are configured to exclude the content you
        author — we record that an action happened, not what you wrote.
      </P>

      <H>Why we process it</H>
      <P>
        To provide the service you asked for: showing your check-in history,
        powering the AI companion and matching, and keeping your data in sync
        across devices. Because this is health-adjacent data, we rely on your
        consent, which you give when you create an account and can withdraw at
        any time by deleting your account.
      </P>

      <H>Sensitive personal information</H>
      <P>
        Information about your mental and emotional state is sensitive personal
        information under the Data Privacy Act. We apply additional care: access
        is restricted to you, protected by row-level security so one user can
        never read another’s data, and transmitted over encrypted connections.
      </P>

      <H>The AI companion</H>
      <P>
        Messages you send to the Bloom AI companion are processed by a
        third-party AI provider to generate a response. Do not share information
        you would not want processed by a third party. The AI is not a clinician
        and its responses are not medical advice.
      </P>

      <H>Sharing &amp; processors</H>
      <P>
        We use trusted service providers to run the app — cloud hosting and
        database, an AI provider for the companion, and an analytics provider for
        anonymous usage. They process data only on our instructions. We may
        disclose data if required by law.
      </P>

      <H>Retention</H>
      <P>
        We keep your data while your account is active. When you delete your
        account, your profile and all associated data are erased.
      </P>

      <H>Your rights</H>
      <P>
        Under the Data Privacy Act you have the right to be informed, to access,
        to correct, to object, to erasure, and to data portability, and the right
        to lodge a complaint with the National Privacy Commission. You can
        correct your profile in the app, opt out of analytics in Settings, and
        permanently delete your account and all its data from Settings &gt;
        Delete my account.
      </P>

      <H>Children</H>
      <P>
        InnerBloom is not intended for children under 13 (or the minimum age in
        your jurisdiction). We do not knowingly collect data from them.
      </P>

      <H>Crisis note</H>
      <P>
        InnerBloom is a supportive tool, not an emergency service. If you are in
        crisis, call the NCMH Crisis Hotline at 1553, HOPELINE at 0917-558-4673,
        or 911. We cannot monitor for or respond to emergencies.
      </P>

      <H>Contact</H>
      <P>
        Questions or requests about your data: {CONTACT}.
      </P>
    </View>
  );
}

function Terms() {
  return (
    <View>
      <P>
        Welcome to InnerBloom. By creating an account or using the app, you agree
        to these Terms. Please read them together with our Privacy Policy.
      </P>

      <H>Who can use InnerBloom</H>
      <P>
        You must be at least 13 years old (or the minimum age in your
        jurisdiction) to use InnerBloom, and you agree to provide accurate
        information.
      </P>

      <H>Not medical advice</H>
      <P>
        InnerBloom — including the Bloom AI companion, articles, reflections, and
        community content — is for general wellbeing and self-reflection. It is
        NOT a medical device, NOT therapy, and NOT a substitute for professional
        diagnosis or treatment. Always seek the advice of a qualified health
        provider for any mental-health condition.
      </P>

      <H>In a crisis</H>
      <P>
        InnerBloom is not an emergency service and cannot respond to
        emergencies. If you or someone else may be in danger, contact the NCMH
        Crisis Hotline at 1553, HOPELINE at 0917-558-4673, or emergency services
        at 911 immediately.
      </P>

      <H>Your content &amp; conduct</H>
      <P>
        You own what you write. By posting in shared spaces (circles, matches)
        you grant us a limited licence to display it to the people you share it
        with. You agree not to harass, threaten, or harm others, not to share
        others’ private information, and not to misuse the community. We may
        remove content or suspend accounts that break these rules or the law.
      </P>

      <H>Privacy</H>
      <P>
        Your use of InnerBloom is also governed by our Privacy Policy, which
        explains how we handle your data.
      </P>

      <H>Availability &amp; changes</H>
      <P>
        We may update, suspend, or change features of the app. We may update
        these Terms; if we make material changes we will notify you in the app.
      </P>

      <H>Limitation of liability</H>
      <P>
        To the maximum extent permitted by law, InnerBloom is provided “as is”
        without warranties, and we are not liable for indirect or consequential
        damages arising from your use of the app.
      </P>

      <H>Ending your use</H>
      <P>
        You can stop using InnerBloom at any time and delete your account and all
        its data from Settings &gt; Delete my account.
      </P>

      <H>Governing law</H>
      <P>
        These Terms are governed by the laws of the Republic of the Philippines.
      </P>

      <H>Contact</H>
      <P>{CONTACT}</P>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: 'NunitoSans_600SemiBold', fontSize: 18, color: C.onSurface },
  meta: { fontFamily: 'NunitoSans_400Regular', fontSize: 12, color: C.outline, marginBottom: 16 },
  h: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 16, color: C.primary, marginTop: 22, marginBottom: 6 },
  p: { fontFamily: 'NunitoSans_400Regular', fontSize: 14.5, lineHeight: 23, color: C.onSurfaceVariant },
});
