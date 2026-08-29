import React from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SettingsProvider } from './src/lib/settings';
import PortfolioScreen from './src/screens/PortfolioScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import BroadcastScreen from './src/screens/BroadcastScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    border: colors.border,
    text: colors.text,
    primary: colors.accent,
  },
};

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { color: colors.text },
            tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textDim,
          }}
        >
          <Tab.Screen
            name="Portfolio"
            component={PortfolioScreen}
            options={{ title: '❄️ Coldstar', tabBarLabel: 'Portfolio', tabBarIcon: tabIcon('👛') }}
          />
          <Tab.Screen
            name="Compose"
            component={ComposeScreen}
            options={{ tabBarIcon: tabIcon('✍️') }}
          />
          <Tab.Screen
            name="Broadcast"
            component={BroadcastScreen}
            options={{ tabBarIcon: tabIcon('📡') }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ tabBarIcon: tabIcon('⚙️') }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}
