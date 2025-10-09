import { useFonts } from "@expo-google-fonts/cairo";
import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Link } from "expo-router";
import React from "react";
import { Animated, Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width, height } = Dimensions.get("window");

// ============================================================================
// LANDING PAGE COMPONENT
// ============================================================================
/**
 * Landing Page - Main entry point of the app
 * Features a notebook-style design with:
 * - Grid paper centerpiece with app title
 * - Two sticky notes for game mode selection (Casual & Chaos)
 * - Version and Settings sticky notes in corners
 */
export default function LandingPage() {
  // ===== FONTS =====
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  // ===== HIDE NAVIGATION BAR ON MOUNT =====
  React.useEffect(() => {
    const hideNavBar = async () => {
      await NavigationBar.setVisibilityAsync("hidden");
      await NavigationBar.setBehaviorAsync("inset-swipe");
    };
    hideNavBar();
  }, []);

  // ===== ANIMATIONS =====
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const stickyLeftAnim = React.useRef(new Animated.Value(0)).current;
  const stickyRightAnim = React.useRef(new Animated.Value(0)).current;
  const stickyRightScale = React.useRef(new Animated.Value(1)).current; // ADD THIS LINE

  React.useEffect(() => {
    if (fontsLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered sticky note animations
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.spring(stickyLeftAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(stickyRightAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [fontsLoaded]);

  const handlePressIn = () => {
    Animated.spring(stickyRightScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(stickyRightScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // ===== WAIT FOR FONTS TO LOAD =====
  if (!fontsLoaded) {
    return null;
  }

  // ===== GENERATE NOTEBOOK BACKGROUND LINES =====
  const lines = [];
  const lineSpacing = 24;
  const numberOfLines = Math.floor(height / lineSpacing);

  for (let i = 0; i < numberOfLines; i++) {
    lines.push(<View key={`line-${i}`} style={[styles.horizontalLine, { top: i * lineSpacing }]} />);
  }

  // ===== GENERATE GRID PAPER HORIZONTAL LINES =====
  const gridHorizontalLines = [];
  const gridLineSpacing = 15;
  const gridHeight = 220;
  const gridNumberOfHLines = Math.floor(gridHeight / gridLineSpacing);

  for (let i = 0; i < gridNumberOfHLines; i++) {
    gridHorizontalLines.push(<View key={`grid-h-${i}`} style={[styles.gridHorizontalLine, { top: i * gridLineSpacing }]} />);
  }

  // ===== GENERATE GRID PAPER VERTICAL LINES =====
  const gridVerticalLines = [];
  const gridWidth = Math.min(width * 0.85, 450);
  const gridNumberOfVLines = Math.floor(gridWidth / gridLineSpacing);

  for (let i = 0; i < gridNumberOfVLines; i++) {
    gridVerticalLines.push(<View key={`grid-v-${i}`} style={[styles.gridVerticalLine, { left: i * gridLineSpacing }]} />);
  }

  // ===== RENDER =====
  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Subtle gradient overlay */}
      <View style={styles.gradientOverlay} />

      {/* Black edges on left and right */}

      {/* Notebook background lines */}
      {lines}

      {/* Red margin line */}

      {/* Version sticky note - Top Left */}
      <View style={styles.versionNote}>
        <Text style={styles.versionText}>v1.0</Text>
        <View style={styles.versionDot} />
      </View>

      {/* Settings sticky note - Top Right */}
      <TouchableOpacity style={styles.settingsNote} onPress={() => {}} activeOpacity={0.7}>
        <Ionicons name="settings-outline" size={22} color="#5a5a5a" />
      </TouchableOpacity>

      {/* Animated content wrapper */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Grid paper centerpiece with title */}
        <View style={[styles.gridPaper, { width: gridWidth, height: gridHeight }]}>
          {gridHorizontalLines}
          {gridVerticalLines}

          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Estimation Calculator</Text>
            <Text style={styles.subtitleText}>Evolved</Text>
            <View style={styles.titleUnderline} />
          </View>
        </View>

        {/* Chaos mode sticky note - Left (Coming Soon) */}
        <Animated.View
          style={[
            styles.stickyNoteLeft,
            {
              zIndex: 999,
              opacity: stickyLeftAnim,
              transform: [
                {
                  translateY: stickyLeftAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                {
                  scale: stickyLeftAnim,
                },
                { rotate: "-2.5deg" }, // Move rotation here
              ],
            },
          ]}
        >
          <View style={styles.chaosHeaderContainer}>
            <Text style={styles.stickyHeader}>Chaos</Text>
            <View style={styles.lockIconWrapper}>
              <Ionicons name="lock-closed" size={18} color="#8a8a8a" />
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.stickyBullet}>• Random Bonuses</Text>
          <Text style={styles.stickyBullet}>• Fun Challenges</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.stickySubtext}>Coming Soon</Text>
          </View>
        </Animated.View>

        {/* Casual mode sticky note - Right (Active link) */}
        <Animated.View
          style={[
            styles.stickyNoteRight,
            {
              opacity: stickyRightAnim,
              transform: [
                {
                  translateY: stickyRightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                {
                  scale: Animated.multiply(stickyRightAnim, stickyRightScale), // COMBINE both scales
                },
                { rotate: "2deg" },
              ],
            },
          ]}
        >
          <Link href="/setup-normal" asChild>
            <TouchableOpacity activeOpacity={0.9} style={{ width: "100%", height: "100%" }} onPressIn={handlePressIn} onPressOut={handlePressOut}>
              <Text style={styles.stickyHeader}>Casual</Text>
              <View style={styles.divider} />
              <Text style={styles.stickyBullet}>• Classic</Text>
              <Text style={styles.stickyBullet}>• Mini</Text>
              <Text style={styles.stickyBullet}>• Micro</Text>
            </TouchableOpacity>
          </Link>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Main container - notebook background
  container: {
    flex: 1,
    backgroundColor: "#fdfcf5",
  },

  // Subtle gradient overlay
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(252, 248, 227, 0.3)",
  },

  // Notebook horizontal lines
  horizontalLine: {
    position: "absolute",
    left: 50,
    right: 50,
    height: 1,
    backgroundColor: "rgba(180, 200, 220, 0.15)",
  },

  // Red margin line (classic notebook detail)

  // Grid paper piece
  gridPaper: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    zIndex: 10,
  },
  gridHorizontalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(100, 150, 200, 0.08)",
  },
  gridVerticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(100, 150, 200, 0.08)",
  },

  // Title section
  titleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 32,
    paddingBottom: 20,
    alignItems: "center",
    zIndex: 10,
  },
  titleText: {
    fontSize: 36,
    color: "#2c2c2c",
    textAlign: "center",
    fontFamily: "Handlee_400Regular",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.08)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleText: {
    fontSize: 26,
    color: "#5a5a5a",
    textAlign: "center",
    fontFamily: "Handlee_400Regular",
    marginTop: 4,
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.05)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleUnderline: {
    width: 100,
    height: 2,
    backgroundColor: "#f4c542",
    marginTop: 12,
    borderRadius: 1,
  },

  // Left sticky note - Chaos mode
  stickyNoteLeft: {
    position: "absolute",
    bottom: 100,
    left: 50,
    width: Math.min(width * 0.38, 170),
    minHeight: 160,
    backgroundColor: "rgb(220, 220, 200)", // CHANGE THIS - force RGB to be fully opaque
    // OR use: backgroundColor: "#dcdcc8ff",  // Add 'ff' at the end for full opacity
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 50, // INCREASE THIS to be higher than marginLine
    padding: 16,
    paddingTop: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    zIndex: 999,
  },

  stickyNoteRight: {
    position: "absolute", // ADD THIS BACK
    bottom: 100,
    right: 50,
    width: Math.min(width * 0.38, 170),
    minHeight: 160,
    backgroundColor: "#fff8dc",
    borderRadius: 3,
    shadowColor: "#f4c542",
    shadowOffset: { width: -3, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    padding: 16,
    paddingTop: 24,
    // REMOVE transform from here - it's in the Animated.View now
    borderWidth: 1,
    borderColor: "rgba(244, 197, 66, 0.15)",
    zIndex: 999,
  },

  // Sticky tape effect
  stickyTapeLeft: {
    position: "absolute",
    top: 0,
    left: "30%",
    width: 45,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  stickyTapeRight: {
    position: "absolute",
    top: 0,
    right: "30%",
    width: 45,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "rgba(244, 197, 66, 0.1)",
  },

  // Sticky note text styles
  stickyHeader: {
    fontFamily: "Handlee_400Regular",
    fontSize: 22,
    color: "#2c2c2c",
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  stickyBullet: {
    fontFamily: "Handlee_400Regular",
    fontSize: 15,
    color: "#3c3c3c",
    marginBottom: 6,
    lineHeight: 22,
  },
  stickySubtext: {
    fontFamily: "Handlee_400Regular",
    fontSize: 11,
    color: "#7a7a7a",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },

  // Divider line in sticky notes
  divider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    marginBottom: 10,
    marginTop: 2,
  },

  // Coming soon badge
  comingSoonBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 4,
    alignSelf: "center",
  },

  // Version sticky note - Top Left
  versionNote: {
    position: "absolute",

    top: 30,
    left: 50,
    width: 60,
    height: 42,
    backgroundColor: "#ffd9a3",
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-4deg" }],
    zIndex: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  versionText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 13,
    color: "#6a6a6a",
    fontWeight: "500",
  },
  versionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#52c41a",
    marginTop: 2,
  },

  // Settings sticky note - Top Right
  settingsNote: {
    position: "absolute",
    top: 30,
    right: 50,
    width: 60,
    height: 42,
    backgroundColor: "#ffd9a3",
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "4deg" }],
    zIndex: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },

  // Black edges on sides
  leftEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
    backgroundColor: "#1a1a1a",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  rightEdge: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    backgroundColor: "#1a1a1a",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  chaosHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  lockIconWrapper: {
    marginTop: -10,
  },
  playIconWrapper: {
    position: "absolute",
    bottom: 12,
    right: 12,
    shadowColor: "#f4c542",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});
